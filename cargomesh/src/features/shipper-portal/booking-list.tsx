"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { CalendarCheck2, Search } from "lucide-react";
import { Button, SearchField } from "@/components/ui";
import { useLocale } from "@/features/i18n/locale-provider";
import { bookingGroups, operationsHistoryState, parseOperationsQuery, type BookingGroup } from "./operations-query";
import shared from "./request-list.module.css";
import s from "./booking-list.module.css";

export type BookingListItem = { id: string; searchText: string; group: Exclude<BookingGroup, "ALL">; card: ReactNode };

export function BookingList({ items, failed }: { items: BookingListItem[]; failed: boolean }) {
  const { localeTag, t } = useLocale(), params = useSearchParams(), pathname = usePathname();
  const query = parseOperationsQuery(params), group = query.bookingGroup ?? "ALL";
  const [search, setSearch] = useState(query.bookingQ ?? "");
  useEffect(() => setSearch(query.bookingQ ?? ""), [query.bookingQ]);
  function update(value: string, selected: BookingGroup) {
    const next = new URLSearchParams(window.location.search);
    if (value) next.set("bookingQ", value); else next.delete("bookingQ");
    if (selected !== "ALL") next.set("bookingGroup", selected); else next.delete("bookingGroup");
    window.history.replaceState(operationsHistoryState(window.history.state), "", `${pathname}${next.size ? `?${next}` : ""}${window.location.hash}`);
  }
  const needle = (query.bookingQ ?? "").trim().toLocaleLowerCase(localeTag);
  const matching = items.filter(item => !needle || item.searchText.toLocaleLowerCase(localeTag).includes(needle));
  const visible = matching.filter(item => group === "ALL" || item.group === group);
  const label = (value: BookingGroup) => ({ ALL: t("Todas", "All"), PENDING: t("Pendientes del carrier", "Awaiting carrier"),
    CONFIRMED: t("Confirmadas", "Confirmed"), CLOSED: t("Cerradas", "Closed") })[value];
  return <section className={s.list} aria-label={t("Reservas de tu organización", "Your organization bookings")}>
    <div className={s.toolbar}>
      <SearchField fieldClassName={`${shared.search} ${s.search}`} label={t("Buscar reservas", "Search bookings")} hideLabel
        placeholder={t("Reserva, carrier o solicitud…", "Booking, carrier or request…")} value={search} maxLength={200}
        clearLabel={t("Limpiar búsqueda", "Clear search")} onValueChange={value => { setSearch(value); update(value, group); }}/>
      <div className={shared.groups} role="group" aria-label={t("Estado de las reservas", "Booking status")}>
        {bookingGroups.map(value => <button type="button" key={value} aria-pressed={group === value}
          title={value === "CLOSED" ? t("Rechazadas, canceladas o con autorización revocada", "Rejected, cancelled or authorization revoked") : undefined}
          onClick={() => update(search, value)}>{label(value)}<span>{value === "ALL" ? matching.length : matching.filter(item => item.group === value).length}</span></button>)}
      </div>
      <span className={s.timezone}>{t("Horario PET (UTC−05:00)", "Times in PET (UTC−05:00)")}</span>
    </div>
    {visible.length ? <div className={s.cards}>{visible.map(item => <div key={item.id}>{item.card}</div>)}</div>
      : <div className={`${shared.panel} ${shared.empty}`} role="status">{items.length ? <Search size={25} aria-hidden="true"/> : <CalendarCheck2 size={25} aria-hidden="true"/>}
        <strong>{failed && !items.length ? t("No se pudieron consultar las reservas", "Bookings could not be loaded") : items.length ? t("No hay coincidencias", "No matching bookings") : t("No hay reservas", "No bookings")}</strong>
        <p>{items.length ? t("Prueba otra búsqueda o estado.", "Try another search or status.") : !failed ? t("Aparecerán después de autorizar una reserva.", "Bookings appear after you authorize them.") : t("Reintenta la lectura desde el aviso superior.", "Retry from the notice above.")}</p>
        {items.length > 0 && <Button type="button" variant="secondary" size="compact" onClick={() => { setSearch(""); update("", "ALL"); }}>{t("Limpiar filtros", "Clear filters")}</Button>}
      </div>}
    <p className={s.count} role="status" aria-live="polite">{t(`${visible.length} de ${items.length} reservas cargadas`, `${visible.length} of ${items.length} loaded bookings`)}</p>
  </section>;
}
