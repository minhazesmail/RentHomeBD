import "../premium-ui.css";
import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";

export default function PrivacyPage() {
  return (
    <main className="shell">
      <section className="hero">
        <BrandLogo />
        <p className="eyebrow">Privacy</p>
        <h1>How NearBasha handles marketplace information.</h1>
        <p className="intro">
          NearBasha uses account, listing, location, verification, saved-search, moderation, and messaging data to provide the rental marketplace. Private contact and message content are not published as listing details. Exact property locations are shown as part of the rental discovery experience when a listing is published.
        </p>
        <div className="hero-actions">
          <Link className="secondary-button link-button" href="/terms">Terms</Link>
          <Link className="text-link" href="/">Back home</Link>
        </div>
      </section>
    </main>
  );
}
