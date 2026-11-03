"use client";
import {useCallback, useEffect, useRef, useState} from "react";
import {Play, Upload} from "lucide-react";
import {useLocale} from "@/features/i18n/locale-provider";
import type {LoadingSession} from "@/shared/schemas/meta/loading-operation";
import type {AnalysisJobView, ClipView} from "@/server/modules/analysis-jobs/view";
import {dockmindApi, dockmindErrorMessage, type DockMindApi} from "./dockmind-api";
import {DockMindJobStatus} from "./job-status";
import {DockMindLinePicker} from "./line-picker";
import type {DockMindLine} from "./line-model";
import s from "./dockmind.module.css";

const MAX_BYTES = 50 * 1024 * 1024;
const CONCEPT = {PALLET: "wooden pallet", BOX: "cardboard box"} as const;

/**
 * Evidencia de video para el slot `evidenceContent` del dashboard de Juan: subir un clip privado, marcar la línea,
 * iniciar el análisis, seguir su estado y recuperar una entrega pendiente. El resultado aparece en las
 * observaciones de la sesión de Juan; este panel no tiene otro modelo de dashboard.
 */
export function DockMindEvidencePanel({session, canOperate, onObservationRecorded, api = dockmindApi}: {
  session: Pick<LoadingSession, "id" | "state" | "mode" | "groups">;
  canOperate: boolean;
  onObservationRecorded: () => void;
  api?: DockMindApi;
}) {
  const {t} = useLocale();
  const [clips, setClips] = useState<ClipView[]>([]);
  const [jobs, setJobs] = useState<AnalysisJobView[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState<"OWN_CAPTURE" | "SYNTHETIC_RENDER">("OWN_CAPTURE");
  const [clipId, setClipId] = useState("");
  const [clipUrl, setClipUrl] = useState<string | null>(null);
  const [line, setLine] = useState<DockMindLine | null>(null);
  const [groupId, setGroupId] = useState(session.groups[0]?.id ?? "");
  const [coverage, setCoverage] = useState<"PARTIAL" | "COMPLETE">("PARTIAL");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // La misma subida reintentada conserva su clave: el servidor devuelve el mismo clip.
  const intent = useRef<{signature: string; key: string} | null>(null);
  const open = session.state === "OPEN" && canOperate;
  const group = session.groups.find((g) => g.id === groupId);

  const load = useCallback(async () => {
    const [c, j] = await Promise.all([api.clips(session.id), api.jobs(session.id)]);
    setClips(c);
    setJobs(j);
    setClipId((current) => current || c.find((clip) => clip.state === "READY")?.clipId || "");
  }, [api, session.id]);

  useEffect(() => {
    void load().catch((e) => setError(dockmindErrorMessage(e)));
  }, [load]);

  useEffect(() => {
    let active = true;
    setClipUrl(null);
    setLine(null);
    if (clipId) void api.clipUrl(clipId).then((r) => active && setClipUrl(r.url)).catch((e) => active && setError(dockmindErrorMessage(e)));
    return () => {
      active = false;
    };
  }, [api, clipId]);

  async function run(work: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
    } catch (e) {
      setError(dockmindErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function upload() {
    if (!file) return;
    const signature = JSON.stringify([file.name, file.size, file.lastModified, source, session.id]);
    if (intent.current?.signature !== signature) intent.current = {signature, key: crypto.randomUUID()};
    const clip = await api.upload(session.id, file, source, intent.current.key);
    intent.current = null;
    await load();
    setClipId(clip.clipId);
    setFile(null);
    setNotice(t("Clip verificado: tamaño, hash y formato coinciden. Marca la línea de cruce.", "Clip verified: size, hash and format match. Mark the crossing line."));
  }

  async function start() {
    if (!line || !group) return;
    await api.start({sessionId: session.id, evidenceId: clipId, groupId: group.id, coverage, config: {line, unit: group.unit, concept: CONCEPT[group.unit]}});
    await load();
    setNotice(t("Análisis enviado. El estado se actualiza cada 3 segundos.", "Analysis sent. The status refreshes every 3 seconds."));
  }

  const tooLarge = file !== null && file.size > MAX_BYTES;
  return (
    <section className={s.panel} aria-labelledby="dockmind-title" aria-busy={busy}>
      <div className={s.panelTitle}>
        <div>
          <h2 id="dockmind-title">{t("Evidencia de video", "Video evidence")}</h2>
          <p>{session.mode === "DEMO"
            ? t("Demostración: puedes usar un render sintético; queda rotulado y nunca pasa por cámara real.", "Demo: you may use a synthetic render; it stays labelled and never passes as a real camera.")
            : t("Verificación: solo captura propia y conteo con inferencia real de SAM.", "Verification: own capture only, counted with real SAM inference.")}</p>
        </div>
      </div>
      {error && <p className={s.warning} role="alert">{error}</p>}
      {notice && <p className={s.notice} role="status">{notice}</p>}

      {open && (
        <form className={s.step} onSubmit={(e) => { e.preventDefault(); void run(upload); }}>
          <h3>{t("1. Subir clip", "1. Upload a clip")}</h3>
          <div className={s.row}>
            <label>{t("Archivo MP4 o MOV, hasta 50 MB", "MP4 or MOV file, up to 50 MB")}
              <input type="file" accept="video/mp4,video/quicktime" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            <label>{t("Procedencia", "Source")}
              <select value={source} onChange={(e) => setSource(e.target.value as typeof source)}>
                <option value="OWN_CAPTURE">{t("Captura propia", "Own capture")}</option>
                {session.mode === "DEMO" && <option value="SYNTHETIC_RENDER">{t("Render sintético", "Synthetic render")}</option>}
              </select>
            </label>
          </div>
          {tooLarge && <p className={s.warning}>{t("El archivo supera 50 MB.", "The file exceeds 50 MB.")}</p>}
          <button type="submit" className={s.primary} disabled={busy || !file || tooLarge}><Upload size={15} aria-hidden="true" />{t("Subir y verificar", "Upload and verify")}</button>
        </form>
      )}

      {clips.length > 0 && (
        <div className={s.step}>
          <h3>{t("Clips de la sesión", "Session clips")}</h3>
          <ul className={s.clips}>
            {clips.map((clip) => (
              <li key={clip.clipId}>
                <label>
                  <input type="radio" name="dockmind-clip" value={clip.clipId} checked={clipId === clip.clipId} disabled={clip.state !== "READY"} onChange={() => setClipId(clip.clipId)} />
                  <span>{new Date(clip.createdAt).toLocaleString("es-PE")} · {clip.source === "OWN_CAPTURE" ? t("captura propia", "own capture") : t("sintético", "synthetic")} · {(clip.sizeBytes / 1_048_576).toFixed(1)} MB</span>
                  <small data-state={clip.state}>{clip.state === "READY" ? t("verificado", "verified") : clip.state === "PENDING" ? t("subida pendiente", "upload pending") : t(`rechazado: ${clip.rejection}`, `rejected: ${clip.rejection}`)}</small>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      {open && clipId && (
        <form className={s.step} onSubmit={(e) => { e.preventDefault(); void run(start); }}>
          <h3>{t("2. Marcar la línea y analizar", "2. Mark the line and analyze")}</h3>
          {clipUrl ? <DockMindLinePicker clipUrl={clipUrl} onChange={setLine} /> : <p className={s.muted}>{t("Preparando el clip…", "Preparing the clip…")}</p>}
          <div className={s.row}>
            <label>{t("Grupo del manifiesto", "Manifest group")}
              <select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                {session.groups.map((g) => <option key={g.id} value={g.id}>{g.label} · {g.unit === "PALLET" ? t("pallets", "pallets") : t("cajas", "boxes")}</option>)}
              </select>
            </label>
            <label>{t("El clip muestra", "The clip shows")}
              <select value={coverage} onChange={(e) => setCoverage(e.target.value as typeof coverage)}>
                <option value="PARTIAL">{t("Parte del grupo", "Part of the group")}</option>
                <option value="COMPLETE">{t("Todo el grupo", "The whole group")}</option>
              </select>
            </label>
          </div>
          <button type="submit" className={s.primary} disabled={busy || !line || !group}><Play size={15} aria-hidden="true" />{t("Iniciar análisis", "Start analysis")}</button>
        </form>
      )}

      {jobs.length > 0 && (
        <div className={s.step}>
          <h3>{t("Análisis", "Analyses")}</h3>
          {jobs.slice(0, 5).map((job) => (
            <DockMindJobStatus key={`${job.jobId}-${job.attempt}`} jobId={job.jobId} canOperate={canOperate} api={api} onDelivered={onObservationRecorded} />
          ))}
        </div>
      )}
    </section>
  );
}
