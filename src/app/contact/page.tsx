import Link from "next/link";

import { MarketingNavigation } from "@/components/marketing-navigation";

export default function ContactPage() {
  return (
    <main className="info-page info-contact">
      <section className="info-shell">
        <MarketingNavigation current="contact" />

        <section className="info-hero compact">
          <div>
            <p className="eyebrow">Contact & support</p>
            <h1>Get help through the right NearBasha flow.</h1>
            <p className="intro">For listing safety or accuracy issues, reporting from the property page is the fastest route because the exact home is attached automatically. Account help stays connected to your signed-in profile.</p>
          </div>
          <div className="info-hero-note"><span>Support</span><strong>Keep the context attached.</strong><p>Built-in reporting and account flows give moderation the listing or profile context needed to act without asking you to reconstruct it later.</p></div>
        </section>

        <section className="info-support-grid info-support-priority-grid">
          <article className="info-support-primary"><span>Primary safety route</span><h2>Report from the property page</h2><p>Open the property and use “Report this listing.” The listing, reason, and your supporting details stay connected in the moderation queue.</p><Link className="primary-button link-button" href="/homes">Find the property</Link></article>
          <article><span>Account access</span><h2>Sign in for account help</h2><p>Use the account and phone-verification screens for access, phone, or trust-signal issues tied to your profile.</p><Link className="text-link" href="/login">Sign in →</Link></article>
          <article><span>Marketplace guidance</span><h2>Review the policies</h2><p>Privacy and marketplace terms explain how data, listings, trust signals, and platform moderation are handled.</p><div className="info-inline-links"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div></article>
        </section>

        <section className="info-cta-band subtle"><div><p className="eyebrow">Need to continue?</p><h2>Return to the marketplace and pick up where you left off.</h2></div><div className="hero-actions"><Link className="primary-button link-button" href="/homes">Browse homes</Link><Link className="secondary-button link-button" href="/">Back home</Link></div></section>
      </section>
    </main>
  );
}
