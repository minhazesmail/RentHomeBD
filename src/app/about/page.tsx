import "../premium-ui.css";
import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";

export default function AboutPage() {
  return (
    <main className="shell">
      <section className="hero">
        <BrandLogo />
        <p className="eyebrow">About NearBasha</p>
        <h1>A clearer way to find and list homes in Bangladesh.</h1>
        <p className="intro">
          NearBasha is a map-first rental marketplace designed to help renters discover homes by real location and help owners publish clearer, more compatible listings. The product combines exact map pins, tenant-fit details, freshness controls, moderation, and private in-app contact.
        </p>
        <div className="hero-actions">
          <Link className="primary-button link-button" href="/homes">Browse homes</Link>
          <Link className="secondary-button link-button" href="/">Back home</Link>
        </div>
      </section>
    </main>
  );
}
