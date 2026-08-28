import Link from "next/link";

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <div className="brand">RentHomeBD</div>
        <p className="eyebrow">Bangladesh rental marketplace</p>
        <h1>Find the right home from the map.</h1>
        <p className="intro">
          A map-first rental platform for renters, owners, and agents—with exact locations,
          tenant preferences, and fresher listings built into the experience.
        </p>
        <div className="hero-actions">
          <Link className="primary-button link-button" href="/login">Sign in or create account</Link>
          <Link className="text-link" href="/dashboard">Open dashboard</Link>
        </div>
        <div className="status-card">
          <span className="status-dot" aria-hidden="true" />
          <span>Authentication foundation is ready. Listing features are next.</span>
        </div>
      </section>
    </main>
  );
}
