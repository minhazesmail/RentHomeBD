"use client";

import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useLocale } from "@/i18n/use-locale";
import { getOwnerEditorCopy } from "@/i18n/owner-editor-copy";
import { formatWorkflowText } from "@/i18n/workflow-copy";
import styles from "./listing-workflow-nav.module.css";

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
    const coordinates = Array.from(section.querySelectorAll<HTMLInputElement>('input[inputmode="decimal"]'))
      .map((input) => Number(input.value));
    return coordinates.length >= 2 && coordinates.slice(0, 2).every(Number.isFinite);
  }

  if (index === 4) return Boolean(section.querySelector(".listing-media-card"));

  return false;
}

export function ListingWorkflowNav({ mode }: { mode: "creation" | "editing" }) {
  const { locale, formatNumber } = useLocale();
  const copy = getOwnerEditorCopy(locale).workflow;
  const steps = copy.steps;
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

  const workflowAria = mode === "creation" ? copy.createAria : copy.editAria;
  const stepsAria = mode === "creation" ? copy.createStepsAria : copy.editStepsAria;

  return (
    <aside className={styles.workflow} aria-label={workflowAria}>
      <div className={styles.workflowHead}>
        <div>
          <span>{mode === "creation" ? copy.createListing : copy.editListing}</span>
          <strong>{formatWorkflowText(copy.stepOf, { step: formatNumber(activeStep + 1), total: formatNumber(steps.length) })}</strong>
        </div>
        <small>{formatWorkflowText(copy.ready, { complete: formatNumber(completedCount), total: formatNumber(steps.length) })}</small>
      </div>

      <nav className={styles.rail} aria-label={stepsAria}>
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
              <b className={styles.number}>{done ? <Check size={14} aria-hidden="true" /> : formatNumber(index + 1)}</b>
              <span className={styles.label}><span>{step.short}</span><small>{step.label}</small></span>
            </button>
          );
        })}
      </nav>

      <div className={styles.stepActions}>
        <button type="button" onClick={() => goToStep(activeStep - 1)} disabled={activeStep === 0}><ChevronLeft size={15} aria-hidden="true" /> {copy.back}</button>
        <button type="button" onClick={() => goToStep(activeStep + 1)} disabled={activeStep === steps.length - 1}>{copy.continue} <ChevronRight size={15} aria-hidden="true" /></button>
      </div>
      <p className={styles.workflowHint}>{copy.hint}</p>
    </aside>
  );
}
