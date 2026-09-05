import Link from "next/link";

import { MarketingNavigation } from "@/components/marketing-navigation";

export default function AboutPage() {
  return (
    <main className="info-page info-about">
      <section className="info-shell">
        <MarketingNavigation current="about" />

        <section className="info-hero">
          <div>
            <p className="eyebrow">About NearBasha</p>
            <h1>A clearer way to find and list homes in Bangladesh.</h1>
            <p className="intro">NearBasha is a map-first rental marketplace designed to help renters discover homes by real location and help owners publish clearer, more compatible listings.</p>
          </div>
          <div className="info-hero-note" aria-label="Product principles">
            <span>01</span>
            <strong>Location first</strong>
            <p>Exact map pins, useful local context, and search that starts from where a renter actually wants to live.</p>
          </div>
        </section>

        <section className="info-editorial-grid">
          <article className="info-story-card"><span>02</span><h2>Compatibility, not noise.</h2><p>Tenant-fit details make expectations clearer before a renter spends time on a property that was never suitable for them.</p></article>
          <article className="info-story-card"><span>03</span><h2>Freshness built in.</h2><p>Listings are moderated, refreshed, and time-bounded so the product can prioritize homes that are more likely to still be relevant.</p></article>
          <article className="info-story-card"><span>04</span><h2>Private contact.</h2><p>Messaging keeps renter–owner conversations inside NearBasha while trust and safety controls remain connected to the listing.</p></article>
        </section>

        <section className="info-cta-band">
          <div><p className="eyebrow">Start with the map</p><h2>See how the product works in the real search experience.</h2></div>
          <div className="hero-actions"><Link className="primary-button link-button" href="/homes">Browse homes</Link><Link className="secondary-button link-button" href="/">Back home</Link></div>
        </section>
      </section>
    </main>
  );
}
