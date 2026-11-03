"use client";
import {useCallback, useEffect, useRef, useState} from "react";
import {RefreshCw, Send, Video} from "lucide-react";
import {useLocale} from "@/features/i18n/locale-provider";
import type {AnalysisJobView} from "@/server/modules/analysis-jobs/view";
import {dockmindApi, dockmindErrorMessage, type DockMindApi} from "./dockmind-api";
import {POLL_INTERVAL_MS, deliveryLabel, flagLabel, formatSeconds, shouldPoll, sourceNotices, statusLabel} from "./job-status-model";
import s from "./dockmind.module.css";

/**
 * Estado de un job DockMind: consulta cada 3 s mientras está en cola o en curso, conserva el último dato visible
 * si una consulta falla y permite saltar al segundo exacto de cada marca en el video anotado (URL corta pedida
 * al servidor). El conteo no se recalcula aquí: se muestra el que guardó el worker. Si la observación quedó sin
 * entregar a la sesión, ofrece recuperarla sin volver a analizar el clip.
 */
export function DockMindJobStatus({jobId, canOperate, onDelivered, api = dockmindApi}: {
  jobId: string; canOperate: boolean; onDelivered?: () => void; api?: DockMindApi;
}) {
  const {t} = useLocale();
  const [view, setView] = useState<AnalysisJobView | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [generation, setGeneration] = useState(0);
  // La URL del video anotado es de un intento: si el job pasa a otro intento, deja de mostrarse.
  const [overlayFor, setOverlayFor] = useState<{attempt: number; url: string} | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const lastDelivery = useRef<string | null>(null);
  // El dashboard pasa una función nueva en cada render; guardarla evita reiniciar el sondeo.
  const delivered = useRef(onDelivered);
  delivered.current = onDelivered;

  // Avisa solo cuando la entrega cambia a DELIVERED mientras se mira, no al abrir un job ya entregado.
  const show = useCallback((next: AnalysisJobView) => {
    setView(next);
    setProblem(null);
    if (next.delivery.status === "DELIVERED" && lastDelivery.current !== null && lastDelivery.current !== "DELIVERED") delivered.current?.();
    lastDelivery.current = next.delivery.status;
  }, []);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      try {
        const next = await api.read(jobId);
        if (!active) return;
        show(next);
        if (shouldPoll(next)) timer = setTimeout(tick, POLL_INTERVAL_MS);
      } catch (error) {
        if (!active) return;
        setProblem(dockmindErrorMessage(error));
        timer = setTimeout(tick, POLL_INTERVAL_MS * 2);
      }
    };
    void tick();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [api, jobId, generation, show]);

  const act = async (work: (current: AnalysisJobView) => Promise<AnalysisJobView>) => {
    if (!view) return;
    setBusy(true);
    try {
      show(await work(view));
      setGeneration((value) => value + 1);
    } catch (error) {
      setProblem(dockmindErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const seek = (seconds: number) => {
    if (!video.current) return;
    video.current.currentTime = seconds;
    void video.current.play().catch(() => undefined);
  };

  if (!view) {
    return <section className={s.status} aria-busy="true">{problem ?? t("Consultando el análisis…", "Loading the analysis…")}</section>;
  }
  const result = view.result;
  const overlay = overlayFor && overlayFor.attempt === view.attempt ? overlayFor.url : null;
  const delivery = deliveryLabel(view, t);
  return (
    <section className={s.status} aria-busy={shouldPoll(view)}>
      <header className={s.statusHeader}>
        <span className={s.chip} data-status={view.status} data-observation={result?.observationStatus ?? ""}>{statusLabel(view, t)}</span>
        {view.attempt > 1 && <span className={s.muted}>{t(`Intento ${view.attempt}`, `Attempt ${view.attempt}`)}</span>}
        {view.retryable && canOperate && (
          <button type="button" className={s.secondary} onClick={() => void act((current) => api.retry(current.jobId, current.attempt))} disabled={busy} aria-busy={busy}>
            <RefreshCw size={15} aria-hidden="true" />{t("Reintentar análisis", "Retry analysis")}
          </button>
        )}
      </header>
      {problem && <p className={s.warning} role="status">{t("No se pudo actualizar; se muestra el último dato.", "Could not refresh; showing the last data.")} {problem}</p>}
      {view.error && <p className={s.warning}>{view.error.code}: {view.error.message}</p>}
      {delivery && (
        <p className={s.delivery} data-delivery={view.delivery.status}>
          {delivery}
          {view.delivery.status === "PENDING" && canOperate && (
            <button type="button" className={s.secondary} onClick={() => void act((current) => api.recoverDelivery(current.jobId, current.attempt))} disabled={busy} aria-busy={busy}>
              <Send size={15} aria-hidden="true" />{t("Registrar observación", "Record observation")}
            </button>
          )}
        </p>
      )}
      {result && (
        <>
          <dl className={s.counts}>
            <div><dt>{t("Entran", "In")}</dt><dd>{result.entries}</dd></div>
            <div><dt>{t("Salen", "Out")}</dt><dd>{result.exits}</dd></div>
            <div><dt>{t("Neto observado", "Net observed")}</dt><dd>{result.net} <small>{result.unit}</small></dd></div>
          </dl>
          {sourceNotices(view, t).map((notice) => <p key={notice} className={s.notice}>{notice}</p>)}
          {result.flags.length > 0 && (
            <ul className={s.flags}>
              {result.flags.map((flag, index) => (
                <li key={`${flag.kind}-${flag.seconds}-${index}`}>
                  <button type="button" className={s.link} onClick={() => seek(flag.seconds)} disabled={!overlay}>
                    {formatSeconds(flag.seconds)}
                  </button>{" "}
                  {flagLabel(flag.kind, t)}
                </li>
              ))}
            </ul>
          )}
          {(view.overlayStatus === "MISSING" || view.overlayStatus === "MISMATCH") && (
            <p className={s.warning}>{t("El video anotado de este intento no se pudo verificar; no se muestra.", "This attempt's annotated video could not be verified; it is not shown.")}</p>
          )}
          {result.overlayUploaded && !overlay && (
            <button type="button" className={s.secondary} onClick={() => { const attempt = view.attempt; void api.overlayUrl(view.jobId).then((r) => setOverlayFor({attempt, url: r.url})).catch((e) => setProblem(dockmindErrorMessage(e))); }}>
              <Video size={15} aria-hidden="true" />{t("Ver video anotado", "Show annotated video")}
            </button>
          )}
          {overlay && (
            <video ref={video} className={s.overlayVideo} src={overlay} controls preload="metadata" playsInline>
              {t("Tu navegador no reproduce este video.", "Your browser cannot play this video.")}
            </video>
          )}
        </>
      )}
    </section>
  );
}
