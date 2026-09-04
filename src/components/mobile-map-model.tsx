"use client";

import { List, Map } from "lucide-react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { useEffect, useState } from "react";

import styles from "./mobile-map-model.module.css";

type MobileView = "map" | "results";

function mobileViewport() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 960px)").matches;
}

function scrollToSelector(selector: string, moveFocus = false) {
  if (!mobileViewport()) return;
  const target = document.querySelector<HTMLElement>(selector);
  if (!target) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });

  if (moveFocus) {
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    window.requestAnimationFrame(() => target.focus({ preventScroll: true }));
  }
}

export function MobileMapModel({ children }: { children: ReactNode }) {
  const [view, setView] = useState<MobileView>("map");

  useEffect(() => {
    const requestedView = new URLSearchParams(window.location.search).get("view");
    if (requestedView === "results") setView("results");
  }, []);

  function selectView(nextView: MobileView, moveFocus = false) {
    setView(nextView);

    const url = new URL(window.location.href);
    url.searchParams.set("view", nextView);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);

    window.requestAnimationFrame(() => {
      scrollToSelector(nextView === "map" ? ".renter-map-panel" : ".renter-search-sidebar", moveFocus);
    });
  }

  function handleClickCapture(event: ReactMouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (!target.closest(".renter-result-map-button")) return;
    window.setTimeout(() => selectView("map", true), 0);
  }

  return (
    <div
      className={`${styles.mobileMapModel} ${styles.mobileMapLayout} ${view === "map" ? styles.mobileViewMap : styles.mobileViewResults}`}
      onClickCapture={handleClickCapture}
    >
      <nav className={styles.mobileMapNavigator} aria-label="Map and result views">
        <button
          className={view === "map" ? styles.isActive : undefined}
          type="button"
          onClick={() => selectView("map", true)}
          aria-pressed={view === "map"}
        >
          <Map size={17} aria-hidden="true" />
          Map
        </button>
        <button
          className={view === "results" ? styles.isActive : undefined}
          type="button"
          onClick={() => selectView("results", true)}
          aria-pressed={view === "results"}
        >
          <List size={17} aria-hidden="true" />
          Results & filters
        </button>
      </nav>
      {children}
    </div>
  );
}
