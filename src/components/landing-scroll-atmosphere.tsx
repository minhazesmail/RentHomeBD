"use client";

import "@/app/landing.css";
import "@/app/landing-alignment.css";
import "@/app/landing-redesign.css";
import "@/app/landing-pointed-fixes.css";
import "@/app/landing-trust-contrast-fix.css";
import { useEffect } from "react";

export function LandingScrollAtmosphere() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".landing-shell");
    if (!root) return;

    const sections = Array.from(root.querySelectorAll<HTMLElement>("[data-scroll-theme]"));
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const activeEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const nextTheme = (activeEntry?.target as HTMLElement | undefined)?.dataset.scrollTheme;

        if (nextTheme && root.dataset.landingTheme !== nextTheme) {
          root.dataset.landingTheme = nextTheme;
        }
      },
      {
        rootMargin: "-38% 0px -47% 0px",
        threshold: [0, 0.01, 0.1],
      },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  // The theme still follows the active section, but the visual atmosphere is a
  // single fixed layer. The previous implementation rendered eight oversized,
  // continuously animated compositor layers and was the main source of scroll
  // jank on the landing page.
  return <div className="landing-scroll-atmosphere" aria-hidden="true" />;
}
