import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";

export default function ContactPage() {
  return (
    <main className="info-page info-contact">
      <section className="info-shell">
        <header className="info-topbar">
          <BrandLogo />
          <nav aria-label="Information navigation">
            <Link href="/about">About</Link>
            <Link href="/contact" aria-current="page">Contact</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </nav>
        </header>

        <section className="info-hero compact">
          <div>
            <p className="eyebrow">Contact & support</p>
            <h1>Get help through the right NearBasha flow.</h1>
            <p className="intro">The fastest route depends on what you need help with. Reports stay connected to the exact listing, while account and verification issues stay tied to your signed-in account.</p>
          </div>
          <div className="info-hero-note"><span>Support</span><strong>Context matters.</strong><p>Using the product’s built-in reporting and account flows gives moderation the information needed to act.</p></div>
        </section>

        <section className="info-support-grid">
          <article><span>Listing issue</span><h2>Report a property</h2><p>Open the property and use “Report this listing” so the correct listing is attached automatically.</p><Link className="text-link" href="/homes">Find a listing →</Link></article>
          <article><span>Account access</span><h2>Sign in first</h2><p>Use the account and verification screens for phone, role, or access-related issues.</p><Link className="text-link" href="/login">Sign in →</Link></article>
          <article><span>Marketplace guidance</span><h2>Review the policies</h2><p>Privacy and marketplace terms explain how data, listings, and platform moderation are handled.</p><div className="info-inline-links"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div></article>
        </section>

        <section className="info-cta-band subtle"><div><p className="eyebrow">Need to continue?</p><h2>Return to the marketplace and pick up where you left off.</h2></div><div className="hero-actions"><Link className="primary-button link-button" href="/homes">Browse homes</Link><Link className="secondary-button link-button" href="/">Back home</Link></div></section>
      </section>
    </main>
  );
}
