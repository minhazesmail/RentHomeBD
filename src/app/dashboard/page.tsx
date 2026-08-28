import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const auth = await requireUser();
  const params = await searchParams;
  const identity = auth.email ?? auth.phone ?? auth.userId;
  const canList = auth.profile.primary_role === "owner" || auth.profile.primary_role === "agent";
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const [{ data: moderatorMembership }, { data: trustProfile }] = await Promise.all([
    supabase.from("moderators").select("user_id").eq("user_id", auth.userId).maybeSingle(),
    supabase.from("profiles").select("phone_verified_at, role_verified_at, role_verified_role").eq("id", auth.userId).maybeSingle(),
  ]);
  const roleVerified = Boolean(
    trustProfile?.role_verified_at && trustProfile?.role_verified_role === auth.profile.primary_role,
  );

  return (
    <main className="shell dashboard-shell">
      <section className="dashboard-card">
        <div className="dashboard-header">
          <div>
            <p className="eyebrow">Account dashboard</p>
            <h1 className="dashboard-title">Welcome{auth.profile.display_name ? `, ${auth.profile.display_name}` : ""}.</h1>
            <p className="intro">Signed in as {identity}. Your current role is <strong>{auth.profile.primary_role}</strong>.</p>
          </div>
          <form action="/auth/signout" method="post">
            <button className="secondary-button" type="submit">Sign out</button>
          </form>
        </div>

        {params.error === "owner-role-required" && <p className="auth-message">Property management is available to owner and agent accounts.</p>}
        {params.error === "moderator-role-required" && <p className="auth-message">Moderation access is limited to explicitly assigned reviewer accounts.</p>}

        <section className="listing-section" style={{ marginTop: 24 }}>
          <div className="section-heading"><span>✓</span><div><h2>Trust status</h2><p>These signals are tied to your authenticated account and moderator review history.</p></div></div>
          <div className="property-tags">
            <span>{trustProfile?.phone_verified_at ? "Phone verified" : "Phone not verified"}</span>
            {canList && <span>{roleVerified ? `Verified ${auth.profile.primary_role}` : `${auth.profile.primary_role} badge not issued`}</span>}
          </div>
          <div className="dashboard-actions" style={{ marginTop: 18 }}>
            <Link className="secondary-button link-button" href="/account/phone">{trustProfile?.phone_verified_at ? "Manage verified phone" : "Verify phone"}</Link>
          </div>
          {canList && <p className="section-copy">A verified owner/agent badge means a NearBasha moderator reviewed the account. It does not prove government identity or legal ownership of a property.</p>}
        </section>

        <div className="dashboard-actions">
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
