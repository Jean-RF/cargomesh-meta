import { z } from 'zod';

const revision = z.number().int().positive();
const quantity = z.number().int().min(0).max(1_000_000).nullable();
// Consumer projection only. Juan still owns the authoritative comparison/units.
const unit = z.enum(['PALLET', 'BOX']).nullable();
export const ExplanationComparisonStatusSchema = z.enum([
  'NOT_READY', 'MATCH', 'DIFFERENCE_PROPOSED', 'INSUFFICIENT_EVIDENCE', 'INCOMPATIBLE_SCOPE', 'OUTDATED',
]);
export const ExplanationEventReferenceSchema = z.object({
  eventId: z.string().uuid(), evidenceId: z.string().uuid(),
  timecodeMs: z.number().int().nonnegative().max(86_400_000),
}).strict();

export const ExplanationInputSchema = z.object({
  schemaVersion: z.literal('1.0'),
  reconciliationId: z.string().uuid(), reconciliationVersion: revision,
  sessionId: z.string().uuid(), manifestRevision: revision, observationRevision: revision.nullable(),
  comparisonStatus: ExplanationComparisonStatusSchema,
  sessionClosed: z.boolean(), evidenceSufficient: z.boolean(),
  expectedQuantity: quantity, expectedUnit: unit,
  observedQuantity: quantity, observedUnit: unit,
  differenceQuantity: z.number().int().min(-1_000_000).max(1_000_000).nullable(),
  events: z.array(ExplanationEventReferenceSchema).max(100),
}).strict().superRefine((value, context) => {
  const comparable = ['MATCH', 'DIFFERENCE_PROPOSED'].includes(value.comparisonStatus);
  if (comparable && (!value.sessionClosed || !value.evidenceSufficient || value.observationRevision === null ||
    value.expectedQuantity === null || value.observedQuantity === null || !value.expectedUnit ||
    value.expectedUnit !== value.observedUnit || value.differenceQuantity === null))
    context.addIssue({ code: 'custom', message: 'Comparable facts require a closed, evidenced and compatible scope.' });
  if (!comparable && value.differenceQuantity !== null)
    context.addIssue({ code: 'custom', message: 'An uncertain or outdated projection cannot expose a final difference.' });
  if ((value.comparisonStatus === 'MATCH' && value.differenceQuantity !== 0) ||
    (value.comparisonStatus === 'DIFFERENCE_PROPOSED' && value.differenceQuantity === 0))
    context.addIssue({ code: 'custom', message: 'The supplied difference contradicts the supplied status.' });
  if (new Set(value.events.map(event => event.eventId)).size !== value.events.length)
    context.addIssue({ code: 'custom', message: 'Event identities must be unique.' });
});

export const ExplanationActionSchema = z.enum([
  'REVIEW_EVIDENCE', 'RECORD_MORE_EVIDENCE', 'CHECK_MANIFEST', 'WAIT_FOR_SESSION_CLOSE', 'REQUEST_HUMAN_REVIEW',
]);

export const ExplanationShapeSchema = z.object({
  schemaVersion: z.literal('1.0'),
  reconciliationId: z.string().uuid(), reconciliationVersion: revision,
  comparisonStatus: ExplanationComparisonStatusSchema,
  summary: z.string().min(1).max(600),
  reasons: z.array(z.string().min(1).max(240)).max(4),
  limitations: z.array(z.string().min(1).max(240)).max(5),
  suggestedActions: z.array(ExplanationActionSchema).max(3),
  evidenceRefs: z.array(ExplanationEventReferenceSchema).max(20),
  requiresHumanReview: z.literal(true),
}).strict();

/** Structural/scope validation only. Provider responses must use the grounded plan renderer, not this prose envelope. */
export function validateExplanation(input: unknown, output: unknown) {
  const facts = ExplanationInputSchema.parse(input), explanation = ExplanationShapeSchema.parse(output);
  const issues: z.ZodIssue[] = [];
  if (!explanation.summary.trim() || [...explanation.reasons, ...explanation.limitations].some(value => !value.trim()))
    issues.push({ code: 'custom', path: [], message: 'Explanation text cannot be blank.' });
  if (facts.reconciliationId !== explanation.reconciliationId || facts.reconciliationVersion !== explanation.reconciliationVersion ||
    facts.comparisonStatus !== explanation.comparisonStatus)
    issues.push({ code: 'custom', path: [], message: 'Explanation scope, revision or status mismatch.' });
  if (new Set(explanation.suggestedActions).size !== explanation.suggestedActions.length ||
    new Set(explanation.evidenceRefs.map(event => event.eventId)).size !== explanation.evidenceRefs.length)
    issues.push({ code: 'custom', path: [], message: 'Duplicate action or event reference.' });
  for (const reference of explanation.evidenceRefs) {
    if (!facts.events.some(event => event.eventId === reference.eventId && event.evidenceId === reference.evidenceId && event.timecodeMs === reference.timecodeMs))
      issues.push({ code: 'custom', path: ['evidenceRefs'], message: 'Event reference is not present in the supplied facts.' });
  }
  if (issues.length) throw new z.ZodError(issues);
  return explanation;
}

export type ExplanationInput = z.infer<typeof ExplanationInputSchema>;
export type ReconciliationExplanation = z.infer<typeof ExplanationShapeSchema>;
