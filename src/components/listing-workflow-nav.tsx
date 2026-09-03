"use client";

import { useEffect, useState } from "react";

import styles from "./listing-workflow-nav.module.css";

const steps = [
  "Basics & rent",
  "Home details",
  "Renter fit",
  "Exact map pin",
  "Photos & video",
] as const;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function ListingWorkflowNav({ mode }: { mode: "creation" | "editing" }) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>(".listing-form .listing-section"));
    if (!sections.length) return;

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const index = sections.indexOf(visible.target as HTMLElement);
      if (index >= 0) setActiveStep(index);
    }, { rootMargin: "-22% 0px -58% 0px", threshold: [0, 0.1, 0.3, 0.6] });

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  function goToStep(index: number) {
    const sections = document.querySelectorAll<HTMLElement>(".listing-form .listing-section");
    const target = sections[index];
    if (!target) return;
    const reducedMotion = prefersReducedMotion();
    setActiveStep(index);
    target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    window.setTimeout(() => target.querySelector<HTMLElement>("input, select, textarea, button")?.focus({ preventScroll: true }), reducedMotion ? 0 : 420);
  }

  return (
    <nav className={styles.rail} aria-label={`Listing ${mode} steps`}>
      {steps.map((label, index) => (
        <button
          className={styles.step}
          type="button"
          key={label}
          aria-current={activeStep === index ? "step" : undefined}
          onClick={() => goToStep(index)}
        >
          <b className={styles.number}>{index + 1}</b>
          <span className={styles.label}>{label}</span>
        </button>
      ))}
    </nav>
  );
}
