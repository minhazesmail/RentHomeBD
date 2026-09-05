"use client";

import { List, Map, SlidersHorizontal } from "lucide-react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { useState } from "react";

import styles from "./mobile-map-model.module.css";

type MobileView = "map" | "list";

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
  const [view, setView] = useState<MobileView>("map");
  const [filtersOpen, setFiltersOpen] = useState(false);

  function showView(nextView: MobileView) {
    setFiltersOpen(false);
    setView(nextView);
    window.setTimeout(() => focusSelector(nextView === "map" ? ".renter-map-panel" : ".renter-search-sidebar"), 0);
  }

  function toggleFilters() {
    setFiltersOpen((open) => !open);
  }

  function handleClickCapture(event: ReactMouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (!target.closest(".renter-result-map-button")) return;
    setFiltersOpen(false);
    setView("map");
    window.setTimeout(() => focusSelector(".renter-map-panel"), 0);
  }

  return (
    <div
      className={`${styles.mobileMapModel} ${styles.mobileMapLayout}`}
      data-mobile-view={view}
      data-mobile-filters={filtersOpen ? "open" : "closed"}
      onClickCapture={handleClickCapture}
    >
      {filtersOpen && (
        <button
          className={styles.filterScrim}
          type="button"
          aria-label="Close filters"
          onClick={() => setFiltersOpen(false)}
        />
      )}
      <nav className={styles.mobileMapNavigator} aria-label="Map, list and filter views">
        <button
          className={view === "map" && !filtersOpen ? styles.active : undefined}
          type="button"
          aria-pressed={view === "map" && !filtersOpen}
          onClick={() => showView("map")}
        >
          <Map size={17} aria-hidden="true" />
          Map
        </button>
        <button
          className={view === "list" && !filtersOpen ? styles.active : undefined}
          type="button"
          aria-pressed={view === "list" && !filtersOpen}
          onClick={() => showView("list")}
        >
          <List size={17} aria-hidden="true" />
          List
        </button>
        <button
          className={filtersOpen ? styles.active : styles.filterButton}
          type="button"
          aria-expanded={filtersOpen}
          onClick={toggleFilters}
        >
          <SlidersHorizontal size={17} aria-hidden="true" />
          <span>{filtersOpen ? "Done" : "Filters"}</span>
        </button>
      </nav>
      {children}
    </div>
  );
}
