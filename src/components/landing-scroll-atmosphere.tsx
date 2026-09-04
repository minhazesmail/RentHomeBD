"use client";

import "@/app/landing.css";
import "@/app/landing-alignment.css";
import "@/app/landing-redesign.css";
import "@/app/landing-pointed-fixes.css";
import { useEffect } from "react";

const SCENES = ["hero", "trust", "journey", "homes", "local", "clarity", "action", "footer"] as const;

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

  return (
    <div className="landing-scroll-atmosphere" aria-hidden="true">
      {SCENES.map((scene) => <span className="landing-scroll-scene" data-scene={scene} key={scene} />)}
    </div>
  );
}
