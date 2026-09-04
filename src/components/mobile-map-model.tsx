"use client";

import { List, Map } from "lucide-react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";

import styles from "./mobile-map-model.module.css";

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
  function handleClickCapture(event: ReactMouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (!target.closest(".renter-result-map-button")) return;
    window.setTimeout(() => scrollToSelector(".renter-map-panel", true), 0);
  }

  return (
    <div className={`${styles.mobileMapModel} ${styles.mobileMapLayout}`} onClickCapture={handleClickCapture}>
      <nav className={styles.mobileMapNavigator} aria-label="Map and result views">
        <button type="button" onClick={() => scrollToSelector(".renter-map-panel", true)}>
          <Map size={17} aria-hidden="true" />
          Map
        </button>
        <button type="button" onClick={() => scrollToSelector(".renter-search-sidebar", true)}>
          <List size={17} aria-hidden="true" />
          Results & filters
        </button>
      </nav>
      {children}
    </div>
  );
}
