import "../premium-ui.css";
import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";

export default function TermsPage() {
  return (
    <main className="shell">
      <section className="hero">
        <BrandLogo />
        <p className="eyebrow">Terms</p>
        <h1>NearBasha marketplace terms.</h1>
        <p className="intro">
          NearBasha provides tools for rental discovery, listing publication, moderation, and private communication. Users are responsible for the accuracy of information they submit and should independently verify a property, counterparty, and payment details before making commitments. Listings or accounts may be restricted when they violate platform rules or create safety concerns.
        </p>
        <div className="hero-actions">
          <Link className="secondary-button link-button" href="/privacy">Privacy</Link>
          <Link className="text-link" href="/">Back home</Link>
        </div>
      </section>
    </main>
  );
}
