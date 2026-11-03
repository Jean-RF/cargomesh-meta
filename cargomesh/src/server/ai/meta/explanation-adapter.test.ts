import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import type { AuthenticatedMemberContext } from '@/server/auth/member';
import { explainReconciliation, metaExplanationProvider, type ReconciliationAccess } from './explain-reconciliation';

const facts = JSON.parse(readFileSync(new URL('../../../../../docs/meta/contracts/fixtures/luis-v1.json', import.meta.url), 'utf8')).explanation.input;
const member: AuthenticatedMemberContext = {
  userId: 'ab030000-0000-4000-8000-000000000011', memberId: 'ab030000-0000-4000-8000-000000000012',
  organizationId: 'ab030000-0000-4000-8000-000000000013', role: 'REQUESTER', status: 'ACTIVE', userEmail: '',
};
const request = { schemaVersion: '1.0', reconciliationId: facts.reconciliationId, reconciliationVersion: facts.reconciliationVersion, language: 'es' };
const reconciliation: ReconciliationAccess = {
  readAuthorized: async () => ({ organizationId: member.organizationId, state: 'ACTIVE', facts }), checkCurrent: async () => 'CURRENT',
};
const env = { CARGOMESH_AI_PROVIDER: 'META', META_MODEL_API_KEY: 'unit-test-key-not-real', META_MUSE_MODEL: 'muse-spark-1.3' };
const plan = {
  schemaVersion: '1.0', reconciliationId: facts.reconciliationId, reconciliationVersion: facts.reconciliationVersion,
  comparisonStatus: facts.comparisonStatus, summaryFact: 'COMPARATOR_DIFFERENCE', reasonFacts: ['SESSION_CLOSED', 'SAME_UNIT'],
  suggestedActions: ['REVIEW_EVIDENCE'], evidenceRefs: facts.events, requiresHumanReview: true,
};
function completion(message: Record<string, unknown> = { content: JSON.stringify(plan) }, options: { finish?: string; model?: string } = {}) {
  return new Response(JSON.stringify({
    id: 'chatcmpl-synthetic', object: 'chat.completion', created: 1, model: options.model ?? env.META_MUSE_MODEL,
    choices: [{ index: 0, finish_reason: options.finish ?? 'stop', message: { role: 'assistant', ...message } }],
    usage: { prompt_tokens: 120, completion_tokens: 80, total_tokens: 200 },
  }), { headers: { 'content-type': 'application/json', 'x-request-id': 'synthetic-explanation-adapter' } });
}

test('explanation uses Axel SDK transport with strict schema, medium and no commercial tools', async () => {
  let calls = 0;
  const fetch: typeof globalThis.fetch = async (url, init) => {
    calls++; assert.equal(String(url), 'https://api.meta.ai/v1/chat/completions');
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer unit-test-key-not-real');
    const body = JSON.parse(String(init?.body));
    assert.equal(body.model, env.META_MUSE_MODEL); assert.equal(body.reasoning_effort, 'medium');
    assert.equal(body.max_tokens, 2048); assert.equal(body.store, false); assert.equal(body.tools, undefined);
    assert.equal(body.response_format.type, 'json_schema'); assert.equal(body.response_format.json_schema.strict, true);
    assert.equal(body.response_format.json_schema.name, 'reconciliation_explanation_plan_v1');
    assert.equal(body.response_format.json_schema.schema.additionalProperties, false);
    assert.deepEqual(JSON.parse(body.messages[1].content), facts);
    return completion();
  };
  const provider = metaExplanationProvider({ env, fetch });
  assert.equal('apiKey' in provider.configuration()!, false);
  const result = await explainReconciliation(request, member, { reconciliation, provider });
  assert.equal(result.ok, true); assert.equal(calls, 1);
  if (!result.ok) return;
  assert.match(result.explanation!.summary, /diferencia registrada 1 PALLET/);
  assert.equal(result.metadata.transport, 'INJECTED'); assert.equal(result.metadata.inputTokens, 120);
  assert.equal(result.metadata.outputTokens, 80); assert.equal(result.metadata.estimatedCostUsd, null);
  assert.doesNotMatch(JSON.stringify(result), /unit-test-key|Bearer|authorization/);
});

test('real client configuration gates absent key, alternate endpoints and contributor models without fetch', async () => {
  let calls = 0;
  const fetch: typeof globalThis.fetch = async () => { calls++; throw new Error('must not call'); };
  for (const configured of [{ ...env, META_MODEL_API_KEY: '' }, { ...env, CARGOMESH_AI_PROVIDER: 'AWS' },
    { ...env, META_MODEL_BASE_URL: 'https://untrusted.invalid' }, { ...env, META_MUSE_MODEL: 'muse-spark-1.3-contributor' }]) {
    const result = await explainReconciliation(request, member, { reconciliation, provider: metaExplanationProvider({ env: configured, fetch }) });
    assert.equal(!result.ok && result.error.code, 'NOT_CONFIGURED');
  }
  assert.equal(calls, 0);
});

test('shared SDK never retries 401, 429 or 500 and does not expose provider errors', async () => {
  for (const status of [401, 429, 500]) {
    let calls = 0;
    const fetch: typeof globalThis.fetch = async () => {
      calls++; return new Response(JSON.stringify({ error: { message: 'private provider error unit-test-key-not-real' } }),
        { status, headers: { 'content-type': 'application/json' } });
    };
    const result = await explainReconciliation(request, member, { reconciliation, provider: metaExplanationProvider({ env, fetch }) });
    assert.equal(!result.ok && result.error.code, 'PROVIDER_UNAVAILABLE'); assert.equal(calls, 1);
    assert.equal(result.metadata.processingMayHaveOccurred, true); assert.doesNotMatch(JSON.stringify(result), /private|unit-test-key/);
  }
});

test('truncation, tool calls, refusals and a wrong model fail through the shared client guard', async () => {
  const outputs = [
    () => completion({ content: JSON.stringify(plan) }, { finish: 'length' }),
    () => completion({ content: JSON.stringify(plan), tool_calls: [{ type: 'function', id: 'synthetic', function: { name: 'createBooking', arguments: '{}' } }] }),
    () => completion({ content: null, refusal: 'private refusal' }),
    () => completion({ content: JSON.stringify(plan) }, { model: 'muse-spark-another' }),
  ];
  for (const output of outputs) {
    let calls = 0;
    const fetch: typeof globalThis.fetch = async () => { calls++; return output(); };
    const result = await explainReconciliation(request, member, { reconciliation, provider: metaExplanationProvider({ env, fetch }) });
    assert.equal(!result.ok && result.error.code, 'MODEL_OUTPUT_INVALID'); assert.equal(calls, 1);
    assert.doesNotMatch(JSON.stringify(result), /private refusal|createBooking/);
  }
});

test('SDK success cannot bypass the grounded plan or an unknown event check', async () => {
  for (const change of [{ summary: 'Se perdieron siete pallets.' },
    { evidenceRefs: [{ ...facts.events[0], timecodeMs: 99999 }] }]) {
    const fetch: typeof globalThis.fetch = async () => completion({ content: JSON.stringify({ ...plan, ...change }) });
    const result = await explainReconciliation(request, member, { reconciliation, provider: metaExplanationProvider({ env, fetch }) });
    assert.equal(!result.ok && result.error.code, 'MODEL_OUTPUT_INVALID');
  }
});
