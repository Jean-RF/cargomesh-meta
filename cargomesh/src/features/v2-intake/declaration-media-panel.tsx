"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Camera, Mic, Paperclip, Square, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui";
import { useOptionalIntakeSession } from "./intake-session";
import { mediaFieldNames, selectedMediaFields } from "./media-draft-model";
import styles from "./declaration-media.module.css";
const names: Record<string, [string, string]> = {
  cargoDescription: ["Descripción", "Description"],
  unitType: ["Embalaje", "Packaging"],
  unitQuantity: ["Cantidad", "Quantity"],
  unitWeightKg: ["Peso por unidad (kg)", "Weight per unit (kg)"],
  unitLengthCm: ["Largo (cm)", "Length (cm)"],
  unitWidthCm: ["Ancho (cm)", "Width (cm)"],
  unitHeightCm: ["Alto (cm)", "Height (cm)"],
  handlingRequirements: ["Requisitos de manejo", "Handling requirements"],
};
export function DeclarationMediaPanel() {
  const session = useOptionalIntakeSession(),
    id = useId(),
    details = useRef<HTMLDetailsElement>(null),
    [kind, setKind] = useState<"photo" | "label">("photo"),
    [text, setText] = useState("");
  const latest = useRef(session);
  latest.current = session;
  useEffect(() => () => latest.current?.media.cancelRecording(), []);
  useEffect(() => {
    const open = () => {
      if (details.current) {
        details.current.open = true;
        details.current.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    };
    window.addEventListener("cargomesh:open-media", open);
    return () => window.removeEventListener("cargomesh:open-media", open);
  }, []);
  if (!session) return null;
  const { media: m, t, locale } = session,
    disabled =
      m.busy ||
      m.recording ||
      m.requestingMic ||
      ["creating", "revising", "reading", "evaluating"].includes(
        session.submitPhase,
      );
  const label = (name: string) =>
    (names[name] ?? [name, name])[locale === "es" ? 0 : 1];
  return (
    <details
      name="cargomesh-draft-context"
      className={styles.panel}
      ref={details}
      onToggle={(e) => {
        if (!e.currentTarget.open) m.cancelRecording();
      }}
    >
      <summary>
        <span>
          <Paperclip size={17} />
          {t("Fotos y notas de voz", "Photos & voice notes")}
        </span>
        <small>
          {m.items.length ? `${m.items.length}/4` : t("Añadir", "Add")}
        </small>
      </summary>
      <div className={styles.body}>
        <p>
          {t(
            "Adjunta una foto, etiqueta o nota de voz. Revisa la propuesta antes de aplicarla a esta carga.",
            "Attach a photo, label or voice note. Review the proposal before applying it to this cargo.",
          )}
        </p>
        <div className={styles.tools}>
          <label htmlFor={id + "-kind"}>
            {t("La imagen es", "Image type")}
            <select
              id={id + "-kind"}
              value={kind}
              disabled={disabled}
              onChange={(e) => setKind(e.target.value as "photo" | "label")}
            >
              <option value="photo">
                {t("Foto de la carga", "Cargo photo")}
              </option>
              <option value="label">
                {t("Etiqueta con datos", "Printed label")}
              </option>
            </select>
          </label>
          <label className={styles.file}>
            <Camera size={16} />
            {t("Adjuntar imagen", "Attach image")}
            <input
              aria-label={t("Adjuntar imagen", "Attach image")}
              type="file"
              accept="image/png,image/jpeg"
              disabled={disabled || m.items.length >= 4}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void m.upload(f, kind);
              }}
            />
          </label>
          <label className={styles.file}>
            <Paperclip size={16} />
            {t("Adjuntar WAV", "Attach WAV")}
            <input
              aria-label={t("Adjuntar audio WAV", "Attach WAV audio")}
              type="file"
              accept="audio/wav,.wav"
              disabled={disabled || m.items.length >= 4}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f)
                  void m.upload(
                    new File([f], f.name, { type: "audio/wav" }),
                    "audio",
                  );
              }}
            />
          </label>
          <Button
            type="button"
            size="compact"
            variant="secondary"
            disabled={
              m.busy ||
              m.requestingMic ||
              (!m.recording && disabled) ||
              (!m.recording && m.items.length >= 4)
            }
            onClick={() =>
              m.recording ? m.stopRecording() : void m.startRecording()
            }
          >
            {m.recording ? <Square size={15} /> : <Mic size={15} />}{" "}
            {m.recording
              ? t(`Detener · ${m.seconds}s`, `Stop · ${m.seconds}s`)
              : m.requestingMic
                ? t("Abriendo micrófono…", "Opening microphone…")
                : t("Grabar voz", "Record voice")}
          </Button>
        </div>
        <small>
          {t(
            "Hasta 4 adjuntos y una nota de voz. PNG/JPG: 5 MB por imagen, 12 MB en total. WAV mono: 30 MB. Grabación: hasta 60 s.",
            "Up to 4 attachments and one voice note. PNG/JPG: 5 MB each, 12 MB combined. Mono WAV: 30 MB. Recording: up to 60 s.",
          )}
        </small>
        {m.items.length > 0 && (
          <ul className={styles.files}>
            {m.items.map((f) => (
              <li key={f.id}>
                <span>
                  <strong>{f.fileName}</strong>
                  {f.state === "PENDING" && (
                    <small>
                      {t(
                        "Carga incompleta. Reintenta o selecciona el mismo archivo.",
                        "Upload incomplete. Retry or select the same file again.",
                      )}
                    </small>
                  )}
                  <small>
                    {f.kind === "label"
                      ? t("Etiqueta", "Label")
                      : f.kind === "audio"
                        ? "Audio"
                        : t("Foto", "Photo")}{" "}
                    · {Math.ceil(f.byteSize / 1024)} KB
                  </small>
                  {f.kind === "audio" && f.state === "READY" && (
                    <VoicePreview id={f.id} t={t} />
                  )}
                </span>
                <button
                  type="button"
                  disabled={disabled}
                  aria-label={t(`Quitar ${f.fileName}`, `Remove ${f.fileName}`)}
                  onClick={() => void m.remove(f.id)}
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <label className={styles.context} htmlFor={id + "-context"}>
          {t(
            "Aclaración o corrección (opcional)",
            "Clarification or correction (optional)",
          )}
          <textarea
            id={id + "-context"}
            rows={2}
            maxLength={6000}
            value={text}
            disabled={disabled}
            onChange={(e) => {
              setText(e.target.value);
              m.discard();
            }}
            placeholder={t(
              "Ej.: son 3 cajas, no 4.",
              "E.g. there are 3 boxes, not 4.",
            )}
          />
        </label>
        <Button
          type="button"
          size="compact"
          disabled={disabled || !m.items.some((item) => item.state === "READY")}
          isLoading={m.busy}
          loadingLabel={t("Procesando…", "Processing…")}
          onClick={() => void m.analyze(text, locale === "es" ? "es" : "en")}
        >
          <Sparkles size={15} />
          {t("Analizar adjuntos", "Analyze attachments")}
        </Button>
        {m.error && (
          <p className={styles.error} role="alert">
            {m.error}
          </p>
        )}
        {m.canRetryUpload && (
          <Button type="button" variant="secondary" size="compact" disabled={disabled} onClick={() => void m.retryUpload()}>
            {t("Reintentar carga", "Retry upload")}
          </Button>
        )}
        {m.notice && (
          <p className={styles.notice} role="status">
            {m.notice}
          </p>
        )}
        {m.analysis && (
          <section
            className={styles.review}
            aria-label={t(
              "Revisar datos reconocidos",
              "Review recognized details",
            )}
          >
            <h4>{t("Propuesta para revisar", "Proposal to review")}</h4>
            <p>
              {t(
                "Se aplicará al primer grupo de carga del formulario. Puedes corregir los valores allí después.",
                "Applies to the first cargo group in the form. You can edit the values there afterwards.",
              )}
            </p>
            {m.analysis.proposal.fields
              .filter((f) => f.field === "handlingRequirements")
              .map((f) => (
                <p key={f.field}>
                  {t("Indicaciones detectadas", "Detected instructions")}:{" "}
                  {(f.value as string[]).join(", ")}.{" "}
                  {t(
                    "Revisa los requisitos del formulario.",
                    "Review the requirements in the form.",
                  )}
                </p>
              ))}
            {m.analysis.transcripts.map((a) => (
              <div className={styles.transcript} key={a.evidenceId}>
                <strong>{t("Transcripción", "Transcript")}</strong>
                <p>{a.text}</p>
              </div>
            ))}
            {m.analysis.proposal.fields
              .filter((f) => mediaFieldNames[f.field])
              .map((f) => (
                <label className={styles.field} key={f.field}>
                  <input
                    type="checkbox"
                    checked={m.selected.has(f.field)}
                    onChange={(e) => {
                      const next = new Set(m.selected);
                      e.target.checked
                        ? next.add(f.field)
                        : next.delete(f.field);
                      m.setSelected(next);
                      m.setReviewed(false);
                    }}
                  />
                  <span>
                    {label(f.field)}
                    <strong>{String(f.value)}</strong>
                    <small>
                      {f.provenance.source === "label"
                        ? t("Etiqueta no verificada", "Unverified label")
                        : f.provenance.source === "photo"
                          ? t("Visible en la foto", "Visible in photo")
                          : t("Texto o transcripción", "Text or transcript")}
                    </small>
                  </span>
                </label>
              ))}
            {selectedMediaFields(m.analysis.proposal, m.selected)
              .filter((field) => field.field === "unitVolumePerUnitM3")
              .map((field) => (
                <p key={field.field}>
                  {t(
                    "Volumen por unidad calculado con las tres medidas seleccionadas",
                    "Volume per unit calculated from the three selected dimensions",
                  )}
                  : <strong>{field.value} m³</strong>.
                </p>
              ))}
            {m.analysis.proposal.warnings.includes("VISIBLE_COUNT_ONLY") && (
              <p>
                {t(
                  "El conteo incluye solo las unidades visibles. Confirma que corresponde a tu carga.",
                  "The count covers visible units only. Confirm that it represents your cargo.",
                )}
              </p>
            )}
            {m.analysis.proposal.warnings.includes("NO_SCALE") && (
              <p>
                {t(
                  "La foto no permite conocer el peso ni las medidas.",
                  "The photo cannot establish weight or dimensions.",
                )}
              </p>
            )}
            {!!m.analysis.proposal.missingFields.length && (
              <p>
                {t("Pendiente", "Still needed")}:{" "}
                {m.analysis.proposal.missingFields.map(label).join(", ")}.
              </p>
            )}
            {!m.analysis.proposal.fields.length && (
              <p>
                {t(
                  "No hay datos legibles para aplicar. Prueba otra imagen o completa el formulario.",
                  "No readable details to apply. Try another image or complete the form.",
                )}
              </p>
            )}
            <label className={styles.consent}>
              <input
                type="checkbox"
                checked={m.reviewed}
                onChange={(e) => m.setReviewed(e.target.checked)}
              />
              {t(
                "Revisé los datos seleccionados.",
                "I reviewed the selected details.",
              )}
            </label>
            <div className={styles.tools}>
              <Button
                type="button"
                size="compact"
                disabled={
                  disabled ||
                  !m.reviewed ||
                  !m.analysis.proposal.fields.some(
                    (f) => mediaFieldNames[f.field] && m.selected.has(f.field),
                  )
                }
                onClick={m.confirm}
              >
                {t("Aplicar al borrador", "Apply to draft")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="compact"
                onClick={m.discard}
              >
                {t("Descartar propuesta", "Discard proposal")}
              </Button>
            </div>
          </section>
        )}
      </div>
    </details>
  );
}
function VoicePreview({
  id,
  t,
}: {
  id: string;
  t: (es: string, en: string) => string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={styles.audioPreview}>
      <audio
        controls
        preload="none"
        aria-label={t("Escuchar nota de voz", "Listen to voice note")}
        src={"/api/v2/declaration-media/audio?id=" + encodeURIComponent(id)}
        onError={() => setFailed(true)}
        onCanPlay={() => setFailed(false)}
      />
      {failed && (
        <small role="alert">
          {t(
            "No se pudo reproducir el audio. Recarga los adjuntos e intenta de nuevo.",
            "Audio could not be played. Reload attachments and try again.",
          )}
        </small>
      )}
    </div>
  );
}
