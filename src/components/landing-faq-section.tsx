"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type FaqCategory = "getting-started" | "trust-safety" | "renter-fit" | "pricing";
type FaqFilter = "all" | FaqCategory;

type FaqItem = {
  question: string;
  answer: string;
  category: FaqCategory;
  badges?: string[];
};

const FAQ_FILTERS: Array<{ id: FaqFilter; label: string }> = [
  { id: "all", label: "All questions" },
  { id: "getting-started", label: "Getting started" },
  { id: "trust-safety", label: "Trust & safety" },
  { id: "pricing", label: "Pricing" },
  { id: "renter-fit", label: "Renter fit" },
];

const FAQS: FaqItem[] = [
  {
    category: "getting-started",
    question: "Where is NearBasha available?",
    answer: "NearBasha is a Bangladesh-focused rental marketplace launching first in Dhaka. The current location search supports the Dhaka areas and landmarks shown in the product; broader Bangladesh coverage can expand as local inventory and location support grow.",
  },
  {
    category: "trust-safety",
    question: "How does NearBasha reduce scams or fake listings?",
    answer: "NearBasha combines phone OTP, listing moderation, reporting tools, and freshness controls to reduce obvious abuse and stale inventory. These safeguards lower risk, but renters should still inspect the property, verify who they are dealing with, and avoid sending money before they are satisfied with the listing and the person behind it.",
    badges: ["Phone OTP", "Moderated before live", "Reporting", "Freshness checks"],
  },
  {
    category: "trust-safety",
    question: "Are listings verified?",
    answer: "Listings can carry moderation and account-verification signals, but those signals are not a guarantee of legal identity, property ownership, or listing accuracy. Renters should still review details carefully and complete their own checks before making payments or commitments.",
    badges: ["Moderation", "Account signals", "Renter checks still matter"],
  },
  {
    category: "renter-fit",
    question: "How does renter-type matching work?",
    answer: "Owners specify which renter types a property is suitable for, such as Family, Bachelor, Student, or Job holder. Renters can use those structured preferences to focus on listings that are more likely to fit before they spend time contacting an owner.",
  },
  {
    category: "pricing",
    question: "What does NearBasha cost?",
    answer: "NearBasha is free to browse and list during the current launch phase. There is no NearBasha checkout in the product today. If paid features are introduced later, their price and what they include will be shown before you choose to pay.",
  },
];

export function LandingFaqSection() {
  const [filter, setFilter] = useState<FaqFilter>("all");

  const visibleFaqs = useMemo(
    () => FAQS.filter((faq) => filter === "all" || faq.category === filter),
    [filter],
  );

  return (
    <section className="landing-content-section landing-faq landing-faq-editorial" data-scroll-theme="clarity" aria-labelledby="faq-heading">
      <div className="landing-faq-editorial-intro">
        <p className="eyebrow">Questions, answered</p>
        <h2 id="faq-heading">What to know before you start.</h2>
        <p>Everything about coverage, trust, matching, and pricing—without the fine print.</p>
      </div>

      <div className="landing-faq-topic-row" aria-label="Filter questions by topic">
        {FAQ_FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={filter === item.id ? "is-active" : undefined}
            aria-pressed={filter === item.id}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="landing-faq-editorial-grid">
        <aside className="landing-faq-rail" aria-label="FAQ guidance">
          <div>
            <span>Need a quick answer?</span>
            <strong>Start with the topic that matches what you are deciding.</strong>
            <p>NearBasha keeps the important marketplace details visible before you search, message, or list a property.</p>
          </div>
          <div className="landing-faq-rail-links">
            <Link href="/about">Read about NearBasha <span aria-hidden="true">→</span></Link>
            <Link href="/contact">Contact us <span aria-hidden="true">→</span></Link>
          </div>
        </aside>

        <div className="landing-faq-list landing-faq-editorial-list" aria-live="polite">
          {visibleFaqs.map((faq) => {
            const number = String(FAQS.indexOf(faq) + 1).padStart(2, "0");
            return (
              <details key={faq.question} className="landing-faq-item landing-faq-editorial-item">
                <summary>
                  <span className="landing-faq-number" aria-hidden="true">{number}</span>
                  <span className="landing-faq-question">{faq.question}</span>
                  <span className="landing-faq-disclosure" aria-hidden="true">+</span>
                </summary>
                <div className="landing-faq-answer">
                  <p>{faq.answer}</p>
                  {faq.badges && (
                    <div className="landing-faq-answer-badges" aria-label="Related trust signals">
                      {faq.badges.map((badge) => <span key={badge}>{badge}</span>)}
                    </div>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      </div>

      <div className="landing-faq-help-strip">
        <div>
          <span>Still have a question?</span>
          <strong>Get the context you need before your next move.</strong>
        </div>
        <div>
          <Link href="/about">About NearBasha</Link>
          <Link href="/contact">Contact us <span aria-hidden="true">→</span></Link>
        </div>
      </div>
    </section>
  );
}
