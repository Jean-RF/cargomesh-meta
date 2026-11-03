import { z } from 'zod';
import {
  ExplanationActionSchema, ExplanationEventReferenceSchema,
  type ExplanationInput, validateExplanation,
} from './reconciliation-explanation';

export const ExplanationRequestSchema = z.object({
  schemaVersion: z.literal('1.0'), reconciliationId: z.string().uuid(),
  reconciliationVersion: z.number().int().positive(), language: z.enum(['es', 'en']),
}).strict();

// The model selects grounded statements. Arbitrary generated prose never reaches the Passport.
export const ExplanationPlanShapeSchema = z.object({
  schemaVersion: z.literal('1.0'), reconciliationId: z.string().uuid(),
  reconciliationVersion: z.number().int().positive(),
  comparisonStatus: z.enum(['MATCH', 'DIFFERENCE_PROPOSED']),
  summaryFact: z.enum(['COMPARATOR_MATCH', 'COMPARATOR_DIFFERENCE']),
  reasonFacts: z.array(z.enum(['SESSION_CLOSED', 'EVIDENCE_SUFFICIENT', 'SAME_UNIT', 'REFERENCED_EVENTS'])).min(1).max(4),
  suggestedActions: z.array(ExplanationActionSchema).min(1).max(3),
  evidenceRefs: z.array(ExplanationEventReferenceSchema).max(20),
  requiresHumanReview: z.literal(true),
}).strict();

export type ExplanationLanguage = z.infer<typeof ExplanationRequestSchema>['language'];
export type ExplanationPlan = z.infer<typeof ExplanationPlanShapeSchema>;

const reasonCopy = {
  es: {
    SESSION_CLOSED: 'La sesión está cerrada.', EVIDENCE_SUFFICIENT: 'El comparador declara suficiente la evidencia.',
    SAME_UNIT: 'Las cantidades usan la misma unidad.', REFERENCED_EVENTS: 'Las referencias pertenecen a los eventos recibidos; no prueban por sí solas la causa.',
  },
  en: {
    SESSION_CLOSED: 'The session is closed.', EVIDENCE_SUFFICIENT: 'The comparator reports sufficient evidence.',
    SAME_UNIT: 'The quantities use the same unit.', REFERENCED_EVENTS: 'References belong to the supplied events; they do not establish the cause by themselves.',
  },
};

/** Never computes a difference, infers a cause, executes actions or generates evidence URLs. */
export function renderGroundedExplanation(facts: ExplanationInput, output: unknown, language: ExplanationLanguage) {
  const plan = ExplanationPlanShapeSchema.parse(output);
  if (facts.comparisonStatus !== plan.comparisonStatus ||
    plan.summaryFact !== (facts.comparisonStatus === 'MATCH' ? 'COMPARATOR_MATCH' : 'COMPARATOR_DIFFERENCE') ||
    !facts.sessionClosed || !facts.evidenceSufficient || !facts.expectedUnit || facts.expectedUnit !== facts.observedUnit ||
    facts.expectedQuantity === null || facts.observedQuantity === null || facts.differenceQuantity === null ||
    new Set(plan.reasonFacts).size !== plan.reasonFacts.length ||
    (plan.reasonFacts.includes('REFERENCED_EVENTS') && !plan.evidenceRefs.length) ||
    plan.suggestedActions.some(action => action !== 'CHECK_MANIFEST' && action !== 'REQUEST_HUMAN_REVIEW' &&
      !(action === 'REVIEW_EVIDENCE' && plan.evidenceRefs.length)))
    throw new Error('Invalid grounded explanation.');
  const summary = language === 'es'
    ? `Comparador: esperado ${facts.expectedQuantity} ${facts.expectedUnit}; observado ${facts.observedQuantity} ${facts.observedUnit}; diferencia registrada ${facts.differenceQuantity} ${facts.expectedUnit}. ${plan.comparisonStatus === 'MATCH' ? 'Coincidencia de conteos.' : 'Diferencia pendiente de revisión.'}`
    : `Comparator: expected ${facts.expectedQuantity} ${facts.expectedUnit}; observed ${facts.observedQuantity} ${facts.observedUnit}; recorded difference ${facts.differenceQuantity} ${facts.expectedUnit}. ${plan.comparisonStatus === 'MATCH' ? 'Counts match.' : 'Difference awaiting review.'}`;
  return validateExplanation(facts, {
    schemaVersion: plan.schemaVersion, reconciliationId: plan.reconciliationId,
    reconciliationVersion: plan.reconciliationVersion, comparisonStatus: plan.comparisonStatus,
    summary, reasons: plan.reasonFacts.map(reason => reasonCopy[language][reason]),
    limitations: language === 'es'
      ? ['Compara los conteos recibidos; no determina la causa ni acredita una pérdida física.', 'Las acciones son sugerencias que requieren revisión humana.']
      : ['Compares the supplied counts; it does not determine a cause or establish a physical loss.', 'Actions are suggestions that require human review.'],
    suggestedActions: plan.suggestedActions, evidenceRefs: plan.evidenceRefs, requiresHumanReview: true,
  });
}

/** Status guidance is domain copy, never labelled as an AI explanation. */
export function explanationGuidance(facts: ExplanationInput, language: ExplanationLanguage) {
  if (facts.comparisonStatus === 'MATCH' || facts.comparisonStatus === 'DIFFERENCE_PROPOSED') return null;
  const copy = {
    es: {
      NOT_READY: 'Comparación pendiente. Los conteos disponibles muestran progreso; no acreditan un faltante.',
      INSUFFICIENT_EVIDENCE: 'La evidencia es insuficiente para concluir una diferencia.',
      INCOMPATIBLE_SCOPE: 'Las unidades o el alcance no son compatibles. Revisa el manifiesto y la observación.',
      OUTDATED: 'La comparación está desactualizada. Revisa la versión vigente antes de continuar.',
    },
    en: {
      NOT_READY: 'Comparison pending. Available counts show progress; they do not establish missing cargo.',
      INSUFFICIENT_EVIDENCE: 'Evidence is insufficient to conclude a difference.',
      INCOMPATIBLE_SCOPE: 'Units or scope are incompatible. Review the manifest and observation.',
      OUTDATED: 'The comparison is outdated. Review the current version before continuing.',
    },
  };
  const suggestedActions = facts.comparisonStatus === 'OUTDATED' || facts.comparisonStatus === 'INCOMPATIBLE_SCOPE'
    ? ['CHECK_MANIFEST', 'REQUEST_HUMAN_REVIEW'] as const
    : facts.sessionClosed ? ['RECORD_MORE_EVIDENCE', 'REQUEST_HUMAN_REVIEW'] as const
      : ['WAIT_FOR_SESSION_CLOSE', 'RECORD_MORE_EVIDENCE'] as const;
  return { source: 'DOMAIN_STATUS' as const, summary: copy[language][facts.comparisonStatus],
    suggestedActions: [...suggestedActions], requiresHumanReview: true as const };
}
