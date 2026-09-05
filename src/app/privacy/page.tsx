import Link from "next/link";

import { MarketingNavigation } from "@/components/marketing-navigation";

const sections = [
  ["privacy-marketplace-data", "01", "Marketplace data"],
  ["privacy-private-communication", "02", "Private communication"],
  ["privacy-property-location", "03", "Property location"],
  ["privacy-trust-moderation", "04", "Trust and moderation"],
] as const;

export default function PrivacyPage() {
  return (
    <main className="info-page info-legal">
      <section className="info-shell narrow">
        <MarketingNavigation current="privacy" />

        <section className="info-legal-hero">
          <p className="eyebrow">Privacy</p>
          <h1>How NearBasha handles marketplace information.</h1>
          <p className="intro">NearBasha uses account, listing, location, verification, saved-search, moderation, and messaging data to provide the rental marketplace.</p>
        </section>

        <div className="info-legal-layout">
          <aside className="info-legal-toc" aria-label="Privacy sections">
            <strong>On this page</strong>
            <nav>
              {sections.map(([id, number, title]) => <a href={`#${id}`} key={id}><span>{number}</span>{title}</a>)}
            </nav>
          </aside>

          <section className="info-legal-body">
            <article id="privacy-marketplace-data"><span>01</span><h2>Marketplace data</h2><p>Information connected to accounts, listings, saved searches, moderation, and messaging is used to operate the NearBasha experience and keep relevant product context connected across the marketplace.</p></article>
            <article id="privacy-private-communication"><span>02</span><h2>Private communication</h2><p>Private contact information and message content are not published as listing details. Messaging remains part of the signed-in marketplace experience.</p></article>
            <article id="privacy-property-location"><span>03</span><h2>Property location</h2><p>Exact property locations are shown as part of rental discovery when a listing is published, because location is a core part of NearBasha’s map-first search experience.</p></article>
            <article id="privacy-trust-moderation"><span>04</span><h2>Trust and moderation</h2><p>Verification and moderation information may be used to display platform trust signals, review submissions, handle reports, and enforce marketplace rules.</p></article>
          </section>
        </div>

        <footer className="info-legal-footer"><Link className="secondary-button link-button" href="/terms">Read terms</Link><Link className="text-link" href="/">Back home</Link></footer>
      </section>
    </main>
  );
}
