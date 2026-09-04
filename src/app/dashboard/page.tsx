import type { SupabaseClient } from "@supabase/supabase-js";
import { ShieldCheck } from "lucide-react";

import { ActionButton, ActionLink } from "@/components/action";
import { ProductNavigation } from "@/components/product-navigation";
import { RenterPreferenceForm } from "@/components/renter-preference-form";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
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
  const ownerNeedsAttention = canList && (!phoneVerified || !roleVerified);

  return (
    <main className={`shell dashboard-shell renter-dashboard-shell${!isRenter ? " owner-dashboard-shell" : ""}`}>
      <section className={`dashboard-card renter-dashboard-card${!isRenter ? " owner-dashboard-card" : ""}`}>
        <ProductNavigation authenticated canList={canList} current="dashboard" />
        <div className={`dashboard-header renter-dashboard-header${!isRenter ? " owner-dashboard-header" : ""}`}>
          <div>
            <p className="eyebrow">{isRenter ? "Renter workspace" : canList ? "Owner workspace" : "Account dashboard"}</p>
            <h1 className="dashboard-title">Welcome{auth.profile.display_name ? `, ${auth.profile.display_name}` : ""}.</h1>
            <p className="intro">
              {isRenter
                ? "Continue your search and conversations."
                : canList
                  ? "Manage properties and messages."
                  : "Your account tools are ready."}
            </p>
          </div>
          <form action="/auth/signout" method="post">
            <ActionButton variant="secondary" type="submit">Sign out</ActionButton>
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
                <p>Ready to compare.</p>
              </article>
              <article>
                <span>Saved searches</span>
                <strong>{savedSearchCount ?? 0}</strong>
                <p>Ready to reopen.</p>
              </article>
              <article className={preferredTenant ? "complete" : "attention"}>
                <span>Renter fit</span>
                <strong>{preferredTenant ? tenantLabels[preferredTenant] ?? preferredTenant.replaceAll("_", " ") : "Optional"}</strong>
                <p>{preferredTenant ? "Used for ranking." : "Add later for personalized ranking."}</p>
              </article>
            </section>

            <section className="renter-dashboard-grid">
              <div className="renter-journey-card renter-journey-primary">
                <div className="renter-journey-copy">
                  <span className="renter-journey-kicker">Continue your search</span>
                  <h2>Pick up where you left off.</h2>
                </div>
                <div className="renter-journey-actions">
                  <ActionLink href="/homes">Browse live map</ActionLink>
                  <ActionLink variant="secondary" href="/saved">Saved homes & searches</ActionLink>
                  <ActionLink variant="text" href="/messages">Open messages →</ActionLink>
                </div>
              </div>

              <div className="renter-journey-card">
                <div className="section-heading"><span>✓</span><div><h2>Personalize renter fit</h2><p>Optional. Helps rank compatible homes first.</p></div></div>
                <RenterPreferenceForm userId={auth.userId} initialPreference={preferredTenant ?? null} />
              </div>

              <div className="renter-journey-card">
                <div className="renter-journey-copy">
                  <span className="renter-journey-kicker">Account trust</span>
                  <h2>{phoneVerified ? "Phone verified" : "Phone verification is optional."}</h2>
                  <p>{phoneVerified ? "Your phone trust signal is active." : "Verify when protected contact sharing requires it."}</p>
                </div>
                <div className="renter-journey-actions">
                  <ActionLink variant="text" href="/account/phone">{phoneVerified ? "Manage phone →" : "Verify phone →"}</ActionLink>
                </div>
              </div>
            </section>
          </>
        )}

        {!isRenter && canList && (
          <section className="owner-dashboard-workspace">
            <div className="owner-dashboard-priority">
              <div className="owner-dashboard-section-kicker">Owner workspace</div>
              <h2>Manage listings and conversations.</h2>
              <div className="owner-dashboard-priority-actions">
                <ActionLink href="/owner">Manage properties</ActionLink>
                <ActionLink variant="secondary" href="/messages">Open messages</ActionLink>
                <ActionLink variant="text" href="/homes">View live market →</ActionLink>
              </div>
            </div>

            <section className="owner-dashboard-status" aria-label="Owner trust status">
              <article className={ownerNeedsAttention ? "needs-attention" : "is-ready"}>
                <span className="owner-dashboard-status-icon"><ShieldCheck size={18} /></span>
                <div>
                  <small>Trust signals</small>
                  <strong>{ownerNeedsAttention ? "Setup incomplete" : "Phone and role verified"}</strong>
                  <p>
                    {phoneVerified ? "Phone verified" : "Phone not verified"} · {roleVerified ? `${auth.profile.primary_role} role verified` : `${auth.profile.primary_role} role awaiting verification`}.
                  </p>
                  {!phoneVerified && <ActionLink variant="text" href="/account/phone">Verify phone →</ActionLink>}
                </div>
              </article>
            </section>
          </section>
        )}

        {!isRenter && !canList && (
          <section className="listing-section dashboard-trust-section">
            <div className="section-heading"><span>✓</span><div><h2>Trust status</h2><p>Account verification signals.</p></div></div>
            <div className="property-tags">
              <span>{phoneVerified ? "Phone verified" : "Phone not verified"}</span>
            </div>
            <div className="dashboard-actions dashboard-trust-actions">
              <ActionLink variant="secondary" href="/account/phone">{phoneVerified ? "Manage verified phone" : "Verify phone"}</ActionLink>
            </div>
          </section>
        )}

        <div className="dashboard-actions renter-dashboard-actions">
          {!isRenter && !canList && <ActionLink href="/messages">Messages</ActionLink>}
          {!isRenter && <ActionLink variant="secondary" href="/saved">Saved homes & searches</ActionLink>}
          {!isRenter && !canList && <ActionLink variant="secondary" href="/homes">Browse homes</ActionLink>}
          {moderatorMembership && <ActionLink variant="secondary" href="/moderation">Open moderation queue</ActionLink>}
          <ActionLink variant="text" href="/">Back to home</ActionLink>
        </div>
      </section>
    </main>
  );
}
