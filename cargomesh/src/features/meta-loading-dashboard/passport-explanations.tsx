"use client";
import { useMemo, useState } from "react";
import { Check, ChevronRight, Clock3, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { explanationGuidance } from "@/shared/schemas/meta/explanation-plan";
import { loadingExplanationFacts } from "@/shared/meta/loading-operation";
import { usePassportExplanations, type ExplanationPassport } from "./use-passport-explanations";
import s from "./passport-explanations.module.css";

const actions: Record<string, string> = {
  CHECK_MANIFEST: "Contrastar el manifiesto confirmado", REQUEST_HUMAN_REVIEW: "Solicitar revisión del responsable",
  REVIEW_EVIDENCE: "Revisar los eventos citados", RECORD_MORE_EVIDENCE: "Registrar evidencia adicional", WAIT_FOR_SESSION_CLOSE: "Esperar al cierre del alcance",
};
const failures: Record<string, string> = {
  NOT_CONFIGURED: "El servicio de explicación no está configurado en este entorno.",
  PROVIDER_UNAVAILABLE: "Meta no pudo completar la explicación.", MODEL_OUTPUT_INVALID: "La respuesta no superó la validación de hechos y referencias.",
  INPUT_REVISION_MISMATCH: "Las fuentes cambiaron durante la generación. Consulta el Passport vigente.",
  FORBIDDEN_TENANT: "El acceso cambió durante la generación.", VALIDATION_ERROR: "Los hechos no cumplen el contrato de explicación.",
  GENERATION_INTERRUPTED: "No se pudo confirmar el resultado del intento anterior.", PERSISTENCE_UNAVAILABLE: "El guardado no pudo confirmarse. Recupera el mismo intento.",
};
export const eventTime = (milliseconds: number) => {
  const seconds = milliseconds / 1000;
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(2).padStart(5, "0")}`;
};
export function PassportExplanations({ value, canOperate, onSaved, onEvidence }: {
  value: ExplanationPassport; canOperate: boolean; onSaved: () => Promise<void>; onEvidence: (eventId: string) => void;
}) {
  const p = value.data, state = usePassportExplanations(value, canOperate, onSaved);
  const [language, setLanguage] = useState<"es" | "en">("es"), [retryConsent, setRetryConsent] = useState<Record<string, boolean>>({});
  const busy = !!state.busyGroup;
  const guidanceByGroup = useMemo(() => Object.fromEntries(p.source.session.groups.map(group => {
    try { return [group.id, { guidance: explanationGuidance(loadingExplanationFacts(p, group.id), language), unsupported: false }]; }
    catch { return [group.id, { guidance: null, unsupported: true }]; }
  })), [p, language]);
  return <section className={s.panel} aria-labelledby={`explanation-${p.id}`}>
    <header className={s.header}>
      <div className={s.heading}><span className={s.icon}><Sparkles size={20} aria-hidden="true" /></span><div>
        <h4 id={`explanation-${p.id}`}>Explicación de la comparación</h4><p>Hechos del Passport, contexto y siguientes pasos para revisar.</p>
      </div></div>
      <button type="button" disabled={busy || state.loading} onClick={() => void state.refresh()}><RefreshCw size={15} aria-hidden="true" /> Consultar estado</button>
    </header>
    {!value.meta.isCurrent && <p className={s.warning}>Passport histórico. Puedes consultar lo guardado; para generar una explicación usa la versión vigente.</p>}
    {canOperate && value.meta.isCurrent && p.explanations.length < p.source.session.groups.length && <label className={s.language}>Idioma de la explicación
      <select value={language} disabled={busy || Object.values(state.attempts).some(a => a.state === "RUNNING")} onChange={e => setLanguage(e.target.value as "es" | "en")}>
        <option value="es">Español</option><option value="en">English</option>
      </select></label>}
    {state.error && <p role="alert" className={s.warning}>{state.error}</p>}
    {state.notice && <p role="status" className={s.notice}>{state.notice}</p>}
    <div className={s.groups}>{p.source.session.groups.map(group => {
      const explanation = p.explanations.find(e => e.groupId === group.id)?.value ?? state.saved[group.id];
      const attempt = state.attempts[group.id], generating = state.busyGroup === group.id || attempt?.state === "RUNNING";
      const {guidance, unsupported} = guidanceByGroup[group.id];
      const canGenerate = canOperate && value.meta.isCurrent && !guidance && !unsupported && !explanation;
      return <article key={group.id} className={s.card} aria-busy={state.busyGroup === group.id}>
        <div className={s.cardHeader}><div><h5>{group.label}</h5><small>{group.unit === "PALLET" ? "Pallets" : "Cajas"} · versión {p.sessionVersion}</small></div>
          {explanation ? <span className={s.badge}><Check size={13} aria-hidden="true" /> Guardada</span> : generating ? <span className={s.badge}><Clock3 size={13} aria-hidden="true" /> En curso</span> : null}
        </div>
        {explanation ? <>
          <p className={s.summary}>{explanation.summary}</p>
          {!!explanation.reasons.length && <ul className={s.reasons}>{explanation.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>}
          {!!explanation.limitations.length && <div className={s.limits}><strong>Alcance de esta explicación</strong><ul>{explanation.limitations.map(limit => <li key={limit}>{limit}</li>)}</ul></div>}
          {!!explanation.suggestedActions.length && <div className={s.suggestions}><strong>Siguientes pasos sugeridos</strong><ul>{explanation.suggestedActions.map(action => <li key={action}>{actions[action]}</li>)}</ul></div>}
          {!!explanation.evidenceRefs.length && <div className={s.references}><strong>Eventos citados</strong>{explanation.evidenceRefs.map(reference => <button type="button" key={reference.eventId} onClick={() => onEvidence(reference.eventId)}>
            <Clock3 size={14} aria-hidden="true" /> Evento {eventTime(reference.timecodeMs)}<ChevronRight size={14} aria-hidden="true" />
          </button>)}<small>Las marcas corresponden a la transformación temporal registrada en la evidencia.</small></div>}
          <p className={s.review}><ShieldCheck size={15} aria-hidden="true" /> Revisión humana necesaria antes de tomar una decisión.</p>
          {attempt?.metadata ? <details className={s.metadata}><summary>Origen y generación</summary><dl>
            <div><dt>Proveedor</dt><dd>{attempt.metadata.transport === "META_MODEL_API" ? "Meta · API real" : "Proveedor de prueba inyectado"}</dd></div>
            <div><dt>Modelo</dt><dd>{attempt.metadata.model ?? "Sin registrar"}</dd></div>
            <div><dt>Guardado</dt><dd>{attempt.completedAt ? new Date(attempt.completedAt).toLocaleString("es-PE") : "Pendiente de confirmar"}</dd></div>
            <div><dt>Uso informado</dt><dd>{attempt.metadata.inputTokens === null ? "Entrada no informada" : `${attempt.metadata.inputTokens} tokens de entrada`} · {attempt.metadata.outputTokens === null ? "salida no informada" : `${attempt.metadata.outputTokens} de salida`}</dd></div>
          </dl><small>Coste monetario no informado. {p.source.session.mode === "DEMO" ? "Esta sesión es de demostración; no acredita una carga física." : "La explicación conserva el alcance y las fuentes del Passport."}</small></details>
            : <small className={s.sourceNote}>Explicación conservada en el Passport. Sin metadatos de generación registrados.</small>}
        </> : guidance ? <div className={s.guidance}><p>{guidance.summary}</p><ul>{guidance.suggestedActions.map(action => <li key={action}>{actions[action]}</li>)}</ul><small>Orientación basada en el estado del comparador. No se llamó a la IA.</small></div>
          : unsupported ? <p>No se puede explicar este grupo con el contrato actual. La comparación y sus fuentes siguen disponibles.</p>
          : <>
            {generating ? <div className={s.progress} role="status"><span className={s.skeleton} /><span className={s.skeleton} /><p>Preparando una explicación respaldada por los hechos de este grupo…</p></div>
              : <p>La explicación es opcional. La comparación y sus fuentes permanecen disponibles.</p>}
            {attempt?.state === "FAILED" && <div className={s.failure}><p>{failures[attempt.errorCode ?? ""] ?? "No se pudo completar este intento."}</p>
              {attempt.processingMayHaveOccurred && <label><input type="checkbox" checked={!!retryConsent[group.id]} onChange={e => setRetryConsent(prev => ({ ...prev, [group.id]: e.target.checked }))} /> Entiendo que el intento anterior pudo consumir créditos y quiero iniciar otro.</label>}
            </div>}
            {canGenerate ? <div className={s.controls}>
              {attempt?.state === "FAILED" ? <button type="button" disabled={busy || state.loading || attempt.processingMayHaveOccurred && !retryConsent[group.id]} onClick={() => void state.generate(group.id, language, true, !!retryConsent[group.id])}><RefreshCw size={15} aria-hidden="true" /> Generar otro intento</button>
                : <button type="button" className={s.generate} disabled={busy || state.loading || generating} onClick={() => void state.generate(group.id, language)}><Sparkles size={15} aria-hidden="true" /> {attempt?.state === "GENERATED" ? "Guardar resultado recuperado" : "Generar explicación"}</button>}
              {(attempt || state.error || state.notice) && <button type="button" disabled={busy || state.loading} onClick={() => void state.generate(group.id, language)}>Recuperar mismo intento</button>}
            </div> : !canOperate && value.meta.isCurrent ? <p className={s.sourceNote}>Un propietario o supervisor puede generar la explicación.</p> : null}
          </>}
      </article>;
    })}</div>
  </section>;
}
