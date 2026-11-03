"use client";
import {useRef, useState} from "react";
import {Crosshair, RotateCcw} from "lucide-react";
import {useLocale} from "@/features/i18n/locale-provider";
import {CENTER_DRAFT, EMPTY_DRAFT, addClick, nextStep, toFraction, validateDraft, type DockMindLine, type LineDraft, type Point} from "./line-model";
import s from "./dockmind.module.css";

/**
 * El operador marca sobre el primer cuadro del clip los dos extremos de la línea de cruce
 * (por ejemplo, el ancho de la puerta) y luego un punto del lado de adentro.
 * Devuelve la línea en fracciones del cuadro, lista para `config.line` del job DockMind.
 */
export function DockMindLinePicker({clipUrl, onChange}: {clipUrl: string; onChange: (line: DockMindLine | null) => void}) {
  const {t} = useLocale();
  const frame = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<LineDraft>(EMPTY_DRAFT);
  const [aspect, setAspect] = useState(16 / 9);
  const check = validateDraft(draft, aspect);
  const step = nextStep(draft);

  const update = (next: LineDraft, nextAspect = aspect) => {
    setDraft(next);
    const result = validateDraft(next, nextAspect);
    onChange(result.ok ? result.line : null);
  };

  const prompt = {
    start: t("Haz clic en un extremo de la línea de cruce, por ejemplo un borde de la puerta.", "Click one end of the crossing line, for example one edge of the door."),
    end: t("Haz clic en el otro extremo.", "Click the other end."),
    inside: t("Haz clic del lado de adentro del camión.", "Click on the inside of the truck."),
    done: t("Línea lista. Un clic nuevo empieza otra.", "Line ready. A new click starts another one."),
  }[step];
  const problem = !check.ok && check.reason === "LINE_TOO_SHORT"
    ? t("La línea es muy corta: cubre todo el ancho de la puerta.", "The line is too short: cover the whole door width.")
    : !check.ok && check.reason === "INSIDE_ON_LINE"
      ? t("Marca el lado de adentro más lejos de la línea.", "Mark the inside farther from the line.")
      : null;

  const dot = (point: Point | null, kind: "end" | "inside") => point && (
    <span className={s.dot} data-kind={kind} style={{left: `${point.x * 100}%`, top: `${point.y * 100}%`}} />
  );

  return (
    <figure className={s.picker}>
      <div
        ref={frame}
        className={s.frame}
        style={{aspectRatio: String(aspect)}}
        aria-label={t("Primer cuadro del clip para marcar la línea de cruce", "First clip frame to mark the crossing line")}
        onClick={(event) => {
          const rect = frame.current?.getBoundingClientRect();
          if (rect) update(addClick(draft, toFraction(event.clientX, event.clientY, rect)));
        }}
      >
        <video
          className={s.video}
          src={clipUrl}
          muted
          playsInline
          preload="metadata"
          onLoadedMetadata={(event) => {
            const video = event.currentTarget;
            video.currentTime = 0;
            if (video.videoWidth && video.videoHeight) {
              const nextAspect = video.videoWidth / video.videoHeight;
              setAspect(nextAspect);
              update(draft, nextAspect);
            }
          }}
        />
        <svg className={s.overlay} viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
          {draft.start && draft.end && (
            <line x1={draft.start.x} y1={draft.start.y} x2={draft.end.x} y2={draft.end.y} className={s.crossing} vectorEffect="non-scaling-stroke" />
          )}
        </svg>
        {dot(draft.start, "end")}
        {dot(draft.end, "end")}
        {dot(draft.inside, "inside")}
        {draft.inside && <span className={s.insideLabel} style={{left: `${draft.inside.x * 100}%`, top: `${draft.inside.y * 100}%`}}>{t("adentro", "inside")}</span>}
      </div>
      <figcaption className={s.caption}>
        <span aria-live="polite">{prompt}</span>
        {problem && <span className={s.warning} role="alert">{problem}</span>}
        <span className={s.actions}>
          <button type="button" className={s.secondary} onClick={() => update(CENTER_DRAFT)}>
            <Crosshair size={15} aria-hidden="true" />{t("Línea vertical al centro", "Vertical line at the center")}
          </button>
          <button type="button" className={s.secondary} onClick={() => update(EMPTY_DRAFT)}>
            <RotateCcw size={15} aria-hidden="true" />{t("Reiniciar", "Reset")}
          </button>
        </span>
      </figcaption>
    </figure>
  );
}
