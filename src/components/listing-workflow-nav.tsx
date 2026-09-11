"use client";

import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import styles from "./listing-workflow-nav.module.css";

const steps = [
  { label: "Basics & rent", short: "Basics" },
  { label: "Home details", short: "Details" },
  { label: "Renter fit", short: "Renter fit" },
  { label: "Exact map pin", short: "Location" },
  { label: "Photos & video", short: "Media" },
] as const;

function sectionComplete(section: HTMLElement, index: number, visited: Set<number>) {
  if (index === 0) {
    const title = section.querySelector<HTMLInputElement>('input[maxlength="140"]')?.value.trim() ?? "";
    const propertyType = section.querySelector<HTMLSelectElement>("select")?.value ?? "";
    const availableFrom = section.querySelector<HTMLInputElement>('input[type="date"]')?.value ?? "";
    const rent = section.querySelector<HTMLInputElement>('input[inputmode="numeric"]')?.value.trim() ?? "";
    return title.length >= 5 && Boolean(propertyType) && Boolean(availableFrom) && Number(rent) > 0;
  }

  if (index === 1) return visited.has(index);
  if (index === 2) return Boolean(section.querySelector<HTMLInputElement>('input[type="checkbox"]:checked'));

  if (index === 3) {
    const readout = section.querySelector<HTMLElement>(".coordinate-readout strong")?.textContent?.trim();
    return Boolean(readout && readout !== "Pin not placed yet");
  }

  if (index === 4) {
    const mediaCard = section.querySelector(".listing-media-card");
    const countText = section.querySelector<HTMLElement>(".form-hint")?.textContent ?? "";
    const count = Number(countText.match(/Current media count:\s*(\d+)/)?.[1] ?? 0);
    return Boolean(mediaCard) || count > 0;
  }

  return false;
}

export function ListingWorkflowNav({ mode }: { mode: "creation" | "editing" }) {
  const [activeStep, setActiveStep] = useState(0);
  const [visited, setVisited] = useState<Set<number>>(() => new Set([0]));
  const [completion, setCompletion] = useState<boolean[]>(() => steps.map(() => false));

  useEffect(() => {
    const form = document.querySelector<HTMLFormElement>(".listing-form");
    if (!form) return;
    const sections = Array.from(form.querySelectorAll<HTMLElement>(".listing-section"));
    if (!sections.length) return;

    form.dataset.guidedEditor = "true";

    const syncVisibility = () => {
      sections.forEach((section, index) => {
        const active = index === activeStep;
        section.hidden = !active;
        section.setAttribute("aria-hidden", active ? "false" : "true");
      });
    };

    const syncCompletion = () => {
      setCompletion(sections.map((section, index) => sectionComplete(section, index, visited)));
    };

    syncVisibility();
    syncCompletion();
    form.addEventListener("input", syncCompletion);
    form.addEventListener("change", syncCompletion);
    const observer = new MutationObserver(syncCompletion);
    observer.observe(form, { childList: true, subtree: true, characterData: true });

    return () => {
      form.removeEventListener("input", syncCompletion);
      form.removeEventListener("change", syncCompletion);
      observer.disconnect();
      delete form.dataset.guidedEditor;
      sections.forEach((section) => {
        section.hidden = false;
        section.removeAttribute("aria-hidden");
      });
    };
  }, [activeStep, visited]);

  const completedCount = useMemo(() => completion.filter(Boolean).length, [completion]);

  function goToStep(index: number) {
    const form = document.querySelector<HTMLFormElement>(".listing-form");
    const sections = Array.from(form?.querySelectorAll<HTMLElement>(".listing-section") ?? []);
    if (!sections[index]) return;
    setVisited((current) => new Set([...current, index]));
    setActiveStep(index);
    window.requestAnimationFrame(() => {
      const target = sections[index];
      target?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      window.setTimeout(() => target?.querySelector<HTMLElement>("input, select, textarea, button")?.focus({ preventScroll: true }), 260);
    });
  }

  return (
    <aside className={styles.workflow} aria-label={`Listing ${mode} workflow`}>
      <div className={styles.workflowHead}>
        <div>
          <span>{mode === "creation" ? "Create listing" : "Edit listing"}</span>
          <strong>Step {activeStep + 1} of {steps.length}</strong>
        </div>
        <small>{completedCount}/{steps.length} ready</small>
      </div>

      <nav className={styles.rail} aria-label={`Listing ${mode} steps`}>
        {steps.map((step, index) => {
          const done = completion[index];
          return (
            <button
              className={styles.step}
              type="button"
              key={step.label}
              aria-current={activeStep === index ? "step" : undefined}
              data-complete={done ? "true" : "false"}
              onClick={() => goToStep(index)}
            >
              <b className={styles.number}>{done ? <Check size={14} aria-hidden="true" /> : index + 1}</b>
              <span className={styles.label}><span>{step.short}</span><small>{step.label}</small></span>
            </button>
          );
        })}
      </nav>

      <div className={styles.stepActions}>
        <button type="button" onClick={() => goToStep(activeStep - 1)} disabled={activeStep === 0}><ChevronLeft size={15} aria-hidden="true" /> Back</button>
        <button type="button" onClick={() => goToStep(activeStep + 1)} disabled={activeStep === steps.length - 1}>Continue <ChevronRight size={15} aria-hidden="true" /></button>
      </div>
      <p className={styles.workflowHint}>Save a draft anytime. Submission checks apply when you send the listing for review.</p>
    </aside>
  );
}
