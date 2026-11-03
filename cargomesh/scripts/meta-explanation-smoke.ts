import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { explainReconciliation, metaExplanationProvider, type ExplanationProvider } from '../src/server/ai/meta/explain-reconciliation';
import type { MetaEnvironment } from '../src/server/ai/meta/config';
import type { AuthenticatedMemberContext } from '../src/server/auth/member';
import { ExplanationInputSchema } from '../src/shared/schemas/meta/reconciliation-explanation';

const sample = JSON.parse(readFileSync(new URL('../../docs/meta/contracts/fixtures/luis-v1.json', import.meta.url), 'utf8'));

/** Real provider over synthetic comparison facts; no database, Passport or domain writes. */
export async function runExplanationSmoke(env: MetaEnvironment,
  provider: ExplanationProvider = metaExplanationProvider({ env })) {
  const facts = ExplanationInputSchema.parse(structuredClone(sample.explanation.input));
  const member: AuthenticatedMemberContext = {
    userId: 'ab030000-0000-4000-8000-000000000011', memberId: 'ab030000-0000-4000-8000-000000000012',
    organizationId: 'ab030000-0000-4000-8000-000000000013', role: 'REQUESTER', status: 'ACTIVE', userEmail: '',
  };
  const result = await explainReconciliation({ schemaVersion: '1.0', reconciliationId: facts.reconciliationId,
    reconciliationVersion: facts.reconciliationVersion, language: 'es' }, member, {
    provider, reconciliation: {
      readAuthorized: async () => ({ organizationId: member.organizationId, state: 'ACTIVE', facts }),
      checkCurrent: async () => 'CURRENT',
    },
  });
  const accepted = result.ok && result.explanation !== null &&
    result.explanation.comparisonStatus === facts.comparisonStatus && result.explanation.requiresHumanReview &&
    JSON.stringify(result.facts) === JSON.stringify(facts);
  return {
    check: 'meta-explanation', scope: 'SYNTHETIC_COMPARISON_NOT_PASSPORT_INTEGRATION', syntheticInput: true,
    status: !accepted ? 'FAILED_EXPLANATION_CHECK' :
      result.metadata.transport === 'INJECTED' ? 'PASS_SIMULATED' : 'PASS_EXPLANATION_TRANSPORT',
    liveRequestMade: result.metadata.transport === 'META_MODEL_API' && result.metadata.attempts > 0,
    metadata: result.metadata, error: result.ok ? null : result.error,
    summary: accepted && result.ok ? result.explanation!.summary : null,
    requiresHumanReview: true, persistedWrites: 0, commercialWrites: 0,
  };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  (async () => {
    if (process.argv.length !== 3 || process.argv[2] !== '--live') {
      console.log(JSON.stringify({ check: 'meta-explanation', status: 'LIVE_OPT_IN_REQUIRED', liveRequestMade: false }));
      process.exitCode = 2; return;
    }
    const report = await runExplanationSmoke(process.env);
    const secrets = Object.entries(process.env).filter(([name, value]) => /(?:KEY|TOKEN|SECRET|PASSWORD)$/i.test(name) && value && value.length >= 4)
      .map(([, value]) => value!);
    const safe = !secrets.some(value => JSON.stringify(report).includes(value));
    console.log(JSON.stringify(safe ? report : { check: 'meta-explanation', status: 'FAILED_EXPLANATION_CHECK', liveRequestMade: null }, null, 2));
    process.exitCode = safe && report.status === 'PASS_EXPLANATION_TRANSPORT' ? 0 : 2;
  })().catch(() => {
    console.log(JSON.stringify({ check: 'meta-explanation', status: 'FAILED_EXPLANATION_CHECK', liveRequestMade: null }));
    process.exitCode = 1;
  });
}
