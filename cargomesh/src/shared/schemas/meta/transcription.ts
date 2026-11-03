import { z } from 'zod';

/** Luis -> Cristhian/Axel. A proposed boundary, not an access grant or saved fact. */
export const TranscriptionInputSchema = z.object({
  schemaVersion: z.literal('1.0'),
  evidenceId: z.string().uuid(),
  inputRevision: z.number().int().nonnegative(),
  language: z.enum(['es', 'en']),
}).strict();

export const TranscriptionShapeSchema = z.object({
  schemaVersion: z.literal('1.0'),
  evidenceId: z.string().uuid(),
  inputRevision: z.number().int().nonnegative(),
  status: z.enum(['TRANSCRIBED', 'EMPTY']),
  text: z.string().max(6_000),
  audioDurationMs: z.number().int().positive().max(600_000),
  requiresHumanConfirmation: z.literal(true),
}).strict();

export const TranscriptionSchema = TranscriptionShapeSchema.superRefine((value, context) => {
  if ((value.status === 'EMPTY') !== (value.text.length === 0) || (value.status === 'TRANSCRIBED' && !value.text.trim()))
    context.addIssue({ code: 'custom', message: 'Transcript text must match its status.' });
});

export function validateTranscription(input: unknown, output: unknown) {
  const request = TranscriptionInputSchema.parse(input), result = TranscriptionSchema.parse(output);
  if (request.evidenceId !== result.evidenceId || request.inputRevision !== result.inputRevision)
    throw new z.ZodError([{ code: 'custom', path: [], message: 'Evidence or input revision mismatch.' }]);
  return result;
}

/** Same evidence shape as Axel's DeclarationInput v1; no duplicate proposal schema. */
export function transcriptionEvidence(input: unknown, output: unknown) {
  const result = validateTranscription(input, output);
  return result.status === 'EMPTY' ? null : { evidenceId: result.evidenceId, kind: 'audio' as const, text: result.text };
}

export type TranscriptionInput = z.infer<typeof TranscriptionInputSchema>;
export type Transcription = z.infer<typeof TranscriptionSchema>;
