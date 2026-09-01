import "../../premium-ui.css";
import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <main className="shell auth-shell">
      <section className="dashboard-card">
        <p className="eyebrow">Authentication error</p>
        <h1 className="dashboard-title">We could not complete that sign-in.</h1>
        <p className="intro">The confirmation link may have expired or already been used. Try signing in again.</p>
        <div className="dashboard-actions">
          <Link className="primary-button link-button" href="/login">Return to sign in</Link>
        </div>
      </section>
    </main>
  );
}
