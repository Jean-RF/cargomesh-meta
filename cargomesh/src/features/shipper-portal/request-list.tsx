"use client";

import { ArrowUpDown, ArrowUpRight, Search, SlidersHorizontal, X } from "lucide-react";
import { Button, SearchField } from "@/components/ui";
import { WorkspaceLink as Link } from "@/features/workspace-mode/workspace-link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useLocale } from "@/features/i18n/locale-provider";
import type { FreightRequestV2Data } from "@/features/v2-intake/contracts";
import { displayReference, locationDisplayLabel } from "@/shared/lib/display-identity";
import { formatMass, requestStatusLabel, requestStatusTone } from "./shipper-model";
import { filterOperationRequests, operationDetailHref, operationView, operationsSearch, operationsHistoryState, parseOperationsQuery, type OperationsQuery } from "./operations-query";
import { requestGroups, requestSearchDate, requestUtcDate, requestUtcTime, requestUtcWindow, selectedRequestGroup, selectedRequestStatuses } from "./request-list-model";
import { RequestFilters } from "./request-filters";
import s from "./request-list.module.css";

export function RequestList({ requests }: { requests: FreightRequestV2Data[]; initialQuery?: string }) {
  const { locale, localeTag, t } = useLocale();
  const params = useSearchParams(), pathname = usePathname();
  const query = parseOperationsQuery(params);
  const [searchText, setSearchText] = useState(query.q);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterPanelId = useId();
  const filterAnchor = useRef<HTMLDivElement>(null);
  const selectedRow = useRef<HTMLAnchorElement | null>(null);
  const view = operationView(pathname);
  useEffect(() => setSearchText(query.q), [query.q]);
  useEffect(() => { selectedRow.current?.focus({ preventScroll: true }); }, [query.selected]);

  // The URL preserves search, filters and selection when returning from a detail.
  function update(patch: Partial<OperationsQuery>) {
    const next = { ...parseOperationsQuery(new URLSearchParams(window.location.search)), ...patch };
    const serialized = new URLSearchParams(operationsSearch(next));
    const merged = new URLSearchParams(window.location.search);
    for (const name of ["q", "status", "statuses", "sort", "from", "to", "selected", "offset", "view"]) merged.delete(name);
    serialized.forEach((value, name) => merged.set(name, value));
    window.history.replaceState(operationsHistoryState(window.history.state), "", `${pathname}${merged.size ? `?${merged}` : ""}${window.location.hash}`);
  }
  const visible = useMemo(() => filterOperationRequests(requests, query, localeTag, value => requestSearchDate(value, localeTag)), [requests, params, localeTag]);
  const groupUniverse = useMemo(() => filterOperationRequests(requests, { ...query, status: "ALL", statuses: [] }, localeTag, value => requestSearchDate(value, localeTag)), [requests, params, localeTag]);
  const activeGroup = selectedRequestGroup(query), selectedStatuses = selectedRequestStatuses(query);
  const filterCount = selectedStatuses.length + Number(Boolean(query.from)) + Number(Boolean(query.to));

  return <section className={s.panel} aria-labelledby="request-list-title">
    <h2 id="request-list-title" className={s.srOnly}>{t("Solicitudes de tu organización", "Your organization requests")}</h2>
    <div className={s.toolbar}>
      <SearchField fieldClassName={s.search} label={t("Buscar solicitudes", "Search requests")} hideLabel value={searchText} maxLength={200}
        clearLabel={t("Limpiar búsqueda", "Clear search")} placeholder={t("Código, ciudad o carga…", "Code, city or cargo…")}
        onValueChange={value => { setSearchText(value); update({ q: value }); }}/>
      <div className={s.groups} role="group" aria-label={t("Grupos de solicitudes", "Request groups")}>
        {requestGroups.map(group => {
          const count = group.statuses.length ? groupUniverse.filter(request => group.statuses.includes(request.status)).length : groupUniverse.length;
          const hint = group.statuses.map(status => requestStatusLabel(status, locale)).join(", ");
          return <button type="button" key={group.key} aria-pressed={activeGroup === group.key} title={hint || t("Todos los estados", "All statuses")}
            onClick={() => update({ status: "ALL", statuses: group.statuses })}>{t(group.es, group.en)}<span>{count}</span></button>;
        })}
      </div>
      <div className={s.toolbarActions}>
        <div className={s.filterAnchor} ref={filterAnchor}><Button type="button" variant="secondary" size="compact" className={s.filterButton} aria-haspopup="dialog" aria-expanded={filtersOpen} aria-controls={filterPanelId} onClick={() => setFiltersOpen(value => !value)}>
          <SlidersHorizontal size={15} aria-hidden="true"/>{t("Filtros", "Filters")}{filterCount > 0 && <span>{filterCount}</span>}
        </Button></div>
        <label className={s.sort}><ArrowUpDown size={15} aria-hidden="true"/><select aria-label={t("Ordenar solicitudes", "Sort requests")} value={query.sort} onChange={event => update({ sort: event.target.value as OperationsQuery["sort"] })}>
          <option value="UPDATED_DESC">{t("Más recientes", "Newest first")}</option><option value="UPDATED_ASC">{t("Más antiguas", "Oldest first")}</option><option value="PICKUP_ASC">{t("Próximo recojo", "Next pickup")}</option>
        </select></label>
      </div>
    </div>
    {filterCount > 0 && <div className={s.appliedFilters}>
      {selectedStatuses.length > 0 && <button type="button" onClick={() => update({ status: "ALL", statuses: [] })} aria-label={t("Quitar filtro de estado", "Remove status filter")}>
        {selectedStatuses.length === 1 ? requestStatusLabel(selectedStatuses[0], locale) : t(`${selectedStatuses.length} estados`, `${selectedStatuses.length} statuses`)}<X size={12} aria-hidden="true"/>
      </button>}
      {(query.from || query.to) && <button type="button" onClick={() => update({ from: "", to: "" })} aria-label={t("Quitar filtro de fecha", "Remove date filter")}>
        {query.from || "…"} → {query.to || "…"} · UTC<X size={12} aria-hidden="true"/>
      </button>}
    </div>}
    {visible.length ? <div className={s.tableViewport} role="region" aria-label={t("Tabla de solicitudes", "Requests table")} tabIndex={0}>
      <table className={s.table}><thead><tr><th scope="col">{t("Solicitud", "Request")}</th><th scope="col">{t("Ruta", "Route")}</th><th scope="col">{t("Recojo", "Pickup")}</th><th scope="col">{t("Entrega", "Delivery")}</th><th scope="col">{t("Carga", "Load")}</th><th scope="col">{t("Estado", "Status")}</th></tr></thead>
        <tbody data-client-motion-group>{visible.map(request => {
          const pickup = requestUtcWindow(request.pickupWindow, localeTag), delivery = requestUtcWindow(request.deliveryWindow, localeTag);
          return <tr key={request.id} data-selected={query.selected === request.id}>
            <td><Link className={s.reference} title={request.referenceCode} ref={query.selected === request.id ? selectedRow : undefined} aria-current={query.selected === request.id ? "true" : undefined}
              onClick={() => update({ selected: request.id })} href={operationDetailHref(request.id, query, view)}>{displayReference(request.referenceCode, "PED", request.id)}<ArrowUpRight size={13} aria-hidden="true"/></Link>
              <small><time dateTime={request.updatedAt} title={t("Última actualización", "Last updated")}>{requestUtcDate(request.updatedAt, localeTag)} · {requestUtcTime(request.updatedAt, localeTag)}</time><span className={s.version}>v{request.draftVersion}</span></small></td>
            <td><span className={s.route}>{locationDisplayLabel(request.origin.city)}<span aria-hidden="true">→</span>{locationDisplayLabel(request.destination.city)}</span></td>
            <td><time dateTime={request.pickupWindow.startsAt}>{pickup.date}<small>{pickup.time}</small></time></td>
            <td><time dateTime={request.deliveryWindow.startsAt}>{delivery.date}<small>{delivery.time}</small></time></td>
            <td><strong className={s.mass}>{formatMass(request.cargoSpecification.totalWeightKg, localeTag)}</strong><small>{request.cargoSpecification.totalVolumeM3.toLocaleString(localeTag)} m³</small></td>
            <td><span className={s.status} data-tone={requestStatusTone(request.status)} data-status={request.status}>{requestStatusLabel(request.status, locale)}</span></td>
          </tr>;
        })}</tbody>
      </table>
    </div> : <div className={s.empty} role="status"><Search size={25} aria-hidden="true"/><strong>{requests.length ? t("Sin coincidencias", "No matches") : t("Todavía no hay solicitudes cargadas", "No requests loaded yet")}</strong><p>{requests.length ? t("Prueba otra búsqueda o ajusta los filtros.", "Try another search or adjust the filters.") : t("Crea una solicitud o revisa el estado de lectura.", "Create a request or check the read status.")}</p>{requests.length > 0 && <Button type="button" variant="secondary" size="compact" onClick={() => update({ q: "", status: "ALL", statuses: [], from: "", to: "" })}>{t("Limpiar filtros", "Clear filters")}</Button>}</div>}
    <footer className={s.footer}><span role="status">{t(`${visible.length} de ${requests.length} solicitudes cargadas`, `${visible.length} of ${requests.length} loaded requests`)}</span><span>{t("Fechas y horas en UTC", "Dates and times in UTC")}</span></footer>
    <RequestFilters open={filtersOpen} panelId={filterPanelId} anchorRef={filterAnchor} query={query} requests={requests} onClose={() => setFiltersOpen(false)} onApply={update}/>
  </section>;
}
