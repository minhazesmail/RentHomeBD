"use client";

import { ChevronDown, ChevronUp, List, Map, Maximize2, Minimize2, Minus, SlidersHorizontal } from "lucide-react";
import { createContext, useContext } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { useRef, useState } from "react";

import { getMapWorkspaceRedesignCopy } from "@/i18n/map-workspace-redesign-copy";
import { useLocale } from "@/i18n/use-locale";

import styles from "./mobile-map-model.module.css";

type MobileView = "map" | "list";
type SheetState = "collapsed" | "partial" | "expanded";

const SHEET_STATES: SheetState[] = ["collapsed", "partial", "expanded"];
const SHEET_SWIPE_THRESHOLD = 44;

type MobileMapModelContextValue = {
  showList: () => void;
  showMap: () => void;
  mapFocus: boolean;
  toggleMapFocus: () => void;
};

const MobileMapModelContext = createContext<MobileMapModelContextValue>({
  showList: () => {},
  showMap: () => {},
  mapFocus: false,
  toggleMapFocus: () => {},
});

export function useMobileMapModel() {
  return useContext(MobileMapModelContext);
}

function mobileViewport() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 960px)").matches;
}

function focusSelector(selector: string) {
  if (!mobileViewport()) return;
  const target = document.querySelector<HTMLElement>(selector);
  if (!target) return;
  if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
  window.requestAnimationFrame(() => target.focus({ preventScroll: true }));
}

export function MobileMapModel({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  const copy = getMapWorkspaceRedesignCopy(locale).mobile;
  const [view, setView] = useState<MobileView>("map");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sheet, setSheet] = useState<SheetState>("collapsed");
  const [mapFocus, setMapFocus] = useState(false);
  const sheetDragStartY = useRef<number | null>(null);

  function showView(nextView: MobileView) {
    setFiltersOpen(false);
    setView(nextView);
    if (nextView === "list") setMapFocus(false);
    window.setTimeout(() => focusSelector(nextView === "map" ? ".renter-map-panel" : ".renter-results-pane"), 0);
  }

  function toggleMapFocus() {
    setMapFocus((focused) => !focused);
    setView("map");
    setFiltersOpen(false);
  }

  function toggleFilters() {
    setFiltersOpen((open) => !open);
    window.setTimeout(() => focusSelector(".renter-search-toolbar"), 0);
  }

  function stepSheet(direction: "up" | "down") {
    setSheet((current) => {
      const currentIndex = SHEET_STATES.indexOf(current);
      const nextIndex = direction === "up"
        ? Math.min(SHEET_STATES.length - 1, currentIndex + 1)
        : Math.max(0, currentIndex - 1);
      return SHEET_STATES[nextIndex];
    });
  }

  function handleSheetPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    sheetDragStartY.current = event.clientY;
  }

  function handleSheetPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const startY = sheetDragStartY.current;
    sheetDragStartY.current = null;
    if (startY === null) return;
    const delta = event.clientY - startY;
    if (Math.abs(delta) < SHEET_SWIPE_THRESHOLD) return;
    stepSheet(delta < 0 ? "up" : "down");
  }

  function handleClickCapture(event: ReactMouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (!target.closest(".renter-result-map-button")) return;
    setFiltersOpen(false);
    setView("map");
    setSheet("collapsed");
    window.setTimeout(() => focusSelector(".renter-map-panel"), 0);
  }

  return (
    <div
      className={`${styles.mobileMapModel} ${styles.mobileMapLayout}`}
      data-mobile-view={view}
      data-mobile-filters={filtersOpen ? "open" : "closed"}
      data-mobile-sheet={sheet}
      data-map-focus={mapFocus ? "true" : "false"}
      onClickCapture={handleClickCapture}
    >
      {filtersOpen && (
        <button
          className={styles.filterScrim}
          type="button"
          aria-label={copy.closeFilters}
          onClick={() => setFiltersOpen(false)}
        />
      )}

      <div
        className={styles.sheetControls}
        role="group"
        aria-label={copy.results}
        onPointerDown={handleSheetPointerDown}
        onPointerUp={handleSheetPointerUp}
        onPointerCancel={() => { sheetDragStartY.current = null; }}
      >
        <span className={styles.sheetGrip} aria-hidden="true" />
        <div className={styles.sheetControlButtons}>
          <button
            className={sheet === "collapsed" ? styles.sheetActive : undefined}
            type="button"
            aria-label={copy.collapseResults}
            aria-pressed={sheet === "collapsed"}
            onClick={() => setSheet("collapsed")}
          >
            <ChevronDown size={16} aria-hidden="true" />
            <span>{copy.collapsed}</span>
          </button>
          <button
            className={sheet === "partial" ? styles.sheetActive : undefined}
            type="button"
            aria-label={copy.partialResults}
            aria-pressed={sheet === "partial"}
            onClick={() => setSheet("partial")}
          >
            {sheet === "collapsed" ? <ChevronUp size={16} aria-hidden="true" /> : <Minus size={16} aria-hidden="true" />}
            <span>{sheet === "collapsed" ? copy.results : copy.partial}</span>
          </button>
          <button
            className={sheet === "expanded" ? styles.sheetActive : undefined}
            type="button"
            aria-label={copy.expandResults}
            aria-pressed={sheet === "expanded"}
            onClick={() => setSheet("expanded")}
          >
            <ChevronUp size={16} aria-hidden="true" />
            <span>{copy.expanded}</span>
          </button>
        </div>
      </div>

      <nav className={styles.mobileMapNavigator} aria-label={`${copy.map}, ${copy.list}, ${copy.filters}`}>
        <button
          className={view === "map" && !filtersOpen ? styles.active : undefined}
          type="button"
          aria-pressed={view === "map" && !filtersOpen}
          onClick={() => showView("map")}
        >
          <Map size={18} aria-hidden="true" />
          {copy.map}
        </button>
        <button
          className={view === "list" && !filtersOpen ? styles.active : undefined}
          type="button"
          aria-pressed={view === "list" && !filtersOpen}
          onClick={() => showView("list")}
        >
          <List size={18} aria-hidden="true" />
          {copy.list}
        </button>
        <button
          className={filtersOpen ? styles.active : styles.filterButton}
          type="button"
          aria-expanded={filtersOpen}
          onClick={toggleFilters}
        >
          <SlidersHorizontal size={18} aria-hidden="true" />
          <span>{filtersOpen ? copy.done : copy.filters}</span>
        </button>
        {view === "map" && !filtersOpen && (
          <button className={styles.focusButton} type="button" data-mobile-map-focus aria-label={mapFocus ? copy.restoreResults : copy.focusMap} aria-pressed={mapFocus} onClick={toggleMapFocus}>
            {mapFocus ? <Minimize2 size={19} aria-hidden="true" /> : <Maximize2 size={19} aria-hidden="true" />}
          </button>
        )}
      </nav>
      <MobileMapModelContext.Provider value={{ showList: () => showView("list"), showMap: () => showView("map"), mapFocus, toggleMapFocus }}>
        {children}
      </MobileMapModelContext.Provider>
    </div>
  );
}
