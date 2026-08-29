import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";

export default function ContactPage() {
  return (
    <main className="shell">
      <section className="hero">
        <BrandLogo />
        <p className="eyebrow">Contact & support</p>
        <h1>Get help through the right NearBasha flow.</h1>
        <p className="intro">
          For a problem with a property, open that listing and use “Report this listing” so the report reaches moderation with the correct property attached. For account access, sign in and use the relevant account or verification screen.
        </p>
        <div className="hero-actions">
          <Link className="primary-button link-button" href="/homes">Find a listing</Link>
          <Link className="secondary-button link-button" href="/login">Sign in</Link>
          <Link className="text-link" href="/">Back home</Link>
        </div>
      </section>
    </main>
  );
}
