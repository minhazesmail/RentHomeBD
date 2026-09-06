"use client";

import Link from "next/link";
import { useRef, useState, type KeyboardEvent } from "react";

import { useLocale } from "@/i18n/use-locale";

type Persona = "renter" | "owner";

type Step = {
  stage: string;
  title: string;
  description: string;
  icon: "map" | "match" | "message" | "pin" | "people" | "publish";
};

const LIST_PROPERTY_HREF = "/login?intent=list-property&next=%2Fowner%2Fproperties%2Fnew";

function StepIcon({ name }: { name: Step["icon"] }) {
  if (name === "map") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18 3.5 20.5V6L9 3.5m0 14.5 6 2.5m-6-2.5V3.5m6 17 5.5-2.5V3.5L15 6m0 14.5V6m0 0L9 3.5" /></svg>;
  if (name === "match") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7.5-2 2 2 4-4M2.5 20c.7-4 3-6 6-6 2.1 0 3.8.8 4.9 2.2" /></svg>;
  if (name === "message") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5h16v11H9l-5 4v-15Zm4 4h8m-8 3h5" /></svg>;
  if (name === "pin") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /></svg>;
  if (name === "people") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8-1a2.5 2.5 0 1 0 0-5m-14 15c.6-4 2.7-6 6-6s5.4 2 6 6m1-6c3.2.2 5 2.2 5.5 5" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19.5h16v-11H4v11Zm3-11V5h10v3.5M8 13h8m-8 3h5" /></svg>;
}

export function HowItWorksTabs() {
  const { dictionary, formatNumber } = useLocale();
  const copy = dictionary.landing.how;
  const [persona, setPersona] = useState<Persona>("renter");
  const renterTabRef = useRef<HTMLButtonElement | null>(null);
  const ownerTabRef = useRef<HTMLButtonElement | null>(null);
  const isRenter = persona === "renter";
  const renterSteps: Step[] = [
    { stage: copy.renterStage1, title: copy.renterTitle1, description: copy.renterDescription1, icon: "map" },
    { stage: copy.renterStage2, title: copy.renterTitle2, description: copy.renterDescription2, icon: "match" },
    { stage: copy.renterStage3, title: copy.renterTitle3, description: copy.renterDescription3, icon: "message" },
  ];
  const ownerSteps: Step[] = [
    { stage: copy.ownerStage1, title: copy.ownerTitle1, description: copy.ownerDescription1, icon: "pin" },
    { stage: copy.ownerStage2, title: copy.ownerTitle2, description: copy.ownerDescription2, icon: "people" },
    { stage: copy.ownerStage3, title: copy.ownerTitle3, description: copy.ownerDescription3, icon: "publish" },
  ];
  const steps = isRenter ? renterSteps : ownerSteps;
  const actionHref = isRenter ? "/homes" : LIST_PROPERTY_HREF;
  const actionLabel = isRenter ? copy.renterAction : copy.ownerAction;
  const outcome = isRenter ? copy.renterOutcome : copy.ownerOutcome;

  function activateTab(nextPersona: Persona) {
    setPersona(nextPersona);
    window.requestAnimationFrame(() => {
      (nextPersona === "renter" ? renterTabRef.current : ownerTabRef.current)?.focus();
    });
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Home") return activateTab("renter");
    if (event.key === "End") return activateTab("owner");
    activateTab(persona === "renter" ? "owner" : "renter");
  }

  return (
    <div className={`landing-how-tabs-shell ${persona}`}>
      <div className="landing-how-controls">
        <div className="landing-persona-tabs" role="tablist" aria-label={copy.tabsAria}>
          <button ref={renterTabRef} id="landing-persona-tab-renter" type="button" role="tab" aria-selected={isRenter} aria-controls="landing-persona-panel" tabIndex={isRenter ? 0 : -1} className={isRenter ? "active" : ""} onClick={() => setPersona("renter")} onKeyDown={handleTabKeyDown}>{copy.renterTab}</button>
          <button ref={ownerTabRef} id="landing-persona-tab-owner" type="button" role="tab" aria-selected={!isRenter} aria-controls="landing-persona-panel" tabIndex={!isRenter ? 0 : -1} className={!isRenter ? "active" : ""} onClick={() => setPersona("owner")} onKeyDown={handleTabKeyDown}>{copy.ownerTab}</button>
        </div>

        <Link className="landing-how-primary-link" href={actionHref}><span>{actionLabel}</span><span aria-hidden="true">→</span></Link>
      </div>

      <article id="landing-persona-panel" className={`landing-how-panel ${persona}`} role="tabpanel" aria-labelledby={isRenter ? "landing-persona-tab-renter" : "landing-persona-tab-owner"}>
        <div className="landing-how-panel-heading">
          <div><span className="landing-persona-kicker">{isRenter ? copy.renterKicker : copy.ownerKicker}</span><h3>{isRenter ? copy.renterTitle : copy.ownerTitle}</h3></div>
        </div>

        <ol className="landing-step-cards" aria-label={isRenter ? copy.renterJourneyAria : copy.ownerJourneyAria}>
          {steps.map((step, index) => (
            <li key={step.icon}>
              <div className="landing-step-topline">
                <div className="landing-step-icon"><StepIcon name={step.icon} /></div>
                <div className="landing-step-meta"><span>{formatNumber(index + 1, { minimumIntegerDigits: 2, useGrouping: false })}</span><small>{step.stage}</small></div>
              </div>
              <div className="landing-step-copy"><strong>{step.title}</strong><p>{step.description}</p></div>
            </li>
          ))}
        </ol>

        <div className="landing-how-outcome"><span aria-hidden="true" /><p>{outcome}</p></div>
      </article>
    </div>
  );
}
