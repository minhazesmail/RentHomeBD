"use client";

import Link from "next/link";
import { useState } from "react";

type Persona = "renter" | "owner";

type Step = {
  title: string;
  description: string;
  icon: "map" | "match" | "message" | "pin" | "people" | "publish";
};

const LIST_PROPERTY_HREF = "/login?intent=list-property&next=%2Fowner%2Fproperties%2Fnew";

const renterSteps: Step[] = [
  { title: "Search the map", description: "Choose the area that matters to you and see homes at their real pinned locations.", icon: "map" },
  { title: "See who it fits", description: "Check tenant type, rent, bedrooms, and key details before making contact.", icon: "match" },
  { title: "Message the owner", description: "Open the listing and contact the owner directly when the home looks right.", icon: "message" },
];

const ownerSteps: Step[] = [
  { title: "Pin your property", description: "Place the home on the map and add the structured details renters need.", icon: "pin" },
  { title: "Set who it is for", description: "Choose the tenant types that fit the property so expectations are clear upfront.", icon: "people" },
  { title: "Reach matched renters", description: "Publish a moderated listing that renters can discover through map search.", icon: "publish" },
];

function StepIcon({ name }: { name: Step["icon"] }) {
  if (name === "map") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18 3.5 20.5V6L9 3.5m0 14.5 6 2.5m-6-2.5V3.5m6 17 5.5-2.5V3.5L15 6m0 14.5V6m0 0L9 3.5" /></svg>;
  if (name === "match") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7.5-2 2 2 4-4M2.5 20c.7-4 3-6 6-6 2.1 0 3.8.8 4.9 2.2" /></svg>;
  if (name === "message") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5h16v11H9l-5 4v-15Zm4 4h8m-8 3h5" /></svg>;
  if (name === "pin") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /></svg>;
  if (name === "people") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8-1a2.5 2.5 0 1 0 0-5m-14 15c.6-4 2.7-6 6-6s5.4 2 6 6m1-6c3.2.2 5 2.2 5.5 5" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19.5h16v-11H4v11Zm3-11V5h10v3.5M8 13h8m-8 3h5" /></svg>;
}

export function HowItWorksTabs() {
  const [persona, setPersona] = useState<Persona>("renter");
  const isRenter = persona === "renter";
  const steps = isRenter ? renterSteps : ownerSteps;

  return (
    <div className="landing-how-tabs-shell">
      <div className="landing-persona-tabs" role="tablist" aria-label="Choose renter or owner steps">
        <button type="button" role="tab" aria-selected={isRenter} className={isRenter ? "active" : ""} onClick={() => setPersona("renter")}>I am a renter</button>
        <button type="button" role="tab" aria-selected={!isRenter} className={!isRenter ? "active" : ""} onClick={() => setPersona("owner")}>I am an owner</button>
      </div>

      <article className={`landing-how-panel ${persona}`} role="tabpanel">
        <div className="landing-how-panel-heading">
          <div>
            <span className="landing-persona-kicker">{isRenter ? "Find with confidence" : "List with clarity"}</span>
            <h3>{isRenter ? "Find a home that actually fits." : "Publish once, match more clearly."}</h3>
          </div>
          <Link className="text-link" href={isRenter ? "/homes" : LIST_PROPERTY_HREF}>{isRenter ? "Start searching →" : "List your property →"}</Link>
        </div>

        <ol className="landing-step-cards">
          {steps.map((step, index) => (
            <li key={step.title}>
              <div className="landing-step-icon"><StepIcon name={step.icon} /></div>
              <div className="landing-step-copy">
                <span>0{index + 1}</span>
                <strong>{step.title}</strong>
                <p>{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </article>
    </div>
  );
}
