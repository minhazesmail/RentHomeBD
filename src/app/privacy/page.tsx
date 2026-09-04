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
          <p className="intro">NearBasha uses account, listing, location, verification, saved-search, moderation, and messaging data to operate the rental marketplace while limiting what anonymous visitors can access.</p>
        </section>

        <section className="info-legal-body">
          <article><span>01</span><h2>Marketplace data</h2><p>Account and listing information is used to create, moderate, publish, save, and manage rental activity. Public listing pages expose only the fields needed for rental discovery and trust signals.</p></article>
          <article><span>02</span><h2>Property location</h2><p>Owners provide an exact property pin so listings can be reviewed and managed accurately. Anonymous and public discovery receives rounded coordinates instead of the stored precise latitude and longitude. Treat the public map point as approximate and confirm the exact address before visiting or paying.</p></article>
          <article><span>03</span><h2>Messages and phone numbers</h2><p>Message content and private phone numbers are not published as listing fields. Phone reveal requires the signed-in marketplace flow and verification checks, and reveal events may be recorded and rate-limited to reduce abuse.</p></article>
          <article><span>04</span><h2>Saved searches</h2><p>Saved searches can store a search center, radius, renter type, rent range, and bedroom filters so signed-in renters can reopen useful searches and see matching inventory. Search inputs are bounded before database matching is performed.</p></article>
          <article><span>05</span><h2>Trust and moderation</h2><p>Verification and moderation data is used to review submissions, handle reports, enforce marketplace rules, and display relevant trust signals. Internal moderation feedback is restricted to the listing owner and authorized moderators instead of being part of general property access.</p></article>
          <article><span>06</span><h2>Questions and requests</h2><p>Use the Contact page for privacy, account, verification, or marketplace-support guidance. Listing-specific safety concerns should be reported from the listing itself so the correct property context is attached.</p></article>
        </section>

        <footer className="info-legal-footer"><Link className="secondary-button link-button" href="/contact">Contact support</Link><Link className="text-link" href="/terms">Read terms</Link><Link className="text-link" href="/">Back home</Link></footer>
      </section>
    </main>
  );
}
