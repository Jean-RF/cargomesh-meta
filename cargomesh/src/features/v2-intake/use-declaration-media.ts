"use client";
import { useEffect, useRef, useState } from "react";
import {
  MediaAnalysisSchema,
  MediaInitResultSchema,
  MediaInitSchema,
  MediaItemSchema,
  type MediaItem,
  type MediaAnalysis,
} from "@/shared/schemas/meta/declaration-media";
import {
  mediaDraftFingerprint,
  selectedMediaFields,
} from "./media-draft-model";
import type { V2IntakePrototypeDraft } from "./prototype-model";
import type { FreightRequestV2Data } from "./contracts";
import type { ConversationField } from "./conversation-fields";
import {needsExplicitCargoGroup,cargoGroupHelp} from './assistant-group-scope';
export async function mediaCommand(action: string, body: unknown) {
  const reply = await fetch("/api/v2/declaration-media/" + action, {
    method: "POST",
    credentials: "same-origin",
    signal: AbortSignal.timeout(58000),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await reply.json().catch(() => null);
  if (!reply.ok || !json || json.schemaVersion !== "1.0")
    throw new Error(
      json?.error?.message ??
        "No se pudo completar la operación. Intenta de nuevo.",
    );
  return json.data;
}
export function useDeclarationMedia(
  draft: V2IntakePrototypeDraft,
  request: FreightRequestV2Data | null,
  apply: (
    fields: ReadonlyArray<{ field: ConversationField; value: string }>,
  ) => void,
) {
  const retryFile = useRef<{ file: File; kind: "photo" | "label" | "audio" } | null>(null),
    operations = useRef<Record<string, ReturnType<typeof MediaInitSchema.parse>>>({}),
    [canRetryUpload, setCanRetryUpload] = useState(false);
  const key = useRef<string>(""),
    [items, setItems] = useState<MediaItem[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true),
    loadingRef = useRef(true);
  const [analysis, setAnalysis] = useState<MediaAnalysis | null>(null),
    [selected, setSelected] = useState<Set<string>>(new Set()),
    [reviewed, setReviewed] = useState(false);
  const [recording, setRecording] = useState(false),
    [requestingMic, setRequestingMic] = useState(false),
    [seconds, setSeconds] = useState(0);
  const mounted = useRef(true),
    micPending = useRef(false),
    micEpoch = useRef(0),
    previousRequest = useRef(request?.id ?? null);
  const recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const snapshot = mediaDraftFingerprint(draft, request?.id ?? null),
    current = useRef(snapshot);
  current.current = snapshot;
  // The browser-scoped key also survives an immediate reload between native save and media binding.
  function draftKey() {
    if (!key.current) {
      try {
        const saved = window.sessionStorage.getItem(draftStorageSlot());
        if (saved && /^[0-9a-f-]{36}$/i.test(saved)) key.current = saved;
      } catch {}
      if (!key.current) newKey();
    }
    return key.current;
  }
  function draftStorageSlot() {
    const id = requestRef.current?.id;
    return id ? "cargomesh-meta-media-request-key:" + id : "cargomesh-meta-media-draft-key";
  }
  function newKey() {
    key.current = crypto.randomUUID();
    try {
      window.sessionStorage.setItem(draftStorageSlot(), key.current);
    } catch {}
  }
  const scope = () => ({
    draftKey: draftKey(),
    requestId: requestRef.current?.id ?? null,
    requestVersion: requestRef.current?.draftVersion ?? null,
  });
  const acceptedSnapshot = useRef(""),
    sequence = useRef(0),
    lock = useRef(false),
    revision = useRef(0);
  useEffect(() => {
    revision.current++;
    if (analysis && acceptedSnapshot.current !== snapshot) {
      setAnalysis(null);
      setReviewed(false);
      setNotice(
        "El borrador cambió. Analiza de nuevo para revisar datos vigentes.",
      );
    }
  }, [snapshot, analysis]);
  const requestRef = useRef(request);
  requestRef.current = request;
  useEffect(() => {
    let active = true;
    const epoch = ++sequence.current;
    loadingRef.current = true;
    setLoading(true);
    setAnalysis(null);
    setReviewed(false);
    const prior = previousRequest.current,
      next = request?.id ?? null;
    previousRequest.current = next;
    if (prior !== next && prior !== null) {
      operations.current = {};
      retryFile.current = null;
      setCanRetryUpload(false);
      key.current = "";
      if (next === null) newKey();
      setItems([]);
      cancelRecording();
    } else if (prior === null && next !== null && key.current) {
      // First save keeps the original reservation scope, then gives this request
      // its own recovery slot. Another saved request must never bind that scope.
      try {
        window.sessionStorage.setItem(draftStorageSlot(), key.current);
        window.sessionStorage.removeItem("cargomesh-meta-media-draft-key");
      } catch {}
    }
    const capturedScope = scope();
    (async () => {
      try {
        if (request) await mediaCommand("bind", capturedScope);
        const rows = await mediaCommand("list", capturedScope);
        if (active && epoch === sequence.current) {
          setItems(MediaItemSchema.array().parse(rows));
          setError("");
        }
      } catch (e) {
        if (active && epoch === sequence.current)
          setError(
            e instanceof Error
              ? e.message
              : "No se pudieron recuperar los adjuntos.",
          );
      } finally {
        if (active && epoch === sequence.current) {
          loadingRef.current = false;
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [request?.id, request?.draftVersion]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      sequence.current++;
      cancelRecording();
    };
  }, []);
  function persistOperations() {
    try { window.sessionStorage.setItem("cargomesh-media-operations:" + draftKey(), JSON.stringify(operations.current)); } catch {}
  }
  async function uploadOperation(file: File, kind: "photo" | "label" | "audio") {
    const contentSha256 = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await file.arrayBuffer())),
      (byte) => byte.toString(16).padStart(2, "0")).join("");
    const capturedScope = scope();
    const identity = JSON.stringify([capturedScope.draftKey, kind, file.type, file.name, file.size, contentSha256]);
    try {
      const saved = JSON.parse(window.sessionStorage.getItem("cargomesh-media-operations:" + draftKey()) ?? "{}");
      for (const [name, value] of Object.entries(saved)) {
        const parsed = MediaInitSchema.safeParse(value);
        if (parsed.success) operations.current[name] = parsed.data;
      }
    } catch {}
    const input = operations.current[identity] ?? MediaInitSchema.parse({
      ...capturedScope, idempotencyKey: crypto.randomUUID(), contentSha256,
      kind, mimeType: file.type, fileName: file.name, byteSize: file.size,
    });
    operations.current[identity] = input;
    // Save BEFORE the first request: timeout/reload must not allocate another reservation.
    persistOperations();
    return { identity, input };
  }
  async function upload(file: File, kind: "photo" | "label" | "audio") {
    if (lock.current || loadingRef.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    setAnalysis(null);
    setReviewed(false);
    const epoch = sequence.current;
    retryFile.current = { file, kind };
    setCanRetryUpload(false);
    try {
      if (
        (kind === "audio" && file.type !== "audio/wav") ||
        (kind !== "audio" &&
          !["image/png", "image/jpeg"].includes(file.type)) ||
        !file.size ||
        file.size > (kind === "audio" ? 30000000 : 5 * 1024 * 1024)
      )
        throw Error("Usa PNG/JPG de hasta 5 MB o WAV mono de hasta 30 MB.");
      const operation = await uploadOperation(file, kind);
      if (!mounted.current || epoch !== sequence.current) return;
      const prepared = MediaInitResultSchema.parse(await mediaCommand("initialize", operation.input));
      const id = prepared.item.id;
      let ready = prepared.item;
      if (ready.state !== "READY") {
        if (!prepared.uploadUrl) throw Error("No se pudo preparar el adjunto. Reintenta la carga.");
        try {
          const sent = await fetch(prepared.uploadUrl, {
            method: "PUT",
            signal: AbortSignal.timeout(45000),
            headers: { "Content-Type": file.type },
            body: file,
          });
          if (!sent.ok) throw Error("Upload not acknowledged");
        } catch {
          // A lost PUT response can mean the object already exists. finish verifies
          // the original SHA; it never permits an upsert or accepts different bytes.
          ready = MediaItemSchema.parse(await mediaCommand("finish", { id }));
        }
        if (ready.state !== "READY")
          ready = MediaItemSchema.parse(await mediaCommand("finish", { id }));
      }
      delete operations.current[operation.identity];
      persistOperations();
      retryFile.current = null;
      setCanRetryUpload(false);
      if (epoch === sequence.current) {
        setItems((prev) => [...prev.filter((i) => i.id !== id), ready]);
        setNotice("Adjunto listo. Pulsa Analizar para obtener una propuesta.");
      }
    } catch (e) {
      if (mounted.current && epoch === sequence.current) {
        setCanRetryUpload(true);
        // Do not remove a committed reservation after an ambiguous response.
        try {
          const rows = MediaItemSchema.array().parse(await mediaCommand("list", scope()));
          if (mounted.current && epoch === sequence.current) setItems(rows);
        } catch {}
        setError(
          e instanceof Error ? e.message : "No se pudo subir el adjunto.",
        );
      }
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function analyze(text: string, language: "es" | "en") {
    if (lock.current || loadingRef.current || recording || micPending.current)
      return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    setAnalysis(null);
    setReviewed(false);
    const captured = current.current,
      epoch = sequence.current,
      version = revision.current;
    try {
      const result = MediaAnalysisSchema.parse(
        await mediaCommand("analyze", {
          ...scope(),
          inputRevision: version,
          evidenceIds: items
            .filter((i) => i.state === "READY")
            .map((i) => i.id),
          text,
          language,
        }),
      );
      if (!mounted.current || epoch !== sequence.current) return;
      if (captured !== current.current || version !== result.inputRevision) {
        setNotice(
          "Cambiaste el borrador durante el análisis. Se descartó la propuesta anterior.",
        );
        return;
      }
      acceptedSnapshot.current = captured;
      setAnalysis(result);
      setSelected(new Set(result.proposal.fields.map((f) => f.field)));
    } catch (e) {
      if (mounted.current && epoch === sequence.current)
        setError(
          e instanceof Error
            ? e.message
            : "Análisis no disponible. Puedes seguir editando el formulario.",
        );
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function remove(id: string) {
    if (lock.current || loadingRef.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const epoch = sequence.current;
    try {
      await mediaCommand("remove", { id });
      if (epoch === sequence.current) {
        const removed = items.find((i) => i.id === id);
        for (const [name, op] of Object.entries(operations.current))
          if (op.fileName === removed?.fileName && op.kind === removed?.kind && op.byteSize === removed?.byteSize)
            delete operations.current[name];
        persistOperations();
        const pending = retryFile.current;
        if (pending && pending.file.name === removed?.fileName && pending.kind === removed?.kind && pending.file.size === removed?.byteSize) {
          retryFile.current = null;
          setCanRetryUpload(false);
        }
        setItems((prev) => prev.filter((i) => i.id !== id));
        setAnalysis(null);
        setReviewed(false);
      }
    } catch (e) {
      if (epoch === sequence.current)
        setError(e instanceof Error ? e.message : "No se pudo quitar.");
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  function confirm() {
    if (
      !analysis ||
      !reviewed ||
      acceptedSnapshot.current !== current.current ||
      lock.current ||
      loadingRef.current
    )
      return;
    const fields = selectedMediaFields(analysis.proposal, selected);
    if (!fields.length) return;
    if (needsExplicitCargoGroup(draft, fields)) {
      setError(cargoGroupHelp(true));
      return;
    }
    apply(fields);
    setAnalysis(null);
    setReviewed(false);
    setNotice(
      "Datos aplicados al mismo borrador. Revisa el formulario y guarda cuando esté completo.",
    );
  }
  async function startRecording() {
    if (lock.current || loadingRef.current || micPending.current || recording)
      return;
    setError("");
    micPending.current = true;
    setRequestingMic(true);
    const epoch = sequence.current,
      micAttempt = ++micEpoch.current;
    try {
      if (items.some((item) => item.kind === "audio"))
        throw Error("Quita la nota de voz anterior para grabar otra.");
      if (
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      )
        throw Error(
          "Este navegador no permite grabar. Puedes adjuntar un WAV o escribir los datos.",
        );
      const source = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (
        !mounted.current ||
        epoch !== sequence.current ||
        micAttempt !== micEpoch.current
      ) {
        source.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = source;
      const audio = new MediaRecorder(source),
        chunks: Blob[] = [];
      recorder.current = audio;
      audio.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      audio.onstop = async () => {
        if (timer.current) clearInterval(timer.current);
        source.getTracks().forEach((t) => t.stop());
        setRecording(false);
        setBusy(true);
        lock.current = true;
        try {
          const wav = await recordedWave(
            new Blob(chunks, { type: audio.mimeType }),
          );
          lock.current = false;
          if (
            mounted.current &&
            epoch === sequence.current &&
            micAttempt === micEpoch.current
          )
            await upload(
              new File([wav], "nota-de-voz.wav", { type: "audio/wav" }),
              "audio",
            );
        } catch {
          if (mounted.current && epoch === sequence.current)
            setError(
              "No se pudo convertir la grabación. Adjunta un WAV o escribe los datos.",
            );
        } finally {
          lock.current = false;
          if (mounted.current) setBusy(false);
        }
      };
      audio.start();
      setRecording(true);
      setSeconds(0);
      let count = 0;
      timer.current = setInterval(() => {
        setSeconds(++count);
        if (count >= 60 && audio.state === "recording") audio.stop();
      }, 1000);
    } catch (e) {
      stream.current?.getTracks().forEach((t) => t.stop());
      if (mounted.current && epoch === sequence.current)
        setError(
          e instanceof Error ? e.message : "No se pudo acceder al micrófono.",
        );
    } finally {
      micPending.current = false;
      if (mounted.current) setRequestingMic(false);
    }
  }
  function stopRecording() {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }
  function discard() {
    setAnalysis(null);
    setReviewed(false);
  }
  function cancelRecording() {
    micEpoch.current++;
    if (recorder.current) recorder.current.onstop = null;
    stopRecording();
    stream.current?.getTracks().forEach((t) => t.stop());
    if (mounted.current) setRecording(false);
    if (timer.current) clearInterval(timer.current);
  }
  function reset() {
    sequence.current++;
    loadingRef.current = false;
    setLoading(false);
    operations.current = {};
    retryFile.current = null;
    setCanRetryUpload(false);
    newKey();
    setItems([]);
    discard();
    setError("");
    setNotice("");
    cancelRecording();
  }
  function ensureIdle() {
    if (
      !lock.current &&
      !loadingRef.current &&
      !micPending.current &&
      !recording
    )
      return true;
    setError(
      "Espera a que termine la carga, grabación o análisis antes de guardar.",
    );
    return false;
  }
  return {
    items,
    busy: busy || loading,
    error,
    notice,
    analysis,
    selected,
    setSelected,
    reviewed,
    setReviewed,
    upload,
    canRetryUpload,
    retryUpload: () => {
      const pending = retryFile.current;
      if (pending) return upload(pending.file, pending.kind);
    },
    analyze,
    remove,
    confirm,
    recording,
    requestingMic,
    seconds,
    startRecording,
    stopRecording,
    cancelRecording,
    discard,
    reset,
    ensureIdle,
  };
}
/** Resample recorded browser audio to the exact PCM16 mono format accepted by ASR. */
export async function recordedWave(blob: Blob) {
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    if (!decoded.duration || decoded.duration > 61)
      throw Error("Audio too long or empty");
    const offline = new OfflineAudioContext(
        1,
        Math.ceil(decoded.duration * 16000),
        16000,
      ),
      source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering(),
      samples = rendered.getChannelData(0);
    const bytes = new ArrayBuffer(44 + samples.length * 2),
      view = new DataView(bytes),
      tag = (at: number, s: string) => {
        [...s].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
      };
    tag(0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    tag(8, "WAVE");
    tag(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 16000, true);
    view.setUint32(28, 32000, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    tag(36, "data");
    view.setUint32(40, samples.length * 2, true);
    samples.forEach((s, i) =>
      view.setInt16(
        44 + i * 2,
        Math.max(-1, Math.min(1, s)) * (s < 0 ? 32768 : 32767),
        true,
      ),
    );
    return bytes;
  } finally {
    await context.close();
  }
}
