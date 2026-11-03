import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { zodResponseFormat } from 'openai/helpers/zod';
import { TranscriptionInputSchema, TranscriptionSchema, TranscriptionShapeSchema, transcriptionEvidence, validateTranscription } from './transcription';
import { ExplanationInputSchema, ExplanationShapeSchema, validateExplanation } from './reconciliation-explanation';
import { DeclarationInputSchema } from './model-proposal';

const fixtures = JSON.parse(readFileSync(new URL('../../../../../docs/meta/contracts/fixtures/luis-v1.json', import.meta.url), 'utf8'));
const voice = fixtures.transcription, explanation = fixtures.explanation;

test('fixtures are explicitly synthetic, never recorded model acceptance', () => {
  assert.equal(fixtures.classification, 'SYNTHETIC_CONTRACT_FIXTURES_NOT_MODEL_OUTPUT');
});
test('transcription retains evidence/revision and maps to Axel DeclarationInput v1 evidence', () => {
  assert.equal(validateTranscription(voice.input, voice.output).requiresHumanConfirmation, true);
  assert.deepEqual(transcriptionEvidence(voice.input, voice.output), { evidenceId: voice.input.evidenceId, kind: 'audio', text: voice.output.text });
  assert.equal(DeclarationInputSchema.safeParse({ schemaVersion: '1.0', inputRevision: voice.input.inputRevision,
    language: voice.input.language, text: null, evidence: [transcriptionEvidence(voice.input, voice.output)] }).success, true);
});
test('empty transcription does not invent an interpretation input', () => {
  assert.equal(transcriptionEvidence(voice.input, voice.empty), null);
  assert.equal(TranscriptionSchema.safeParse({ ...voice.empty, text: 'invented' }).success, false);
  assert.equal(TranscriptionSchema.safeParse({ ...voice.output, text: '  ' }).success, false);
});
test('another evidence or stale revision cannot become the current transcription', () => {
  assert.throws(() => validateTranscription(voice.input, voice.rejected));
  assert.throws(() => validateTranscription(voice.input, { ...voice.output, inputRevision: 2 }));
});
test('transcription rejects confirmation, injected scope/URLs, extra commands and excessive data', () => {
  for (const extra of [{ organizationId: 'arbitrary' }, { url: 'https://arbitrary.invalid/audio' }, { storageKey: 'private-object' }])
    assert.equal(TranscriptionInputSchema.safeParse({ ...voice.input, ...extra }).success, false);
  for (const change of [{ requiresHumanConfirmation: false }, { createBooking: true }, { text: 'x'.repeat(6001) }, { audioDurationMs: 600_001 }])
    assert.equal(TranscriptionSchema.safeParse({ ...voice.output, ...change }).success, false);
});
test('explanation consumes supplied comparison facts without mutating the input', () => {
  const before = JSON.stringify(explanation.input);
  assert.equal(validateExplanation(explanation.input, explanation.output).comparisonStatus, 'DIFFERENCE_PROPOSED');
  assert.equal(JSON.stringify(explanation.input), before);
});
test('open, insufficient, missing and incompatible scopes cannot claim a comparable difference', () => {
  assert.equal(ExplanationInputSchema.safeParse(explanation.incomplete).success, true);
  for (const change of [{ sessionClosed: false }, { evidenceSufficient: false }, { observationRevision: null }, { expectedQuantity: null }, { observedUnit: 'BOX' }])
    assert.equal(ExplanationInputSchema.safeParse({ ...explanation.input, ...change }).success, false);
  for (const comparisonStatus of ['NOT_READY', 'INSUFFICIENT_EVIDENCE', 'INCOMPATIBLE_SCOPE', 'OUTDATED'])
    assert.equal(ExplanationInputSchema.safeParse({ ...explanation.input, comparisonStatus }).success, false);
});
test('not ready stays unknown, never confirmed zero or a final difference', () => {
  const result = { ...explanation.output, comparisonStatus: 'NOT_READY', summary: 'La sesión sigue abierta; falta evidencia.', evidenceRefs: [], suggestedActions: ['WAIT_FOR_SESSION_CLOSE'] };
  assert.equal(validateExplanation(explanation.incomplete, result).comparisonStatus, 'NOT_READY');
  assert.throws(() => validateExplanation(explanation.incomplete, explanation.output));
});
test('explanations reject stale identities and invented event IDs, evidence or timecodes', () => {
  assert.throws(() => validateExplanation(explanation.input, explanation.rejected));
  assert.throws(() => validateExplanation(explanation.input, { ...explanation.output, reconciliationVersion: 1 }));
  for (const change of [{ eventId: voice.input.evidenceId }, { evidenceId: voice.input.evidenceId }, { timecodeMs: 9999 }])
    assert.throws(() => validateExplanation(explanation.input, { ...explanation.output, evidenceRefs: [{ ...explanation.output.evidenceRefs[0], ...change }] }));
});
test('actions remain proposals and models cannot introduce counts or commercial commands', () => {
  for (const change of [{ suggestedActions: ['CREATE_INCIDENT'] }, { requiresHumanReview: false }, { differenceQuantity: 999 }, { confirmBooking: true }])
    assert.equal(ExplanationShapeSchema.safeParse({ ...explanation.output, ...change }).success, false);
  assert.throws(() => validateExplanation(explanation.input, { ...explanation.output, suggestedActions: ['REVIEW_EVIDENCE', 'REVIEW_EVIDENCE'] }));
  assert.throws(() => validateExplanation(explanation.input, { ...explanation.output, evidenceRefs: [explanation.output.evidenceRefs[0], explanation.output.evidenceRefs[0]] }));
});
test('semantic guards reject blank explanation text and contradictory supplied match status', () => {
  assert.throws(() => validateExplanation(explanation.input, { ...explanation.output, summary: '   ' }));
  assert.throws(() => validateExplanation(explanation.input, { ...explanation.output, limitations: ['   '] }));
  assert.equal(ExplanationInputSchema.safeParse({ ...explanation.input, comparisonStatus: 'MATCH' }).success, false);
});
test('structural contracts can supply strict provider JSON Schema without provider calls', () => {
  for (const schema of [TranscriptionShapeSchema, ExplanationShapeSchema]) {
    const format = zodResponseFormat(schema, 'luis_contract_v1');
    assert.equal(format.type, 'json_schema'); assert.equal(format.json_schema.strict, true);
    assert.equal(format.json_schema.schema?.additionalProperties, false);
  }
});
