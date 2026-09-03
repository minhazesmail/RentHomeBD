import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";

export default function PrivacyPage() {
  return (
    <main className="info-page info-legal">
      <section className="info-shell narrow">
        <header className="info-topbar">
          <BrandLogo />
          <nav aria-label="Information navigation">
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/privacy" aria-current="page">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </nav>
        </header>

        <section className="info-legal-hero">
          <p className="eyebrow">Privacy</p>
          <h1>How NearBasha handles marketplace information.</h1>
          <p className="intro">NearBasha uses account, listing, location, verification, saved-search, moderation, and messaging data to provide the rental marketplace.</p>
        </section>

        <section className="info-legal-body">
          <article><span>01</span><h2>Marketplace data</h2><p>Information connected to accounts, listings, saved searches, moderation, and messaging is used to operate the NearBasha experience and keep relevant product context connected across the marketplace.</p></article>
          <article><span>02</span><h2>Private communication</h2><p>Private contact information and message content are not published as listing details. Messaging remains part of the signed-in marketplace experience.</p></article>
          <article><span>03</span><h2>Property location</h2><p>Exact property locations are shown as part of rental discovery when a listing is published, because location is a core part of NearBasha’s map-first search experience.</p></article>
          <article><span>04</span><h2>Trust and moderation</h2><p>Verification and moderation information may be used to display platform trust signals, review submissions, handle reports, and enforce marketplace rules.</p></article>
        </section>

        <footer className="info-legal-footer"><Link className="secondary-button link-button" href="/terms">Read terms</Link><Link className="text-link" href="/">Back home</Link></footer>
      </section>
    </main>
  );
}
