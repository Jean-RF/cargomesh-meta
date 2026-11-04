import { ConversationContextFieldSchema, type InterpretationRequest } from "@/features/v2-conversation-prep/interpretation";
import { CONVERSATION_FIELDS, type GuidedConversationField } from "./conversation-fields";
import type { V2IntakePrototypeDraft } from "./prototype-model";
import type {IntakeOptionsData} from './contracts';
import {draftRoadStatus} from './road-advice';

/** Bounded, in-session memory. Preserve early cargo statements as well as recent dialogue. */
export function conversationMemory(turns: ReadonlyArray<{speaker: 'user'|'assistant';text:string;provisional?:boolean}>) {
  const reset=turns.findLastIndex(turn=>turn.speaker==='user'
    && /^(?:start over|start again|empezar de nuevo|empecemos|reiniciar)[.!\s]*$/i.test(turn.text.trim()));
  const complete=turns.slice(reset+1).filter(turn=>!turn.provisional&&turn.text.trim());
  const recent=complete.slice(-12);
  const anchors=complete.filter(turn=>turn.speaker==='user'&&!recent.includes(turn)
    && /\b(?:cargo|ship|transport|pallets?|boxes|bottles?|medicine|mercanc[ií]a|carga|env[ií]o|frascos?|medicamentos?|kg|actually|correction|corrige)\b/i.test(turn.text)).slice(-4);
  return [...anchors,...recent].map(turn=>({role:turn.speaker,
    text:turn.text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[contact]')
      .replace(/\+?\d[\d\s().-]{7,}\d/g,'[phone]').trim().slice(0,350)})).filter(turn=>turn.text);
}

/** Only validated, non-contact provisional fields are sent as interpretation hints. */
export function conversationContext(
  draft: V2IntakePrototypeDraft,
  lastAskedField: GuidedConversationField | null,
  failedAttempts: number,
  options?:IntakeOptionsData,
): NonNullable<InterpretationRequest["context"]> {
  const knownFields = CONVERSATION_FIELDS.flatMap((field) => {
    if (!ConversationContextFieldSchema.safeParse(field).success) return [];
    if (["divisible","unitIndivisible","unitStackable","requirements"].includes(field) && !draft.reviewedConversationFields?.includes(field)) return [];
    const value = String(draft[field] ?? "").trim();
    return value && value.length <= 100 ? [{ field: field as (typeof ConversationContextFieldSchema.options)[number], value }] : [];
  });
  return {planningTimeZone:draft.planningTimeZone??Intl.DateTimeFormat().resolvedOptions().timeZone, knownFields:knownFields.slice(0,24), lastAskedField, failedAttempts: Math.min(3, Math.max(0, failedAttempts)), ...(options?{roadRouteStatus:draftRoadStatus(draft,options)}:{}) };
}
