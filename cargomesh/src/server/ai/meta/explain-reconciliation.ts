import 'server-only';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import type { ResponseFormatJSONSchema } from 'openai/resources/shared';
import type { AuthenticatedMemberContext } from '@/server/auth/member';
import type { ProposalErrorCode } from '@/shared/schemas/meta/model-proposal';
import {
  ExplanationInputSchema, type ExplanationInput, type ReconciliationExplanation,
} from '@/shared/schemas/meta/reconciliation-explanation';
import {
  ExplanationPlanShapeSchema, ExplanationRequestSchema, explanationGuidance, renderGroundedExplanation,
} from '@/shared/schemas/meta/explanation-plan';
import { InvalidMetaOutput, requestMetaJson, type MetaFetch } from './client';
import { readMetaProposalConfig, type MetaEnvironment } from './config';

// Consumer subset of Axel's existing error codes, not a new provider error catalog.
type FailureCode = Extract<ProposalErrorCode, 'VALIDATION_ERROR' | 'FORBIDDEN_TENANT' | 'INPUT_REVISION_MISMATCH' |
  'NOT_CONFIGURED' | 'MODEL_OUTPUT_INVALID' | 'PROVIDER_UNAVAILABLE'>;
type Actor = Pick<AuthenticatedMemberContext, 'userId' | 'memberId' | 'organizationId'>;
type Reference = { actor: Actor; reconciliationId: string; reconciliationVersion: number; signal: AbortSignal };
export type AuthorizedReconciliation = {
  organizationId: string; state: 'ACTIVE' | 'REVOKED'; facts: ExplanationInput;
};
/** Juan's authorized read model must bind ALL manifest/observation revisions, events and access. */
export type ReconciliationAccess = {
  readAuthorized: (reference: Reference) => Promise<AuthorizedReconciliation | null>;
  checkCurrent: (reference: Reference & { factsFingerprint: string }) => Promise<'CURRENT' | 'DENIED' | 'STALE'>;
};
/** Composition port for Axel's client. No SDK, HTTP transport or environment reader is duplicated. */
export type ExplanationProvider = {
  transport: 'INJECTED' | 'META_MODEL_API';
  configuration: () => { model: string; timeoutMs: number; maxOutputTokens: number } | null;
  requestJson: (request: {
    instructions: string; payload: ExplanationInput; responseFormat: ResponseFormatJSONSchema;
    reasoningEffort: 'medium'; signal: AbortSignal;
  }) => Promise<unknown>;
};

/** Uses Axel's sole SDK/configuration. An injected HTTP fetch is never labelled as real inference. */
export function metaExplanationProvider(options: { env?: MetaEnvironment; fetch?: MetaFetch } = {}): ExplanationProvider {
  const config = readMetaProposalConfig(options.env);
  return {
    transport: options.fetch ? 'INJECTED' : 'META_MODEL_API',
    configuration: () => config ? { model: config.model, timeoutMs: config.timeoutMs, maxOutputTokens: config.maxOutputTokens } : null,
    requestJson: async request => {
      if (!config) return null;
      try { return await requestMetaJson({ ...request, config, fetch: options.fetch }); }
      catch (error) {
        if (error instanceof InvalidMetaOutput) return null; // Validated below, without private SDK error detail.
        throw error;
      }
    },
  };
}
type Metadata = {
  provider: 'META'; transport: ExplanationProvider['transport']; model: string | null;
  reasoningEffort: 'medium'; attempts: number; latencyMs: number; processingMayHaveOccurred: boolean;
  requestId: string | null; inputTokens: number | null; outputTokens: number | null; estimatedCostUsd: null;
};
export type ExplanationAttempt = {
  ok: true; facts: ExplanationInput; factsFingerprint: string; explanation: ReconciliationExplanation | null;
  guidance: ReturnType<typeof explanationGuidance>; metadata: Metadata;
} | { ok: false; error: { code: FailureCode; retryable: false }; metadata: Metadata };

