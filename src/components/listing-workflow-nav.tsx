"use client";

import { useEffect, useState } from "react";

const steps = [
  "Basics & rent",
  "Home details",
  "Tenant fit",
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
    setActiveStep(index);
    target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    window.setTimeout(() => target.querySelector<HTMLElement>("input, select, textarea, button")?.focus({ preventScroll: true }), prefersReducedMotion() ? 0 : 420);
  }

  return (
    <nav className="listing-workflow-ribbon" aria-label={`Listing ${mode} steps`}>
      {steps.map((label, index) => (
        <button
          className={`listing-workflow-step${activeStep === index ? " is-active" : ""}`}
          type="button"
          key={label}
          aria-current={activeStep === index ? "step" : undefined}
          onClick={() => goToStep(index)}
        >
          <b>{index + 1}</b>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
