import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ArrowUpRight, CircleCheck, CircleDashed, Home, MapPinned, MessageCircle, ShieldCheck } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
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
  const ownerNeedsAttention = canList && (!phoneVerified || !roleVerified);

  return (
    <main className={`shell dashboard-shell renter-dashboard-shell${!isRenter ? " owner-dashboard-shell" : ""}`}>
      <section className={`dashboard-card renter-dashboard-card${!isRenter ? " owner-dashboard-card" : ""}`}>
        <div className={`dashboard-header renter-dashboard-header${!isRenter ? " owner-dashboard-header" : ""}`}>
          <div>
            <BrandLogo />
            <p className="eyebrow">{isRenter ? "Renter workspace" : canList ? "Owner command center" : "Account dashboard"}</p>
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
                <span>Renter fit</span>
                <strong>{preferredTenant ? tenantLabels[preferredTenant] ?? preferredTenant.replaceAll("_", " ") : "Optional"}</strong>
                <p>{preferredTenant ? "Used to rank compatible homes first." : "Add this later if you want personalized ranking."}</p>
              </article>
            </section>

            <section className="renter-dashboard-grid">
              <div className="renter-journey-card renter-journey-primary">
                <div className="renter-journey-copy">
                  <span className="renter-journey-kicker">Continue your search</span>
                  <h2>Pick up where you left off.</h2>
                  <p>Search the live map, compare your saved homes, or continue a conversation without working through account setup first.</p>
                </div>
                <div className="renter-journey-actions">
                  <Link className="primary-button link-button" href="/homes">Browse live map</Link>
                  <Link className="secondary-button link-button" href="/saved">Saved homes & searches</Link>
                  <Link className="text-link" href="/messages">Open messages →</Link>
                </div>
              </div>

              <div className="renter-journey-card">
                <div className="section-heading"><span>✓</span><div><h2>Personalize renter fit</h2><p>Optional. Your renter type is a soft matching signal and does not hide homes unless you explicitly apply a renter filter on the map.</p></div></div>
                <RenterPreferenceForm userId={auth.userId} initialPreference={preferredTenant ?? null} />
              </div>

              <div className="renter-journey-card">
                <div className="renter-journey-copy">
                  <span className="renter-journey-kicker">Account trust</span>
                  <h2>{phoneVerified ? "Phone verified" : "Phone verification is optional until you need protected contact sharing."}</h2>
                  <p>{phoneVerified ? "Your phone trust signal is active." : "Verify when you want to use protected phone reveal with a verified property owner."}</p>
                </div>
                <div className="renter-journey-actions">
                  <Link className="text-link" href="/account/phone">{phoneVerified ? "Manage verified phone →" : "Verify phone when needed →"}</Link>
                </div>
              </div>
            </section>
          </>
        )}

        {!isRenter && canList && (
          <>
            <section className="owner-dashboard-status" aria-label="Owner account status">
              <article className={ownerNeedsAttention ? "needs-attention" : "is-ready"}>
                <span className="owner-dashboard-status-icon">{ownerNeedsAttention ? <CircleDashed size={18} /> : <CircleCheck size={18} />}</span>
                <div><small>Account readiness</small><strong>{ownerNeedsAttention ? "Action needed" : "Ready to manage listings"}</strong><p>{ownerNeedsAttention ? "Complete the trust checks below to strengthen renter confidence." : "Your core account trust signals are in place."}</p></div>
              </article>
              <article className={phoneVerified ? "is-ready" : "needs-attention"}>
                <span className="owner-dashboard-status-icon"><ShieldCheck size={18} /></span>
                <div><small>Phone trust</small><strong>{phoneVerified ? "Verified" : "Verification required"}</strong><p>{phoneVerified ? "Protected contact features are available." : "Verify your phone before relying on protected phone sharing."}</p></div>
              </article>
              <article className={roleVerified ? "is-ready" : "needs-attention"}>
                <span className="owner-dashboard-status-icon"><CircleCheck size={18} /></span>
                <div><small>Role review</small><strong>{roleVerified ? `Verified ${auth.profile.primary_role}` : "Badge not issued"}</strong><p>{roleVerified ? "Your role has been reviewed by NearBasha." : "Your owner or agent role has not yet received a verified badge."}</p></div>
              </article>
            </section>

            <section className="owner-dashboard-workspace">
              <div className="owner-dashboard-priority">
                <div className="owner-dashboard-section-kicker">Priority</div>
                <h2>{ownerNeedsAttention ? "Finish account trust setup before your next listing push." : "Your workspace is ready for the next listing action."}</h2>
                <p>{ownerNeedsAttention ? "NearBasha surfaces phone and role verification beside public listings. Completing these signals helps renters understand who they are contacting." : "Move directly into property management, respond to renter messages, or review your public presence."}</p>
                <div className="owner-dashboard-priority-actions">
                  {ownerNeedsAttention && <Link className="primary-button link-button" href="/account/phone">Complete trust setup</Link>}
                  <Link className={ownerNeedsAttention ? "secondary-button link-button" : "primary-button link-button"} href="/owner">Open owner workspace</Link>
                </div>
              </div>

              <div className="owner-dashboard-action-grid">
                <Link href="/owner" className="owner-dashboard-action-card">
                  <span><Home size={20} /></span><div><small>Listings</small><strong>Manage properties</strong><p>Create, edit, review and maintain your rental inventory.</p></div><ArrowUpRight size={18} />
                </Link>
                <Link href="/messages" className="owner-dashboard-action-card">
                  <span><MessageCircle size={20} /></span><div><small>Conversations</small><strong>Respond to renters</strong><p>Keep property conversations moving from one workspace.</p></div><ArrowUpRight size={18} />
                </Link>
                <Link href="/homes" className="owner-dashboard-action-card">
                  <span><MapPinned size={20} /></span><div><small>Market view</small><strong>Open the live map</strong><p>See the renter-facing marketplace and location context.</p></div><ArrowUpRight size={18} />
                </Link>
              </div>
            </section>
          </>
        )}

        {!isRenter && !canList && (
          <section className="listing-section dashboard-trust-section">
            <div className="section-heading"><span>✓</span><div><h2>Trust status</h2><p>These signals are tied to your authenticated account and moderator review history.</p></div></div>
            <div className="property-tags">
              <span>{phoneVerified ? "Phone verified" : "Phone not verified"}</span>
            </div>
            <div className="dashboard-actions dashboard-trust-actions">
              <Link className="secondary-button link-button" href="/account/phone">{phoneVerified ? "Manage verified phone" : "Verify phone"}</Link>
            </div>
          </section>
        )}

        <div className="dashboard-actions renter-dashboard-actions">
          {!isRenter && <Link className="primary-button link-button" href="/messages">Messages</Link>}
          {!isRenter && <Link className="secondary-button link-button" href="/saved">Saved homes & searches</Link>}
          {!isRenter && (canList ? <Link className="secondary-button link-button" href="/owner">Open owner workspace</Link> : <Link className="secondary-button link-button" href="/homes">Browse homes</Link>)}
          {moderatorMembership && <Link className="secondary-button link-button" href="/moderation">Open moderation queue</Link>}
          <Link className="text-link" href="/">Back to home</Link>
        </div>
      </section>
    </main>
  );
}