const responseFormat = zodResponseFormat(ExplanationPlanShapeSchema, 'reconciliation_explanation_plan_v1');
const replySchema = z.object({
  content: z.string().min(1).max(32_768), model: z.string().max(100),
  requestId: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/).nullable(),
  usage: z.object({
    inputTokens: z.number().int().nonnegative().max(1_000_000).nullable(),
    outputTokens: z.number().int().nonnegative().max(1_000_000).nullable(),
  }).strict().nullable(),
}).strict();
const instructions = [
  'Select a grounded explanation plan for the supplied authoritative comparison. Return only the provided JSON Schema.',
  'Use the exact reconciliation identity, revision and comparison status. COMPARATOR_MATCH is only for MATCH.',
  'Use only true reasonFacts. REFERENCED_EVENTS requires at least one exact supplied event reference.',
  'Suggest only CHECK_MANIFEST, REQUEST_HUMAN_REVIEW or REVIEW_EVIDENCE when citing a supplied event.',
  'Never invent a count, difference, cause, loss, responsibility, event, timecode or URL. Never execute an action.',
  'The server renders text and supplied quantities. No free prose, calculations or commercial commands are allowed.',
].join('\n');
const cancelled = () => new DOMException('Explanation cancelled.', 'AbortError');
function bounded<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) { void work.catch(() => {}); return Promise.reject(cancelled()); }
  return new Promise((resolve, reject) => {
    const abort = () => { signal.removeEventListener('abort', abort); reject(cancelled()); };
    signal.addEventListener('abort', abort, { once: true });
    work.then(value => { signal.removeEventListener('abort', abort); resolve(value); },
      () => { signal.removeEventListener('abort', abort); reject(new Error('Explanation dependency failed.')); });
  });
}

/** Canonical projection fingerprint for currency checks; it is not proof of tenant access or physical truth. */
export function explanationFactsFingerprint(input: ExplanationInput) {
  return createHash('sha256').update(JSON.stringify(ExplanationInputSchema.parse(input))).digest('hex');
}

