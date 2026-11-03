import 'server-only';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { AuthenticatedMemberContext } from '@/server/auth/member';
import type { ProposalErrorCode } from '@/shared/schemas/meta/model-proposal';
import { TranscriptionInputSchema, validateTranscription, type Transcription } from '@/shared/schemas/meta/transcription';
import { inspectWave, MAX_WAVE_BYTES } from './wave';
import { InvalidMetaOutput, requestMetaTranscription, type MetaFetch } from './client';
import { readMetaSpeechConfig, type MetaEnvironment } from './config';
import { MetaSpeechSessionIdSchema } from '@/shared/schemas/meta/provider-identifiers';

// Consumer projection of the existing error codes, not a second provider catalog.
type FailureCode = Extract<ProposalErrorCode, 'VALIDATION_ERROR' | 'FORBIDDEN_TENANT' | 'MEDIA_INVALID' | 'NOT_CONFIGURED' |
  'INPUT_REVISION_MISMATCH' | 'MODEL_OUTPUT_INVALID' | 'PROVIDER_UNAVAILABLE'>;
type Actor = Pick<AuthenticatedMemberContext, 'userId' | 'memberId' | 'organizationId'>;
type Reference = { actor: Actor; evidenceId: string; inputRevision: number; signal: AbortSignal };
export type AuthorizedAudio = {
  evidenceId: string; organizationId: string; inputRevision: number; state: 'ACTIVE' | 'REVOKED';
  contentSha256: string; bytes: Uint8Array;
};
export type AudioEvidenceAccess = {
  readAuthorized: (reference: Reference) => Promise<AuthorizedAudio | null>;
  checkCurrent: (reference: Reference & { contentSha256: string }) => Promise<'CURRENT' | 'DENIED' | 'STALE'>;
};
/** Implemented by the one shared client; injected ports are explicitly test-only. */
export type SpeechProvider = {
  transport: 'INJECTED' | 'META_MODEL_API';
  configuration: () => { model: string; timeoutMs: number } | null;
  transcribe: (request: { audio: Uint8Array; language: 'es' | 'en'; signal: AbortSignal }) => Promise<unknown>;
};
export function metaSpeechProvider(options: { env?: MetaEnvironment; fetch?: MetaFetch } = {}): SpeechProvider {
  const config = readMetaSpeechConfig(options.env);
  return {
    transport: options.fetch ? 'INJECTED' : 'META_MODEL_API',
    configuration: () => config ? { model: config.model, timeoutMs: config.timeoutMs } : null,
    transcribe: async request => {
      if (!config) return null;
      try { return await requestMetaTranscription({ ...request, config, fetch: options.fetch }); }
      catch (error) { if (error instanceof InvalidMetaOutput) return null; throw error; }
    },
  };
}
type Metadata = {
  provider: 'META'; transport: SpeechProvider['transport']; model: string | null; attempts: number;
  latencyMs: number; processingMayHaveOccurred: boolean; requestId: string | null;
  providerSessionId: string | null; audioProcessedMs: number | null; estimatedCostUsd: null;
};
export type TranscriptionAttempt = { ok: true; transcription: Transcription; metadata: Metadata } |
  { ok: false; error: { code: FailureCode; retryable: boolean }; metadata: Metadata };

const responseSchema = z.object({
  transcript: z.string().max(6_000), audioDurationMs: z.number().int().min(0).max(600_000),
  sessionId: MetaSpeechSessionIdSchema, requestId: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/).nullable(),
}).strict();
const cancel = () => new DOMException('Transcription cancelled.', 'AbortError');
function bounded<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) { void work.catch(() => {}); return Promise.reject(cancel()); }
  return new Promise((resolve, reject) => {
    const aborted = () => { signal.removeEventListener('abort', aborted); reject(cancel()); };
    signal.addEventListener('abort', aborted, { once: true });
    work.then(value => { signal.removeEventListener('abort', aborted); resolve(value); },
      () => { signal.removeEventListener('abort', aborted); reject(new Error('Transcription dependency failed.')); });
  });
}

