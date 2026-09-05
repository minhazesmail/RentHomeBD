import Link from "next/link";

import { MarketingNavigation } from "@/components/marketing-navigation";

const sections = [
  ["terms-marketplace-responsibility", "01", "Marketplace responsibility"],
  ["terms-independent-verification", "02", "Independent verification"],
  ["terms-moderation", "03", "Moderation"],
  ["terms-platform-role", "04", "Platform role"],
] as const;

export default function TermsPage() {
  return (
    <main className="info-page info-legal">
      <section className="info-shell narrow">
        <MarketingNavigation current="terms" />

        <section className="info-legal-hero">
          <p className="eyebrow">Terms</p>
          <h1>NearBasha marketplace terms.</h1>
          <p className="intro">NearBasha provides tools for rental discovery, listing publication, moderation, and private communication. Users remain responsible for the accuracy of information they submit and for independently verifying important rental details before making commitments.</p>
        </section>

        <div className="info-legal-layout">
          <aside className="info-legal-toc" aria-label="Terms sections">
            <strong>On this page</strong>
            <nav>
              {sections.map(([id, number, title]) => <a href={`#${id}`} key={id}><span>{number}</span>{title}</a>)}
            </nav>
          </aside>

          <section className="info-legal-body">
            <article id="terms-marketplace-responsibility"><span>01</span><h2>Marketplace responsibility</h2><p>Owners, agents, and renters are responsible for the information and representations they provide through NearBasha.</p></article>
            <article id="terms-independent-verification"><span>02</span><h2>Independent verification</h2><p>Users should independently verify a property, counterparty, payment details, and any other material rental information before paying money or making commitments.</p></article>
            <article id="terms-moderation"><span>03</span><h2>Moderation</h2><p>Listings and accounts may be reviewed, restricted, hidden, rejected, or removed when they violate platform rules, become inaccurate, or create trust and safety concerns.</p></article>
            <article id="terms-platform-role"><span>04</span><h2>Platform role</h2><p>NearBasha provides marketplace and communication tools. Platform trust signals should not be interpreted as government identity verification, legal ownership verification, or a guarantee of a transaction.</p></article>
          </section>
        </div>

        <footer className="info-legal-footer"><Link className="secondary-button link-button" href="/privacy">Read privacy</Link><Link className="text-link" href="/">Back home</Link></footer>
      </section>
    </main>
  );
}
