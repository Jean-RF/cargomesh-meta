import type {DockMindJob} from "@/shared/schemas/meta/dockmind";
import type {WorkerDispatcher} from "./ports";

/**
 * Envía el job al endpoint `jobs` del worker en Modal (cargomesh/dockmind-worker/modal_app.py).
 * Modal exige proxy auth con los headers Modal-Key y Modal-Secret
 * (https://modal.com/docs/guide/webhook-proxy-auth). El endpoint responde de inmediato
 * porque el análisis corre con `spawn`; el resultado llega después por el callback firmado.
 */
export function createModalDispatcher(options: {
  url: string; tokenId: string; tokenSecret: string; fetchImpl?: typeof fetch; timeoutMs?: number;
}): WorkerDispatcher {
  const send = options.fetchImpl ?? fetch;
  return {
    async dispatch(job: DockMindJob) {
      const response = await send(options.url, {
        method: "POST",
        headers: {"content-type": "application/json", "Modal-Key": options.tokenId, "Modal-Secret": options.tokenSecret},
        body: JSON.stringify(job),
        signal: AbortSignal.timeout(options.timeoutMs ?? 15_000),
      });
      if (!response.ok) {
        const detail = (await response.text().catch(() => "")).slice(0, 200);
        throw new Error(`Worker answered HTTP ${response.status}${detail ? `: ${detail}` : ""}`);
      }
      const data = (await response.json().catch(() => ({}))) as {call_id?: unknown; duplicate?: unknown};
      return {callId: typeof data.call_id === "string" ? data.call_id : null, duplicate: data.duplicate === true};
    },
  };
}