/** No storage writes, interpretation, form updates or commercial commands. */
export async function transcribeEvidence(input: unknown, member: AuthenticatedMemberContext,
  dependencies: { evidence: AudioEvidenceAccess; provider?: SpeechProvider },
  options: { signal?: AbortSignal; deadlineMs?: number } = {}): Promise<TranscriptionAttempt> {
  const started = Date.now();
  const provider = dependencies.provider ?? metaSpeechProvider();
  const metadata: Metadata = { provider: 'META', transport: provider.transport, model: null, attempts: 0,
    latencyMs: 0, processingMayHaveOccurred: false, requestId: null, providerSessionId: null, audioProcessedMs: null, estimatedCostUsd: null };
  const fail = (code: FailureCode, retryable = false): TranscriptionAttempt => ({ ok: false, error: { code, retryable }, metadata: { ...metadata, latencyMs: Math.max(0, Date.now() - started) } });
  if (options.signal?.aborted) throw cancel();
  const parsed = TranscriptionInputSchema.safeParse(input);
  if (!parsed.success) return fail('VALIDATION_ERROR');
  if (!member || member.status !== 'ACTIVE' || !['OWNER', 'SUPERVISOR', 'REQUESTER'].includes(member.role) ||
    ![member.userId, member.memberId, member.organizationId].every(value => z.string().uuid().safeParse(value).success)) return fail('FORBIDDEN_TENANT');
  let configuration: ReturnType<SpeechProvider['configuration']>;
  try { configuration = provider.configuration(); } catch { return fail('NOT_CONFIGURED'); }
  if (!configuration || !/^muse-voice-transcribe-[a-zA-Z0-9.-]{1,70}$/.test(configuration.model) ||
    configuration.model.toLowerCase().includes('contributor') || !Number.isInteger(configuration.timeoutMs) ||
    configuration.timeoutMs < 1_000 || configuration.timeoutMs > 45_000) return fail('NOT_CONFIGURED');
  metadata.model = configuration.model;
  const requestedDeadline = options.deadlineMs ?? configuration.timeoutMs;
  if (!Number.isInteger(requestedDeadline) || requestedDeadline < 1 || requestedDeadline > 45_000) return fail('VALIDATION_ERROR');
  const deadline = Math.min(configuration.timeoutMs, requestedDeadline);
  const controller = new AbortController(), aborted = () => controller.abort();
  options.signal?.addEventListener('abort', aborted, { once: true });
  const timer = setTimeout(aborted, deadline);
  const request = parsed.data;
  const actor: Actor = { userId: member.userId, memberId: member.memberId, organizationId: member.organizationId };
  const reference: Reference = { actor, evidenceId: request.evidenceId, inputRevision: request.inputRevision, signal: controller.signal };
  try {
    const evidence = await bounded(dependencies.evidence.readAuthorized(reference), controller.signal);
    if (options.signal?.aborted) throw cancel();
    if (!evidence || evidence.state !== 'ACTIVE' || evidence.evidenceId !== request.evidenceId || evidence.organizationId !== actor.organizationId)
      return fail('FORBIDDEN_TENANT');
    if (evidence.inputRevision !== request.inputRevision) return fail('INPUT_REVISION_MISMATCH');
    if (!(evidence.bytes instanceof Uint8Array) || evidence.bytes.byteLength > MAX_WAVE_BYTES) return fail('MEDIA_INVALID');
    const audio = new Uint8Array(evidence.bytes), facts = inspectWave(audio);
    if (!facts) return fail('MEDIA_INVALID');
    const hash = createHash('sha256').update(audio).digest('hex');
    if (!/^[a-f0-9]{64}$/i.test(evidence.contentSha256) || evidence.contentSha256.toLowerCase() !== hash) return fail('MEDIA_INVALID');
    const current = () => bounded(dependencies.evidence.checkCurrent({ ...reference, contentSha256: hash }), controller.signal);
    const before = await current();
    if (before !== 'CURRENT') return fail(before === 'STALE' ? 'INPUT_REVISION_MISMATCH' : 'FORBIDDEN_TENANT');
    if (controller.signal.aborted) throw cancel();
    metadata.attempts = 1; metadata.processingMayHaveOccurred = true;
    const reply = responseSchema.safeParse(await bounded(provider.transcribe({ audio, language: request.language, signal: controller.signal }), controller.signal));
    if (!reply.success || Math.abs(reply.data.audioDurationMs - facts.durationMs) > 100) return fail('MODEL_OUTPUT_INVALID');
    metadata.providerSessionId = reply.data.sessionId; metadata.requestId = reply.data.requestId;
    metadata.audioProcessedMs = reply.data.audioDurationMs;
    const after = await current();
    if (after !== 'CURRENT') return fail(after === 'STALE' ? 'INPUT_REVISION_MISMATCH' : 'FORBIDDEN_TENANT');
    if (controller.signal.aborted) throw cancel();
    const text = reply.data.transcript.trim();
    const transcription = validateTranscription(request, { schemaVersion: '1.0', evidenceId: request.evidenceId,
      inputRevision: request.inputRevision, status: text ? 'TRANSCRIBED' : 'EMPTY', text,
      audioDurationMs: facts.durationMs, requiresHumanConfirmation: true });
    return { ok: true, transcription, metadata: { ...metadata, latencyMs: Math.max(0, Date.now() - started) } };
  } catch {
    if (options.signal?.aborted) throw cancel();
    return fail('PROVIDER_UNAVAILABLE');
  } finally {
    clearTimeout(timer); options.signal?.removeEventListener('abort', aborted);
  }
}
