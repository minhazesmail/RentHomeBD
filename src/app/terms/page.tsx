import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";

export default function TermsPage() {
  return (
    <main className="info-page info-legal">
      <section className="info-shell narrow">
        <header className="info-topbar">
          <BrandLogo />
          <nav aria-label="Information navigation">
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms" aria-current="page">Terms</Link>
          </nav>
        </header>

        <section className="info-legal-hero">
          <p className="eyebrow">Terms</p>
          <h1>NearBasha marketplace terms.</h1>
          <p className="intro">NearBasha provides tools for rental discovery, listing publication, moderation, and private communication. Users remain responsible for the accuracy of information they submit and for independently verifying important rental details before making commitments.</p>
        </section>

        <section className="info-legal-body">
          <article><span>01</span><h2>Marketplace responsibility</h2><p>Owners, agents, and renters are responsible for the information and representations they provide through NearBasha.</p></article>
          <article><span>02</span><h2>Independent verification</h2><p>Users should independently verify a property, counterparty, payment details, and any other material rental information before paying money or making commitments.</p></article>
          <article><span>03</span><h2>Moderation</h2><p>Listings and accounts may be reviewed, restricted, hidden, rejected, or removed when they violate platform rules, become inaccurate, or create trust and safety concerns.</p></article>
          <article><span>04</span><h2>Platform role</h2><p>NearBasha provides marketplace and communication tools. Platform trust signals should not be interpreted as government identity verification, legal ownership verification, or a guarantee of a transaction.</p></article>
        </section>

        <footer className="info-legal-footer"><Link className="secondary-button link-button" href="/privacy">Read privacy</Link><Link className="text-link" href="/">Back home</Link></footer>
      </section>
    </main>
  );
}
