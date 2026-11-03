"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { PassportExplanationCommandSchema, type PassportExplanationAttempt } from "@/shared/schemas/meta/passport-explanation";
import { validateLoadingExplanation } from "@/shared/meta/loading-operation";
import type { ReconciliationExplanation } from "@/shared/schemas/meta/reconciliation-explanation";
import { loadingApi, loadingErrorMessage } from "./operation-api";

export type ExplanationPassport = Awaited<ReturnType<typeof loadingApi.passport>>;
type Intent = { key: string; body: z.infer<typeof PassportExplanationCommandSchema> };
const StoredIntent = z.object({ key: z.string().uuid(), body: PassportExplanationCommandSchema }).strict();
export function usePassportExplanations(passport: ExplanationPassport, canOperate: boolean, onSaved: () => Promise<void>) {
  const [attempts, setAttempts] = useState<Record<string, PassportExplanationAttempt>>({});
  const [saved, setSaved] = useState<Record<string, ReconciliationExplanation>>({});
  const [busyGroup, setBusyGroup] = useState<string | null>(null), [loading, setLoading] = useState(true);
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const mounted = useRef(true), sequence = useRef(0), lock = useRef(false), polls = useRef(0);
  const controllers = useRef(new Set<AbortController>()), intents = useRef(new Map<string, Intent>()), seenSaved = useRef(new Set<string>());
  const latest = useRef({ passport, canOperate, onSaved }); latest.current = { passport, canOperate, onSaved };
  const slot = (groupId: string) => `cargomesh-passport-explanation:${passport.data.id}:${groupId}`;
  const controller = () => { const value = new AbortController(); controllers.current.add(value); return value; };
  function forget(groupId: string) {
    intents.current.delete(groupId);
    try { window.sessionStorage.removeItem(slot(groupId)); } catch {}
  }
  const refresh = useCallback(async () => {
    const current = latest.current.passport, epoch = ++sequence.current, control = controller();
    try {
      const rows = await loadingApi.explanationAttempts(current.data.sessionId, current.data.id,
        AbortSignal.any([control.signal, AbortSignal.timeout(14000)]));
      if (!mounted.current || epoch !== sequence.current) return;
      if (rows.some(a => !current.data.source.session.groups.some(g => g.id === a.groupId))) throw Error("EXPLANATION_SCOPE_MISMATCH");
      setAttempts(Object.fromEntries(rows.map(a => [a.groupId, a])));
      setError("");
      const newlySaved = rows.filter(a => a.state === "SAVED" && !seenSaved.current.has(a.id));
      if (newlySaved.length) {
        await latest.current.onSaved();
        newlySaved.forEach(a => { seenSaved.current.add(a.id); forget(a.groupId); });
      }
    } catch (e) {
      if (mounted.current && epoch === sequence.current && !control.signal.aborted) setError(loadingErrorMessage(e));
    } finally {
      controllers.current.delete(control);
      if (mounted.current && epoch === sequence.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true; void refresh();
    return () => { mounted.current = false; sequence.current++; controllers.current.forEach(c => c.abort()); controllers.current.clear(); };
  }, [refresh]);
  useEffect(() => {
    if (!Object.values(attempts).some(a => a.state === "RUNNING") || polls.current >= 48 || busyGroup) return;
    const timer = setTimeout(() => { polls.current++; void refresh(); }, 2500);
    return () => clearTimeout(timer);
  }, [attempts, busyGroup, refresh]);
  async function generate(groupId: string, language: "es" | "en", newAttempt = false, acceptedRetry = false) {
    const current = latest.current, p = current.passport;
    if (lock.current || !current.canOperate || !p.meta.isCurrent) return;
    if (!p.data.source.session.groups.some(g => g.id === groupId)) return;
    const previous = attempts[groupId];
    if (newAttempt && previous?.processingMayHaveOccurred && !acceptedRetry) {
      setError("Confirma que quieres iniciar otro intento; el anterior pudo consumir créditos."); return;
    }
    lock.current = true; setBusyGroup(groupId); setError(""); setNotice("");
    const epoch = ++sequence.current, control = controller();
    try {
      let intent = intents.current.get(groupId);
      if (!intent) {
        try {
          const stored = StoredIntent.safeParse(JSON.parse(window.sessionStorage.getItem(slot(groupId)) ?? "null"));
          if (stored.success && stored.data.body.groupId === groupId && stored.data.body.expectedVersion === p.data.sessionVersion) intent = stored.data;
        } catch {}
      }
      if (!intent || newAttempt) intent = { key: crypto.randomUUID(), body: {
        groupId, expectedVersion: p.data.sessionVersion, language, retryOf: newAttempt ? previous?.id ?? null : null,
      } };
      intents.current.set(groupId, intent);
      try { window.sessionStorage.setItem(slot(groupId), JSON.stringify(intent)); } catch {}
      const result = await loadingApi.explain(p.data.sessionId, p.data.id, intent.body, intent.key,
        AbortSignal.any([control.signal, AbortSignal.timeout(58000)]));
      if (!mounted.current || epoch !== sequence.current) return;
      if (result.data.attempt) {
        const attempt = result.data.attempt;
        setAttempts(prev => ({ ...prev, [groupId]: attempt }));
      }
      if (result.data.status === "SAVED" && result.data.explanation) {
        const value = validateLoadingExplanation(p.data, groupId, result.data.explanation);
        setSaved(prev => ({ ...prev, [groupId]: value }));
        forget(groupId);
        setNotice("Explicación guardada en este Passport. Revísala junto a sus fuentes.");
        await latest.current.onSaved();
        if (result.data.attempt) seenSaved.current.add(result.data.attempt.id);
      } else if (result.data.status === "IN_PROGRESS") {
        polls.current = 0;
        setNotice("Este grupo ya se está procesando. Consultaremos el resultado sin iniciar otra generación.");
      } else if (result.data.status === "GUIDANCE") {
        setNotice(result.data.guidance?.summary ?? "Revisa la evidencia de este grupo."); forget(groupId);
      }
    } catch (e) {
      if (mounted.current && epoch === sequence.current && !control.signal.aborted) {
        setError(loadingErrorMessage(e));
        setNotice("Conservamos la referencia del intento. Consulta su estado o recupera el resultado antes de generar otro.");
      }
    } finally {
      controllers.current.delete(control); lock.current = false;
      if (mounted.current) { setBusyGroup(null); setLoading(false); }
    }
  }
  return { attempts, saved, busyGroup, loading, error, notice, refresh, generate };
}
