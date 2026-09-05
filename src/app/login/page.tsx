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

function shouldStartInRecovery(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === "1" || candidate === "password";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; intent?: string | string[]; recover?: string | string[] }>;
}) {
  const params = await searchParams;
  const nextPath = safeNext(params.next);
  const intent = authIntent(params.intent);
  const listingIntent = intent === "list-property";
  const startInRecovery = shouldStartInRecovery(params.recover);

  return (
    <main className="shell auth-shell">
      <section className="auth-layout">
        <div className="auth-intro-panel">
          <BrandLogo className="auth-brand-logo" />
          <p className="eyebrow">{startInRecovery ? "Secure account recovery" : listingIntent ? "List your property" : "One account, every side of renting"}</p>
          <h1 className="auth-title">
            {startInRecovery
              ? "Get back into your NearBasha account."
              : listingIntent
                ? "Create a listing with the right owner profile."
                : "A calmer way to find and manage a home."}
          </h1>
          <p className="intro">
            {startInRecovery
              ? "Enter the email address connected to your account. We’ll send a time-limited link so you can choose a new password safely."
              : listingIntent
                ? "Sign in if you already manage properties on NearBasha, or create an owner account and continue directly to listing creation."
                : "Search exact locations, save the homes that matter, message privately, or publish a listing with built-in moderation and freshness controls."}
          </p>
          <div className="auth-benefits">
            {startInRecovery ? (
              <>
                <span>Reset links are time-limited</span>
                <span>Your existing account data stays unchanged</span>
                <span>Return to your previous flow after reset</span>
              </>
            ) : listingIntent ? (
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
          {!startInRecovery && (
            <p className="form-hint">
              <strong>Owners and agents:</strong> after signup, you can verify a Bangladesh mobile number to add a phone-verified trust signal to your account. That signal confirms control of the number at verification time; it does not prove legal identity or property ownership, and listings still follow NearBasha moderation.
            </p>
          )}
        </div>
        <AuthForm nextPath={nextPath} intent={intent} startInRecovery={startInRecovery} />
      </section>
    </main>
  );
}
