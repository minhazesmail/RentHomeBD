"use client";

import { ChevronDown, ChevronUp, List, Map, Minus, SlidersHorizontal } from "lucide-react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { useState } from "react";

import { getMapWorkspaceRedesignCopy } from "@/i18n/map-workspace-redesign-copy";
import { useLocale } from "@/i18n/use-locale";

import styles from "./mobile-map-model.module.css";

type MobileView = "map" | "list";
type SheetState = "collapsed" | "partial" | "expanded";

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
  const [sheet, setSheet] = useState<SheetState>("partial");

  function showView(nextView: MobileView) {
    setFiltersOpen(false);
    setView(nextView);
    if (nextView === "map" && sheet === "collapsed") setSheet("partial");
    window.setTimeout(() => focusSelector(nextView === "map" ? ".renter-map-panel" : ".renter-results-pane"), 0);
  }

  function toggleFilters() {
    setFiltersOpen((open) => !open);
    window.setTimeout(() => focusSelector(".renter-search-toolbar"), 0);
  }

  function handleClickCapture(event: ReactMouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (!target.closest(".renter-result-map-button")) return;
    setFiltersOpen(false);
    setView("map");
    setSheet("partial");
    window.setTimeout(() => focusSelector(".renter-map-panel"), 0);
  }

  return (
    <div
      className={`${styles.mobileMapModel} ${styles.mobileMapLayout}`}
      data-mobile-view={view}
      data-mobile-filters={filtersOpen ? "open" : "closed"}
      data-mobile-sheet={sheet}
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

      <div className={styles.sheetControls} role="group" aria-label={copy.results}>
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
          <Minus size={16} aria-hidden="true" />
          <span>{copy.partial}</span>
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

      <nav className={styles.mobileMapNavigator} aria-label={`${copy.map}, ${copy.list}, ${copy.filters}`}>
        <button
          className={view === "map" && !filtersOpen ? styles.active : undefined}
          type="button"
          aria-pressed={view === "map" && !filtersOpen}
          onClick={() => showView("map")}
        >
          <Map size={17} aria-hidden="true" />
          {copy.map}
        </button>
        <button
          className={view === "list" && !filtersOpen ? styles.active : undefined}
          type="button"
          aria-pressed={view === "list" && !filtersOpen}
          onClick={() => showView("list")}
        >
          <List size={17} aria-hidden="true" />
          {copy.list}
        </button>
        <button
          className={filtersOpen ? styles.active : styles.filterButton}
          type="button"
          aria-expanded={filtersOpen}
          onClick={toggleFilters}
        >
          <SlidersHorizontal size={17} aria-hidden="true" />
          <span>{filtersOpen ? copy.done : copy.filters}</span>
        </button>
      </nav>
      {children}
    </div>
  );
}
