"use client";

import Link from "next/link";
import { useState } from "react";

import { useLocale } from "@/i18n/use-locale";

type FaqCategory = "getting-started" | "trust-safety" | "renter-fit" | "pricing";
type FaqFilter = "all" | FaqCategory;

type FaqItem = {
  question: string;
  answer: string;
  category: FaqCategory;
  badges?: string[];
};

export function LandingFaqSection() {
  const { dictionary, formatNumber } = useLocale();
  const copy = dictionary.landing.faq;
  const [filter, setFilter] = useState<FaqFilter>("all");
  const filters: Array<{ id: FaqFilter; label: string }> = [
    { id: "all", label: copy.filterAll },
    { id: "getting-started", label: copy.filterGettingStarted },
    { id: "trust-safety", label: copy.filterTrustSafety },
    { id: "pricing", label: copy.filterPricing },
    { id: "renter-fit", label: copy.filterRenterFit },
  ];
  const faqs: FaqItem[] = [
    { category: "getting-started", question: copy.q1, answer: copy.a1 },
    { category: "trust-safety", question: copy.q2, answer: copy.a2, badges: [copy.q2Badge1, copy.q2Badge2, copy.q2Badge3, copy.q2Badge4] },
    { category: "trust-safety", question: copy.q3, answer: copy.a3, badges: [copy.q3Badge1, copy.q3Badge2, copy.q3Badge3] },
    { category: "renter-fit", question: copy.q4, answer: copy.a4 },
    { category: "pricing", question: copy.q5, answer: copy.a5 },
  ];
  const visibleFaqs = faqs.filter((faq) => filter === "all" || faq.category === filter);

  return (
    <section className="landing-content-section landing-faq landing-faq-editorial" data-scroll-theme="clarity" aria-labelledby="faq-heading">
      <div className="landing-faq-editorial-intro">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2 id="faq-heading">{copy.title}</h2>
        <p>{copy.description}</p>
      </div>

      <div className="landing-faq-topic-row" aria-label={copy.filterAria}>
        {filters.map((item) => (
          <button key={item.id} type="button" className={filter === item.id ? "is-active" : undefined} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>
        ))}
      </div>

      <div className="landing-faq-editorial-grid">
        <aside className="landing-faq-rail" aria-label={copy.guidanceAria}>
          <div><span>{copy.quickKicker}</span><strong>{copy.quickTitle}</strong><p>{copy.quickDescription}</p></div>
          <div className="landing-faq-rail-links"><Link href="/about">{copy.readAbout} <span aria-hidden="true">→</span></Link><Link href="/contact">{copy.contactUs} <span aria-hidden="true">→</span></Link></div>
        </aside>

        <div className="landing-faq-list landing-faq-editorial-list" aria-live="polite">
          {visibleFaqs.map((faq) => {
            const number = formatNumber(faqs.indexOf(faq) + 1, { minimumIntegerDigits: 2, useGrouping: false });
            return (
              <details key={faq.question} className="landing-faq-item landing-faq-editorial-item">
                <summary><span className="landing-faq-number" aria-hidden="true">{number}</span><span className="landing-faq-question">{faq.question}</span><span className="landing-faq-disclosure" aria-hidden="true">+</span></summary>
                <div className="landing-faq-answer">
                  <p>{faq.answer}</p>
                  {faq.badges && <div className="landing-faq-answer-badges" aria-label={copy.trustSignalsAria}>{faq.badges.map((badge) => <span key={badge}>{badge}</span>)}</div>}
                </div>
              </details>
            );
          })}
        </div>
      </div>

      <div className="landing-faq-help-strip">
        <div><span>{copy.helpKicker}</span><strong>{copy.helpTitle}</strong></div>
        <div><Link href="/about">{copy.aboutNearBasha}</Link><Link href="/contact">{copy.contactUs} <span aria-hidden="true">→</span></Link></div>
      </div>
    </section>
  );
}
