import assert from 'node:assert/strict';
import test from 'node:test';
import { runExplanationSmoke } from './meta-explanation-smoke';
import type { ExplanationProvider } from '../src/server/ai/meta/explain-reconciliation';

const env = { CARGOMESH_AI_PROVIDER: 'META', META_MODEL_API_KEY: '', META_MUSE_MODEL: 'muse-spark-1.3' };
test('an absent key cannot trigger a live explanation', async () => {
  const report = await runExplanationSmoke(env);
  assert.equal(report.status, 'FAILED_EXPLANATION_CHECK');
  assert.equal(report.error?.code, 'NOT_CONFIGURED');
  assert.equal(report.liveRequestMade, false);
  assert.equal(report.summary, null);
});

function provider(invalid = false): ExplanationProvider {
  return {
    transport: 'INJECTED',
    configuration: () => ({ model: 'muse-spark-1.3', timeoutMs: 1000, maxOutputTokens: 2048 }),
    requestJson: async ({ payload: facts }) => ({
      model: 'muse-spark-1.3', requestId: 'synthetic-explanation-smoke', usage: null,
      content: JSON.stringify({ schemaVersion: '1.0', reconciliationId: facts.reconciliationId,
        reconciliationVersion: facts.reconciliationVersion, comparisonStatus: facts.comparisonStatus,
        summaryFact: 'COMPARATOR_DIFFERENCE', reasonFacts: ['SESSION_CLOSED', 'SAME_UNIT'],
        suggestedActions: ['CHECK_MANIFEST'], requiresHumanReview: true,
        evidenceRefs: invalid ? [{ ...facts.events[0], timecodeMs: 999999 }] : [],
      }),
    }),
  };
}
test('injected explanation remains simulated and does not claim a live Passport integration', async () => {
  const report = await runExplanationSmoke(env, provider());
  assert.equal(report.status, 'PASS_SIMULATED');
  assert.equal(report.liveRequestMade, false);
  assert.equal(report.scope, 'SYNTHETIC_COMPARISON_NOT_PASSPORT_INTEGRATION');
  assert.match(report.summary!, /diferencia registrada 1 PALLET/);
  assert.equal(report.persistedWrites, 0);
  assert.equal(report.commercialWrites, 0);
});
test('an unsupported reference cannot become a successful smoke result', async () => {
  const report = await runExplanationSmoke(env, provider(true));
  assert.equal(report.status, 'FAILED_EXPLANATION_CHECK');
  assert.equal(report.error?.code, 'MODEL_OUTPUT_INVALID');
  assert.equal(report.summary, null);
});
