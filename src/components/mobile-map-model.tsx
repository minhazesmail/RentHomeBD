"use client";

import { ChevronDown, ChevronUp, List, Map } from "lucide-react";
import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Dispatch, PointerEvent, ReactNode, SetStateAction } from "react";
import { getMapWorkspaceRedesignCopy } from "@/i18n/map-workspace-redesign-copy";
import { useLocale } from "@/i18n/use-locale";
import styles from "./mobile-map-model.module.css";

type MobileView = "map" | "list";
type SheetState = "collapsed" | "partial" | "expanded";
type MobileState = {
  view: MobileView; setView: Dispatch<SetStateAction<MobileView>>;
  sheet: SheetState; setSheet: Dispatch<SetStateAction<SheetState>>;
  filtersOpen: boolean; setFiltersOpen: Dispatch<SetStateAction<boolean>>;
};
const Context = createContext<MobileState | null>(null);
export function useMobileMap() {
  const value = useContext(Context);
  if (!value) throw new Error("Mobile map provider is required");
  return value;
}
function subscribe(callback: () => void) {
  const query = window.matchMedia("(max-width: 960px)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
function mobileSnapshot() { return window.matchMedia("(max-width: 960px)").matches; }
function serverSnapshot() { return false; }

export function MobileMapModel({ children }: { children: ReactNode }) {
  const [view, setView] = useState<MobileView>("map");
  const [sheet, setSheet] = useState<SheetState>("partial");
  const [filtersOpen, setFiltersOpen] = useState(false);
  return <Context.Provider value={{ view, setView, sheet, setSheet, filtersOpen, setFiltersOpen }}>
    <div className={styles.mobileMapModel + " " + styles.mobileMapLayout} data-mobile-view={view} data-mobile-sheet={sheet} data-mobile-filters={filtersOpen ? "open" : "closed"}>
      {children}
    </div>
  </Context.Provider>;
}

export function MobileResultsHeader() {
  const { view, setView, sheet, setSheet } = useMobileMap();
  const { locale } = useLocale();
  const copy = getMapWorkspaceRedesignCopy(locale).mobile;
  const drag = useRef<number | null>(null);
  function showView(next: MobileView) {
    setView(next);
    requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(next === "map" ? ".renter-map-panel" : ".renter-results-pane");
      target?.focus({ preventScroll: true });
    });
  }
  function finish(event: PointerEvent<HTMLDivElement>) {
    if (drag.current === null) return;
    const delta = event.clientY - drag.current;
    drag.current = null;
    if (Math.abs(delta) < 44) return;
    const states: SheetState[] = ["collapsed", "partial", "expanded"];
    setSheet(states[Math.max(0, Math.min(2, states.indexOf(sheet) + (delta < 0 ? 1 : -1)))]);
  }
  return <div className={styles.resultsControls} data-mobile-results-controls>
    <div className={styles.sheetGrip} onPointerDown={(event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      drag.current = event.clientY;
      event.currentTarget.setPointerCapture(event.pointerId);
    }} onPointerUp={finish} onPointerCancel={() => { drag.current = null; }} aria-hidden="true"><span /></div>
    <div className={styles.headerActions}>
      <nav aria-label={copy.results}>
        <button type="button" aria-pressed={view === "map"} onClick={() => showView("map")}><Map size={17} aria-hidden="true" />{copy.map}</button>
        <button type="button" aria-pressed={view === "list"} onClick={() => showView("list")}><List size={17} aria-hidden="true" />{copy.list}</button>
      </nav>
      {view === "map" && <div className={styles.sheetButtons}>
        <button type="button" aria-label={copy.collapseResults} disabled={sheet === "collapsed"} onClick={() => setSheet(sheet === "expanded" ? "partial" : "collapsed")}><ChevronDown aria-hidden="true" size={20} /></button>
        <button type="button" aria-label={copy.expandResults} disabled={sheet === "expanded"} onClick={() => setSheet(sheet === "collapsed" ? "partial" : "expanded")}><ChevronUp aria-hidden="true" size={20} /></button>
      </div>}
    </div>
  </div>;
}

export function MobileFilterPanel({ children, onDismiss }: { children: ReactNode; onDismiss: () => void }) {
  const mobile = useSyncExternalStore(subscribe, mobileSnapshot, serverSnapshot);
  const { filtersOpen } = useMobileMap();
  const dialog = useRef<HTMLDialogElement>(null);
  const { locale } = useLocale();
  const copy = getMapWorkspaceRedesignCopy(locale).mobile;
  useEffect(() => {
    const element = dialog.current;
    if (!element || !mobile) return;
    if (filtersOpen && !element.open) element.showModal();
    if (!filtersOpen && element.open) element.close();
  }, [filtersOpen, mobile]);
  useEffect(() => {
    if (!filtersOpen || !mobile) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [filtersOpen, mobile]);
  if (!mobile) return children;
  return <dialog ref={dialog} className={styles.filterDialog} aria-label={copy.filtersTitle} onCancel={(event) => { event.preventDefault(); onDismiss(); }}>
    <div className={styles.filterHeading}><strong>{copy.filtersTitle}</strong><button type="button" onClick={onDismiss}>{copy.closeFilters}</button></div>
    {children}
  </dialog>;
}

export function useMobileMapModel() {
  const { setView } = useMobileMap();
  function showView(view: MobileView) { setView(view); }
  return { showList: () => showView("list"), showMap: () => showView("map") };
}
