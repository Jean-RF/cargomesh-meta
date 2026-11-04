"use client";

import { useEffect, useState, type RefObject } from "react";
import { Button, Checkbox, Input } from "@/components/ui";
import { useLocale } from "@/features/i18n/locale-provider";
import type { FreightRequestV2Data } from "@/features/v2-intake/contracts";
import { filterOperationRequests, operationStatuses, type OperationRequestStatus, type OperationsQuery } from "./operations-query";
import { requestSearchDate, selectedRequestStatuses } from "./request-list-model";
import { requestStatusLabel } from "./shipper-model";
import { OperationsFilterPopover } from "./operations-filter-popover";
import s from "./request-list.module.css";

export function RequestFilters({ open, panelId, anchorRef, query, requests, onClose, onApply }: {
  open: boolean; query: OperationsQuery; requests: FreightRequestV2Data[];
  panelId: string; anchorRef: RefObject<HTMLDivElement | null>;
  onClose: () => void; onApply: (patch: Partial<OperationsQuery>) => void;
}) {
  const { locale, localeTag, t } = useLocale();
  const [statuses, setStatuses] = useState<readonly OperationRequestStatus[]>([]);
  const [from, setFrom] = useState(""), [to, setTo] = useState("");
  const selectedKey = selectedRequestStatuses(query).join(",");
  useEffect(() => {
    if (!open) return;
    setStatuses(selectedKey ? selectedKey.split(",") as OperationRequestStatus[] : []);
    setFrom(query.from); setTo(query.to);
  }, [open, selectedKey, query.from, query.to]);
  const close = () => { onClose(); anchorRef.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true }); };
  const count = filterOperationRequests(requests, { ...query, status: "ALL", statuses, from, to }, localeTag, value => requestSearchDate(value, localeTag)).length;
  return <OperationsFilterPopover open={open} id={panelId} anchorRef={anchorRef} title={t("Filtros", "Filters")} clearLabel={t("Limpiar todo", "Clear all")}
    onClear={() => { setStatuses([]); setFrom(""); setTo(""); }} onClose={onClose}
    footer={<><Button type="button" variant="secondary" size="compact" onClick={close}>{t("Cancelar", "Cancel")}</Button><Button type="button" size="compact" className={s.applyFilters} onClick={() => { onApply({ status: "ALL", statuses, from, to }); close(); }}>{t(`Mostrar ${count}`, `Show ${count}`)}</Button></>}>
    <div className={s.filterHeading}><span>{t("Estado", "Status")}</span></div>
    <fieldset className={s.statusChoices}><legend className={s.srOnly}>{t("Estados de solicitud", "Request statuses")}</legend>
      {operationStatuses.filter((status): status is OperationRequestStatus => status !== "ALL").map(status => <Checkbox key={status} label={requestStatusLabel(status, locale)} checked={statuses.includes(status)}
        onChange={event => setStatuses(current => event.target.checked ? [...current, status] : current.filter(value => value !== status))}/>) }
    </fieldset>
    <fieldset className={s.dateChoices}><legend>{t("Última actualización (UTC)", "Last updated (UTC)")}</legend>
      <Input label={t("Desde", "From")} type="date" value={from} onChange={event => { setFrom(event.target.value); if (to && to < event.target.value) setTo(""); }}/>
      <Input label={t("Hasta", "To")} type="date" min={from || undefined} value={to} onChange={event => setTo(event.target.value && from && event.target.value < from ? "" : event.target.value)}/>
    </fieldset>
  </OperationsFilterPopover>;
}
