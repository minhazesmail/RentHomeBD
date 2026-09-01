import "../premium-ui.css";
import { BrandLogo } from "@/components/brand-logo";
import { AuthForm } from "./auth-form";

function safeNext(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate?.startsWith("/") && !candidate.startsWith("//") ? candidate : "/dashboard";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const nextPath = safeNext(params.next);

  return (
    <main className="shell auth-shell">
      <section className="auth-layout">
        <div className="auth-intro-panel">
          <BrandLogo className="auth-brand-logo" />
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
        <AuthForm nextPath={nextPath} />
      </section>
    </main>
  );
}
