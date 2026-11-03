import { z } from 'zod';

// Meta documents sessionId as an opaque string, not a UUID or an authorization grant.
// Keep diagnostics bounded and single-line while allowing provider punctuation.
export const MetaSpeechSessionIdSchema = z.string().min(1).max(256).regex(/^[\x20-\x7e]+$/);
