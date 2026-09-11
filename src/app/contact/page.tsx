import Link from "next/link";

import { MarketingNavigation } from "@/components/marketing-navigation";
import { SupportRequestForm } from "@/components/support-request-form";
import type { SupportCategory } from "@/i18n/support-copy";

const SUPPORT_CATEGORIES = new Set<SupportCategory>(["account_recovery", "otp_delivery", "data_export", "account_deletion", "safety_abuse", "other"]);

function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }

export default async function ContactPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const requestedCategory = first(params.category) as SupportCategory | undefined;
  const initialCategory = requestedCategory && SUPPORT_CATEGORIES.has(requestedCategory) ? requestedCategory : "other";
  const conversation = first(params.conversation)?.slice(0, 80);

  return (
    <main className="info-page info-contact">
      <section className="info-shell">
        <MarketingNavigation current="contact" />

        <section className="info-hero compact">
          <div>
            <p className="eyebrow">Contact & support</p>
            <h1>Get help even when you cannot sign in.</h1>
            <p className="intro">Use this form for account recovery, missing OTPs, data export or deletion requests, marketplace safety and other support. Listing-specific reports should still be sent from the property page when possible.</p>
          </div>
          <div className="info-hero-note"><span>Support</span><strong>Never send passwords or OTP codes.</strong><p>We use the email you provide to follow up. Account deletion and data export requests require identity verification before action is taken.</p></div>
        </section>

        <section className="info-support-grid info-support-priority-grid">
          <article className="info-support-primary"><span>Primary safety route</span><h2>Report a listing from its property page</h2><p>The exact property and report reason stay attached to the moderation queue.</p><Link className="primary-button link-button" href="/homes">Find the property</Link></article>
          <article><span>Account access</span><h2>Locked out or missing an OTP?</h2><p>You do not need to be signed in to submit the support form below.</p><a className="text-link" href="#support-request">Open support form ↓</a></article>
          <article><span>Privacy requests</span><h2>Export or delete account data</h2><p>Choose the appropriate request type below. We verify ownership before fulfilling privacy-sensitive requests.</p><div className="info-inline-links"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div></article>
        </section>

        <section id="support-request" className="info-cta-band subtle" aria-labelledby="support-request-title">
          <div><p className="eyebrow">Support request</p><h2 id="support-request-title">Tell us what you need help with.</h2></div>
        </section>
        <SupportRequestForm initialCategory={initialCategory} context={conversation ? { conversation_id: conversation } : {}} />

        <section className="info-cta-band subtle"><div><p className="eyebrow">Continue browsing</p><h2>Return to the marketplace whenever you are ready.</h2></div><div className="hero-actions"><Link className="primary-button link-button" href="/homes">Browse homes</Link><Link className="secondary-button link-button" href="/">Back home</Link></div></section>
      </section>
    </main>
  );
}
