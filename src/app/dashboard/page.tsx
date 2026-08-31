import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";

import { BrandLogo } from "@/components/brand-logo";
import { RenterPreferenceForm } from "@/components/renter-preference-form";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import "./renter-dashboard.css";

export const dynamic = "force-dynamic";

const tenantLabels: Record<string, string> = {
  family: "Family",
  bachelor: "Bachelor",
  student: "Student",
  job_holder: "Job holder",
  everyone: "Everyone",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const auth = await requireUser();
  const params = await searchParams;
  const identity = auth.email ?? auth.phone ?? auth.userId;
  const canList = auth.profile.primary_role === "owner" || auth.profile.primary_role === "agent";
  const isRenter = auth.profile.primary_role === "renter";
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const [
    { data: moderatorMembership },
    { data: trustProfile },
    { count: savedHomeCount },
    { count: savedSearchCount },
  ] = await Promise.all([
    supabase.from("moderators").select("user_id").eq("user_id", auth.userId).maybeSingle(),
    supabase.from("profiles").select("phone_verified_at, role_verified_at, role_verified_role, preferred_tenant_type").eq("id", auth.userId).maybeSingle(),
    supabase.from("saved_properties").select("property_id", { count: "exact", head: true }).eq("user_id", auth.userId),
    supabase.from("saved_searches").select("id", { count: "exact", head: true }).eq("user_id", auth.userId),
  ]);
  const roleVerified = Boolean(
    trustProfile?.role_verified_at && trustProfile?.role_verified_role === auth.profile.primary_role,
  );
  const preferredTenant = trustProfile?.preferred_tenant_type as string | null | undefined;
  const phoneVerified = Boolean(trustProfile?.phone_verified_at);

  return (
    <main className="shell dashboard-shell renter-dashboard-shell">
      <section className="dashboard-card renter-dashboard-card">
        <div className="dashboard-header renter-dashboard-header">
          <div>
            <BrandLogo />
            <p className="eyebrow">{isRenter ? "Renter workspace" : "Account dashboard"}</p>
            <h1 className="dashboard-title">Welcome{auth.profile.display_name ? `, ${auth.profile.display_name}` : ""}.</h1>
            <p className="intro">Signed in as {identity}. Your current role is <strong>{auth.profile.primary_role}</strong>.</p>
          </div>
          <form action="/auth/signout" method="post">
            <button className="secondary-button" type="submit">Sign out</button>
          </form>
        </div>

        {params.error === "owner-role-required" && <p className="auth-message">Property management is available to owner and agent accounts.</p>}
        {params.error === "moderator-role-required" && <p className="auth-message">Moderation access is limited to explicitly assigned reviewer accounts.</p>}

        {isRenter && (
          <>
            <section className="renter-account-summary" aria-label="Rental search overview">
              <article>
                <span>Saved homes</span>
                <strong>{savedHomeCount ?? 0}</strong>
                <p>Homes kept for comparison.</p>
              </article>
              <article>
                <span>Saved searches</span>
                <strong>{savedSearchCount ?? 0}</strong>
                <p>Map searches ready to reopen.</p>
              </article>
              <article className={preferredTenant ? "complete" : "attention"}>
                <span>Tenant profile</span>
                <strong>{preferredTenant ? tenantLabels[preferredTenant] ?? preferredTenant.replaceAll("_", " ") : "Not set"}</strong>
                <p>{preferredTenant ? "Used to rank compatible homes first." : "Set this to improve tenant-fit ranking."}</p>
              </article>
              <article className={phoneVerified ? "complete" : "attention"}>
                <span>Phone trust</span>
                <strong>{phoneVerified ? "Verified" : "Not verified"}</strong>
                <p>{phoneVerified ? "Verified contact features are available." : "Verify before using protected phone sharing."}</p>
              </article>
            </section>

            <section className="renter-dashboard-grid">
              <div className="renter-journey-card renter-journey-primary">
                <div className="section-heading"><span>1</span><div><h2>Keep your search profile current</h2><p>Your tenant type is a soft matching signal. It does not hide other homes unless you explicitly apply a tenant filter on the map.</p></div></div>
                <RenterPreferenceForm userId={auth.userId} initialPreference={preferredTenant ?? null} />
              </div>

              <div className="renter-journey-card">
                <div className="renter-journey-copy">
                  <span className="renter-journey-kicker">Saved shortlist</span>
                  <h2>Compare homes and repeat searches.</h2>
                  <p>Open saved homes alongside your reusable map searches so you can continue where you left off.</p>
                </div>
                <div className="renter-journey-actions">
                  <Link className="primary-button link-button" href="/saved">Open saved workspace</Link>
                  <Link className="text-link" href="/homes">Browse live map →</Link>
                </div>
              </div>

              <div className="renter-journey-card">
                <div className="renter-journey-copy">
                  <span className="renter-journey-kicker">Trust & contact</span>
                  <h2>{phoneVerified ? "Your phone is verified." : "Verify before sharing contact details."}</h2>
                  <p>{phoneVerified ? "You can use NearBasha's protected phone-reveal flow when the property owner is also phone verified." : "Phone verification adds an account trust signal and unlocks protected phone reveal when both sides are verified."}</p>
                </div>
                <div className="renter-journey-actions">
                  <Link className="secondary-button link-button" href="/account/phone">{phoneVerified ? "Manage verified phone" : "Verify phone"}</Link>
                  <Link className="text-link" href="/messages">Open messages →</Link>
                </div>
              </div>
            </section>
          </>
        )}

        {!isRenter && (
          <section className="listing-section dashboard-trust-section">
            <div className="section-heading"><span>✓</span><div><h2>Trust status</h2><p>These signals are tied to your authenticated account and moderator review history.</p></div></div>
            <div className="property-tags">
              <span>{phoneVerified ? "Phone verified" : "Phone not verified"}</span>
              {canList && <span>{roleVerified ? `Verified ${auth.profile.primary_role}` : `${auth.profile.primary_role} badge not issued`}</span>}
            </div>
            <div className="dashboard-actions dashboard-trust-actions">
              <Link className="secondary-button link-button" href="/account/phone">{phoneVerified ? "Manage verified phone" : "Verify phone"}</Link>
            </div>
            {canList && <p className="section-copy">A verified owner/agent badge means a NearBasha moderator reviewed the account. It does not prove government identity or legal ownership of a property.</p>}
          </section>
        )}

        <div className="dashboard-actions renter-dashboard-actions">
          <Link className="primary-button link-button" href="/messages">Messages</Link>
          <Link className="secondary-button link-button" href="/saved">Saved homes & searches</Link>
          {canList ? <Link className="secondary-button link-button" href="/owner">Open owner workspace</Link> : <Link className="secondary-button link-button" href="/homes">Browse homes</Link>}
          {moderatorMembership && <Link className="secondary-button link-button" href="/moderation">Open moderation queue</Link>}
          <Link className="text-link" href="/">Back to home</Link>
        </div>
      </section>
    </main>
  );
}
