import type {AnalysisJobView} from "@/server/modules/analysis-jobs/view";

export const POLL_INTERVAL_MS = 3_000;
type T = (es: string, en: string) => string;

export function shouldPoll(view: Pick<AnalysisJobView, "status"> | null): boolean {
  return view === null || view.status === "QUEUED" || view.status === "RUNNING";
}

/** 5.8 -> "0:05.8"; 75 -> "1:15.0". */
export function formatSeconds(seconds: number): string {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  return `${minutes}:${(safe - minutes * 60).toFixed(1).padStart(4, "0")}`;
}

export function statusLabel(view: AnalysisJobView, t: T): string {
  switch (view.status) {
    case "QUEUED": return view.error ? t("En cola: el worker no respondió", "Queued: the worker did not answer") : t("En cola", "Queued");
    case "RUNNING": return t("Analizando el clip", "Analyzing the clip");
    case "FAILED": return t("El análisis falló", "Analysis failed");
    default:
      if (view.result?.observationStatus === "REQUIRES_REVIEW") return t("Requiere revisión", "Requires review");
      if (view.result?.observationStatus === "INSUFFICIENT_EVIDENCE") return t("Evidencia insuficiente", "Insufficient evidence");
      return t("Conteo listo", "Count ready");
  }
}

export function flagLabel(kind: string, t: T): string {
  switch (kind) {
    case "ID_SWITCH_SUSPECTED": return t("Posible cambio de identidad junto a la línea", "Possible identity change at the line");
    case "TRACK_LOST_NEAR_LINE": return t("Bulto perdido o aparecido junto a la línea", "Item lost or appeared at the line");
    case "ENDS_ON_LINE": return t("El clip termina con un bulto sobre la línea", "The clip ends with an item on the line");
    case "OBJECT_LIMIT_REACHED": return t("Demasiados objetos en un cuadro", "Too many objects in one frame");
    case "SHORT_TRACK_CROSSED": return t("Cruce visto en muy pocos cuadros", "Crossing seen in too few frames");
    default: return kind;
  }
}

/** Avisos de procedencia: un render o un fixture nunca se presentan como cámara real o inferencia real. */
export function sourceNotices(view: AnalysisJobView, t: T): string[] {
  const notices: string[] = [];
  if (view.result?.clipSource === "SYNTHETIC_RENDER") notices.push(t("Clip sintético, no es una cámara real", "Synthetic clip, not a real camera"));
  if (view.result && !view.result.realInference) notices.push(t("Resultado de prueba: no es inferencia real de SAM", "Test result: not a real SAM inference"));
  return notices;
}

/** La observación llega a la sesión de Juan aparte del análisis: un conteo listo puede seguir sin entregar. */
export function deliveryLabel(view: Pick<AnalysisJobView, "status" | "delivery">, t: T): string | null {
  if (view.status !== "SUCCEEDED") return null;
  switch (view.delivery.status) {
    case "DELIVERED": return t("Observación registrada en la sesión", "Observation recorded in the session");
    case "PENDING": return t("Conteo guardado; falta registrarlo en la sesión", "Count saved; not yet recorded in the session");
    case "REJECTED": return t(`La sesión no aceptó la observación (${view.delivery.error?.code ?? "?"})`, `The session rejected the observation (${view.delivery.error?.code ?? "?"})`);
    case "SUPERSEDED": return t("Otro intento más reciente ya está registrado", "A newer attempt is already recorded");
    default: return null;
  }
}