/** Optional read-only enhancement: failure must never replace Juan's comparison in the Passport. */
export async function explainReconciliation(input: unknown, member: AuthenticatedMemberContext,
  dependencies: { reconciliation: ReconciliationAccess; provider?: ExplanationProvider },
  options: { signal?: AbortSignal; deadlineMs?: number } = {}): Promise<ExplanationAttempt> {
  const started = Date.now();
  const provider = dependencies.provider ?? metaExplanationProvider();
  const metadata: Metadata = { provider: 'META', transport: provider.transport, model: null,
    reasoningEffort: 'medium', attempts: 0, latencyMs: 0, processingMayHaveOccurred: false,
    requestId: null, inputTokens: null, outputTokens: null, estimatedCostUsd: null };
  const measured = () => ({ ...metadata, latencyMs: Math.max(0, Date.now() - started) });
  const fail = (code: FailureCode): ExplanationAttempt => ({ ok: false, error: { code, retryable: false }, metadata: measured() });
  if (options.signal?.aborted) throw cancelled();
  const request = ExplanationRequestSchema.safeParse(input);
  if (!request.success) return fail('VALIDATION_ERROR');
  if (!member || member.status !== 'ACTIVE' || !['OWNER', 'SUPERVISOR', 'REQUESTER'].includes(member.role) ||
    ![member.userId, member.memberId, member.organizationId].every(value => z.string().uuid().safeParse(value).success))
    return fail('FORBIDDEN_TENANT');
  const deadline = options.deadlineMs ?? 45_000;
  if (!Number.isInteger(deadline) || deadline < 1 || deadline > 45_000) return fail('VALIDATION_ERROR');
  const controller = new AbortController(), abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, deadline);
  let providerTimer: ReturnType<typeof setTimeout> | undefined;
  const reference: Reference = {
    actor: { userId: member.userId, memberId: member.memberId, organizationId: member.organizationId },
    reconciliationId: request.data.reconciliationId, reconciliationVersion: request.data.reconciliationVersion,
    signal: controller.signal,
  };
  try {
    const snapshot = await bounded(dependencies.reconciliation.readAuthorized(reference), controller.signal);
    if (!snapshot || snapshot.state !== 'ACTIVE' || snapshot.organizationId !== member.organizationId) return fail('FORBIDDEN_TENANT');
    const parsed = ExplanationInputSchema.safeParse(snapshot.facts);
    if (!parsed.success) return fail('VALIDATION_ERROR');
    const facts = parsed.data;
    if (facts.reconciliationId !== reference.reconciliationId) return fail('FORBIDDEN_TENANT');
    if (facts.reconciliationVersion !== reference.reconciliationVersion) return fail('INPUT_REVISION_MISMATCH');
    const factsFingerprint = explanationFactsFingerprint(facts);
    const current = () => bounded(dependencies.reconciliation.checkCurrent({ ...reference, factsFingerprint }), controller.signal);
    const before = await current();
    if (before !== 'CURRENT') return fail(before === 'STALE' ? 'INPUT_REVISION_MISMATCH' : 'FORBIDDEN_TENANT');
    if (controller.signal.aborted) throw cancelled();
    const guidance = explanationGuidance(facts, request.data.language);
    if (guidance) return { ok: true, facts, factsFingerprint, explanation: null, guidance, metadata: measured() };
    let configuration: ReturnType<ExplanationProvider['configuration']>;
    try { configuration = provider.configuration(); } catch { return fail('NOT_CONFIGURED'); }
    if (!configuration || !/^muse-spark-[a-zA-Z0-9.-]{1,70}$/.test(configuration.model) ||
      configuration.model.toLowerCase().includes('contributor') || !Number.isInteger(configuration.timeoutMs) ||
      configuration.timeoutMs < 1_000 || configuration.timeoutMs > 45_000 || !Number.isInteger(configuration.maxOutputTokens) ||
      configuration.maxOutputTokens < 256 || configuration.maxOutputTokens > 4_096) return fail('NOT_CONFIGURED');
    metadata.model = configuration.model;
    // The provider budget is part of the same overall deadline, not a second unbounded wait.
    const remaining = Math.min(configuration.timeoutMs, deadline) - (Date.now() - started);
    if (remaining <= 0) return fail('PROVIDER_UNAVAILABLE');
    providerTimer = setTimeout(abort, remaining);
    metadata.attempts = 1; metadata.processingMayHaveOccurred = true;
    const raw = await bounded(provider.requestJson({ instructions, payload: structuredClone(facts),
      responseFormat, reasoningEffort: 'medium', signal: controller.signal }), controller.signal);
    const reply = replySchema.safeParse(raw);
    if (!reply.success || reply.data.model !== configuration.model) return fail('MODEL_OUTPUT_INVALID');
    metadata.requestId = reply.data.requestId;
    metadata.inputTokens = reply.data.usage?.inputTokens ?? null; metadata.outputTokens = reply.data.usage?.outputTokens ?? null;
    let explanation: ReconciliationExplanation;
    try { explanation = renderGroundedExplanation(facts, JSON.parse(reply.data.content), request.data.language); }
    catch { return fail('MODEL_OUTPUT_INVALID'); }
    const after = await current();
    if (after !== 'CURRENT') return fail(after === 'STALE' ? 'INPUT_REVISION_MISMATCH' : 'FORBIDDEN_TENANT');
    if (controller.signal.aborted) throw cancelled();
    return { ok: true, facts, factsFingerprint, explanation, guidance: null, metadata: measured() };
  } catch {
    if (options.signal?.aborted) throw cancelled();
    return fail('PROVIDER_UNAVAILABLE');
  } finally {
    clearTimeout(timer); clearTimeout(providerTimer); options.signal?.removeEventListener('abort', abort);
  }
}
