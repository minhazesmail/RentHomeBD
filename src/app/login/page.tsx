import { BrandLogo } from "@/components/brand-logo";
import { AuthForm } from "./auth-form";

function safeNext(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate?.startsWith("/") && !candidate.startsWith("//") ? candidate : "/dashboard";
}

function authIntent(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === "list-property" ? candidate : undefined;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; intent?: string | string[] }>;
}) {
  const params = await searchParams;
  const nextPath = safeNext(params.next);
  const intent = authIntent(params.intent);
  const listingIntent = intent === "list-property";

  return (
    <main className="shell auth-shell">
      <section className="auth-layout">
        <div className="auth-intro-panel">
          <BrandLogo className="auth-brand-logo" />
          <p className="eyebrow">{listingIntent ? "List your property" : "One account, every side of renting"}</p>
          <h1 className="auth-title">{listingIntent ? "Create a listing with the right owner profile." : "A calmer way to find and manage a home."}</h1>
          <p className="intro">
            {listingIntent
              ? "Sign in if you already manage properties on NearBasha, or create an owner account and continue directly to listing creation."
              : "Search exact locations, save the homes that matter, message privately, or publish a listing with built-in moderation and freshness controls."}
          </p>
          <div className="auth-benefits">
            {listingIntent ? (
              <>
                <span>Owner role selected for new accounts</span>
                <span>Continue directly to listing creation</span>
                <span>Moderation and freshness controls built in</span>
              </>
            ) : (
              <>
                <span>Exact map-based discovery</span>
                <span>Private renter–owner messaging</span>
                <span>Moderated, freshness-aware listings</span>
              </>
            )}
          </div>
        </div>
        <AuthForm nextPath={nextPath} intent={intent} />
      </section>
    </main>
  );
}
