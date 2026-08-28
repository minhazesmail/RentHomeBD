import Link from "next/link";

import { AuthForm } from "./auth-form";

export default function LoginPage() {
  return (
    <main className="shell auth-shell">
      <section className="auth-layout">
        <div className="auth-intro-panel">
          <Link className="brand-link" href="/">RentHomeBD</Link>
          <p className="eyebrow">One account, every side of renting</p>
          <h1 className="auth-title">A calmer way to find and manage a home.</h1>
          <p className="intro">
            Search exact locations, save the homes that matter, message privately, or publish a listing with built-in moderation and freshness controls.
          </p>
          <div className="auth-benefits">
            <span>Exact map-based discovery</span>
            <span>Private renter–owner messaging</span>
            <span>Moderated, freshness-aware listings</span>
          </div>
        </div>
        <AuthForm />
      </section>
    </main>
  );
}
