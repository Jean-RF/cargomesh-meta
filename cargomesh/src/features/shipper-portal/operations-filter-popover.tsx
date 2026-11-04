"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import s from "./request-list.module.css";

/** Native top-layer popover: anchored to its trigger, without blocking or resizing the page. */
export function OperationsFilterPopover({ open, id, anchorRef, title, clearLabel, onClear, onClose, children, footer }: {
  open: boolean; id: string; anchorRef: RefObject<HTMLDivElement | null>; title: string; clearLabel: string;
  onClear: () => void; onClose: () => void; children: ReactNode; footer: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const popover = panel.current;
    if (!popover) return;
    if (!open) { if (popover.matches(":popover-open")) popover.hidePopover(); return; }
    const place = () => {
      const anchor = anchorRef.current?.getBoundingClientRect();
      if (!anchor) return;
      if (anchor.bottom < 0 || anchor.top > window.innerHeight) { popover.hidePopover(); return; }
      const width = Math.min(336, window.innerWidth - 24);
      const below = window.innerHeight - anchor.bottom - 20, above = anchor.top - 20;
      const useBelow = below >= Math.min(popover.scrollHeight, 430) || below >= above;
      popover.style.width = `${width}px`;
      popover.style.maxHeight = `${Math.max(160, useBelow ? below : above)}px`;
      popover.style.left = `${Math.max(12, Math.min(anchor.right - width, window.innerWidth - width - 12))}px`;
      popover.style.top = `${useBelow ? anchor.bottom + 8 : Math.max(12, anchor.top - popover.offsetHeight - 8)}px`;
    };
    if (!popover.matches(":popover-open")) popover.showPopover();
    place();
    const frame = requestAnimationFrame(place);
    popover.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
    window.addEventListener("resize", place); window.addEventListener("scroll", place, true);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [open, anchorRef]);
  return <div ref={panel} id={id} popover="auto" role="dialog" aria-labelledby={`${id}-title`} className={s.filtersPopover}
    onToggle={event => { if (!event.currentTarget.matches(":popover-open")) onClose(); }}
    onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); anchorRef.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true }); } }}>
    <header className={s.filterPopoverHeader}><h2 id={`${id}-title`}>{title}</h2><button type="button" onClick={onClear}>{clearLabel}</button></header>
    <div className={s.filterPopoverBody}>{children}</div>
    <footer className={s.filterPopoverFooter}>{footer}</footer>
  </div>;
}
