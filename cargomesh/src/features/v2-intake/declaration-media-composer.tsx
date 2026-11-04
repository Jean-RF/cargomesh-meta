"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Camera, FileAudio, Mic, Plus, ScanLine, X } from "lucide-react";
import { useOptionalIntakeSession } from "./intake-session";
import styles from "./declaration-media.module.css";

export function DeclarationMediaButton({ disabled, onReview }: {
  disabled: boolean; onReview: () => void;
}) {
  const session = useOptionalIntakeSession();
  const [open, setOpen] = useState(false);
  const id = useId();
  const host = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const photo = useRef<HTMLInputElement>(null), labelInput = useRef<HTMLInputElement>(null), audio = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const reveal = () => setOpen(true);
    window.addEventListener("cargomesh:open-media", reveal);
    return () => window.removeEventListener("cargomesh:open-media", reveal);
  }, []);
  useEffect(() => {
    if (!open) return;
    (menu.current?.querySelector<HTMLButtonElement>('button:not(:disabled)') ?? menu.current)?.focus();
    const outside = (event: PointerEvent) => { if (!host.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  if (!session) return null;
  const { media: m, t } = session;
  const count = m.items.length;
  const blocked = disabled || m.busy || m.recording || m.requestingMic || count >= 4;
  const label = session.t("Adjuntar foto, etiqueta o audio", "Attach photo, label or audio");
  const upload = (file: File | undefined, kind: "photo" | "label" | "audio") => {
    if (!file) return;
    onReview();
    void m.upload(kind === "audio" ? new File([file], file.name, { type: "audio/wav" }) : file, kind);
  };
  const onMenuKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus(); return; }
    if (event.key === "Tab") { setOpen(false); return; }
    const buttons = [...(menu.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])];
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === "ArrowDown" ? (index + 1) % buttons.length : event.key === "ArrowUp" ? (index - 1 + buttons.length) % buttons.length : event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : null;
    if (next !== null && buttons.length) { event.preventDefault(); buttons[next]?.focus(); }
  };
  const pick = (input: HTMLInputElement | null) => { setOpen(false); input?.click(); };
  return <div ref={host} className={styles.menuHost}>
    <button ref={trigger} type="button" className={styles.attachButton} disabled={disabled}
      aria-label={label} title={label} aria-haspopup="menu" aria-expanded={open} aria-controls={id}
      onClick={() => setOpen(value => !value)} onKeyDown={event => { if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); } }}>
      <Plus size={19} aria-hidden="true"/>{count > 0 && <span className={styles.attachCount}>{count}</span>}
    </button>
    {open && <div ref={menu} id={id} className={styles.attachMenu} role="menu" tabIndex={-1} aria-label={t("Añadir al mensaje", "Add to message")} onKeyDown={onMenuKey}>
      <button type="button" role="menuitem" className={styles.menuOption} disabled={blocked} onClick={() => pick(photo.current)}><Camera size={18} aria-hidden="true"/><span>{t("Foto de la carga", "Cargo photo")}<small>PNG / JPG</small></span></button>
      <button type="button" role="menuitem" className={styles.menuOption} disabled={blocked} onClick={() => pick(labelInput.current)}><ScanLine size={18} aria-hidden="true"/><span>{t("Etiqueta con datos", "Printed label")}<small>{t("Texto y medidas impresas", "Printed text and dimensions")}</small></span></button>
      <button type="button" role="menuitem" className={styles.menuOption} disabled={blocked} onClick={() => pick(audio.current)}><FileAudio size={18} aria-hidden="true"/><span>{t("Archivo de audio", "Audio file")}<small>WAV</small></span></button>
      <button type="button" role="menuitem" className={styles.menuOption} disabled={blocked} onClick={() => { setOpen(false); onReview(); void m.startRecording(); }}><Mic size={18} aria-hidden="true"/><span>{t("Grabar nota de voz", "Record voice note")}<small>{t("Hasta 60 segundos", "Up to 60 seconds")}</small></span></button>
      <button type="button" role="menuitem" className={styles.menuOption} disabled={disabled||m.busy||m.recording} onClick={()=>{setOpen(false);window.dispatchEvent(new Event('cargomesh:packing-list'));}}><ScanLine size={18}/><span>Packing list PDF<small>{t('Extraer grupos para revisar','Extract groups for review')}</small></span></button>
      <p className={styles.menuLimits}>{t("Hasta 4 archivos. Imágenes: 5 MB cada una, 12 MB en total. WAV: 30 MB.", "Up to 4 files. Images: 5 MB each, 12 MB combined. WAV: 30 MB.")}</p>
    </div>}
    <input ref={photo} type="file" accept="image/png,image/jpeg" hidden disabled={blocked} aria-label={t("Elegir foto de carga", "Choose cargo photo")} onChange={event => { upload(event.currentTarget.files?.[0], "photo"); event.currentTarget.value = ""; }}/>
    <input ref={labelInput} type="file" accept="image/png,image/jpeg" hidden disabled={blocked} aria-label={t("Elegir etiqueta", "Choose printed label")} onChange={event => { upload(event.currentTarget.files?.[0], "label"); event.currentTarget.value = ""; }}/>
    <input ref={audio} type="file" accept="audio/wav,.wav" hidden disabled={blocked} aria-label={t("Elegir audio WAV", "Choose WAV audio")} onChange={event => { upload(event.currentTarget.files?.[0], "audio"); event.currentTarget.value = ""; }}/>
  </div>;
}

/** File names come from the existing intake session; opening them keeps its review controls. */
export function DeclarationMediaChips({ onOpen }: { onOpen: () => void }) {
  const session = useOptionalIntakeSession();
  if (!session || !session.media.items.length) return null;
  return <ul className={styles.chips} aria-label={session.t("Adjuntos del borrador", "Draft attachments")}>
    {session.media.items.map(item => <li key={item.id}><button type="button" onClick={onOpen}
      title={item.fileName} aria-label={session.t(`Revisar ${item.fileName}`, `Review ${item.fileName}`)}>
      {item.kind === "audio" ? <FileAudio size={14} aria-hidden="true"/> : <Camera size={14} aria-hidden="true"/>}
      <span>{item.fileName}</span>{item.state === "PENDING" && <small>{session.t("Pendiente", "Pending")}</small>}
    </button><button type="button" className={styles.removeChip} disabled={session.media.busy || session.media.recording || session.media.requestingMic || ["creating", "revising", "reading", "evaluating"].includes(session.submitPhase)}
      aria-label={session.t(`Quitar ${item.fileName}`, `Remove ${item.fileName}`)} onClick={() => void session.media.remove(item.id)}><X size={12} aria-hidden="true"/></button></li>)}
  </ul>;
}
