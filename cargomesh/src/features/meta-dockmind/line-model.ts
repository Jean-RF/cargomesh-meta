import type {z} from "zod";
import {DockMindLineSchema} from "@/shared/schemas/meta/dockmind";

/** Punto en fracciones del cuadro (0 a 1), independiente de la resolución del clip. */
export type Point = {x: number; y: number};
export type DockMindLine = z.infer<typeof DockMindLineSchema>;
export type LineDraft = {start: Point | null; end: Point | null; inside: Point | null};
export type LineStep = "start" | "end" | "inside" | "done";
export type LineCheck = {ok: true; line: DockMindLine} | {ok: false; reason: "INCOMPLETE" | "LINE_TOO_SHORT" | "INSIDE_ON_LINE"};

export const EMPTY_DRAFT: LineDraft = {start: null, end: null, inside: null};
/** Línea vertical al centro con el camión a la derecha: un punto de partida razonable. */
export const CENTER_DRAFT: LineDraft = {start: {x: 0.5, y: 0.05}, end: {x: 0.5, y: 0.95}, inside: {x: 0.8, y: 0.5}};

const MIN_LENGTH = 0.05; // en alturas de cuadro
const MIN_INSIDE_DISTANCE = 0.02;

const round = (value: number) => Math.round(Math.min(1, Math.max(0, value)) * 10_000) / 10_000;

export function toFraction(clientX: number, clientY: number, rect: {left: number; top: number; width: number; height: number}): Point {
  return {x: round((clientX - rect.left) / rect.width), y: round((clientY - rect.top) / rect.height)};
}

export function nextStep(draft: LineDraft): LineStep {
  if (!draft.start) return "start";
  if (!draft.end) return "end";
  if (!draft.inside) return "inside";
  return "done";
}

/** Primer clic: un extremo. Segundo: el otro extremo. Tercero: el lado de adentro. Un cuarto clic empieza de nuevo. */
export function addClick(draft: LineDraft, point: Point): LineDraft {
  switch (nextStep(draft)) {
    case "start": return {...draft, start: point};
    case "end": return {...draft, end: point};
    case "inside": return {...draft, inside: point};
    default: return {start: point, end: null, inside: null};
  }
}

/** Valida en unidades de altura del cuadro, para que una línea corta lo sea igual en clips anchos o verticales. */
export function validateDraft(draft: LineDraft, aspect: number): LineCheck {
  const {start, end, inside} = draft;
  if (!start || !end || !inside) return {ok: false, reason: "INCOMPLETE"};
  const dx = (end.x - start.x) * aspect;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length < MIN_LENGTH) return {ok: false, reason: "LINE_TOO_SHORT"};
  const distance = Math.abs(dx * (inside.y - start.y) - dy * (inside.x - start.x) * aspect) / length;
  if (distance < MIN_INSIDE_DISTANCE) return {ok: false, reason: "INSIDE_ON_LINE"};
  const line = DockMindLineSchema.parse({x1: start.x, y1: start.y, x2: end.x, y2: end.y, inside_x: inside.x, inside_y: inside.y});
  return {ok: true, line};
}
