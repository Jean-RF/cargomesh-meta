import type {AnalysisJobRecord} from "./ports";

export const QUEUED_RETRY_AFTER_MS = 2 * 60 * 1000;
export const RUNNING_RETRY_AFTER_MS = 20 * 60 * 1000; // el worker corta a los 15 minutos

/** Se puede reintentar si falló, si nunca salió de la cola o si el worker no avisó a tiempo. */
export function isRetryable(job: AnalysisJobRecord, now: Date): boolean {
  const waited = now.getTime() - Date.parse(job.dispatchedAt ?? job.updatedAt);
  if (job.status === "FAILED") return true;
  if (job.status === "QUEUED") return job.error !== null || waited >= QUEUED_RETRY_AFTER_MS;
  if (job.status === "RUNNING") return waited >= RUNNING_RETRY_AFTER_MS;
  return false;
}
