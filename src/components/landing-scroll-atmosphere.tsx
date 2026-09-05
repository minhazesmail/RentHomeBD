"use client";

import "@/app/landing.css";
import "@/app/landing-alignment.css";
import "@/app/landing-redesign.css";
import "@/app/landing-pointed-fixes.css";
import "@/app/landing-trust-contrast-fix.css";
import "@/app/landing-atmosphere.css";
import { useEffect } from "react";

type SiteAtmosphereProps = {
  rootSelector?: string;
  sectionSelector?: string;
  initialTheme?: string;
};

/**
 * Lightweight scroll-reactive atmosphere.
 *
 * It observes only major section boundaries, then changes two data attributes on
 * the page root. CSS handles the visual transition with one fixed canvas and
 * compositor-friendly opacity/transform changes. There is no scroll handler,
 * requestAnimationFrame loop, canvas, WebGL, or continuously animated background.
 */
export function SiteAtmosphere({
  rootSelector = ".landing-shell",
  sectionSelector = "[data-scroll-theme]",
  initialTheme = "hero",
}: SiteAtmosphereProps) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(rootSelector);
    if (!root) return;

    const sections = Array.from(root.querySelectorAll<HTMLElement>(sectionSelector));
    if (!sections.length) return;

    let activeIndex = sections.findIndex(
      (section) => section.dataset.scrollTheme === root.dataset.atmosphere,
    );
    if (activeIndex < 0) activeIndex = 0;

    root.dataset.atmosphere =
      root.dataset.atmosphere || sections[activeIndex]?.dataset.scrollTheme || initialTheme;
    root.dataset.scrollDirection = root.dataset.scrollDirection || "down";

    const visibleSections = new Set<HTMLElement>();

    const updateAtmosphere = () => {
      if (!visibleSections.size) return;

      const viewportCenter = window.innerHeight / 2;
      let nextIndex = activeIndex;
      let closestDistance = Number.POSITIVE_INFINITY;
      let foundCandidate = false;

      sections.forEach((section, index) => {
        if (!visibleSections.has(section)) return;
        const rect = section.getBoundingClientRect();
        const sectionCenter = rect.top + rect.height / 2;
        const distance = Math.abs(sectionCenter - viewportCenter);

        if (distance < closestDistance) {
          closestDistance = distance;
          nextIndex = index;
          foundCandidate = true;
        }
      });

      if (!foundCandidate || nextIndex === activeIndex) return;

      root.dataset.scrollDirection = nextIndex > activeIndex ? "down" : "up";
      const nextTheme = sections[nextIndex]?.dataset.scrollTheme;
      if (nextTheme) root.dataset.atmosphere = nextTheme;
      activeIndex = nextIndex;
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const section = entry.target as HTMLElement;
          if (entry.isIntersecting) visibleSections.add(section);
          else visibleSections.delete(section);
        });
        updateAtmosphere();
      },
      {
        rootMargin: "-36% 0px -36% 0px",
        threshold: [0, 0.01],
      },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [initialTheme, rootSelector, sectionSelector]);

  return (
    <div className="site-atmosphere landing-scroll-atmosphere" aria-hidden="true">
      <span className="site-atmosphere__layer site-atmosphere__warm" />
      <span className="site-atmosphere__layer site-atmosphere__cool" />
      <span className="site-atmosphere__layer site-atmosphere__depth" />
    </div>
  );
}

export function LandingScrollAtmosphere() {
  return <SiteAtmosphere />;
}
