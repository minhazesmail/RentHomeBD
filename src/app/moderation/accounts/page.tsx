import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";

import { ModerationWorkbenchNav } from "@/components/moderation-workbench-nav";
import { ProfileVerificationActions } from "@/components/profile-verification-actions";
import { requireModerator } from "@/lib/auth";
import { getModerationQueueCounts } from "@/lib/moderation-queue-counts";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type TrustProfile = {
  id: string;
  display_name: string | null;
  primary_role: "owner" | "agent";
  phone_verified_at: string | null;
  role_verified_at: string | null;
  role_verified_role: "owner" | "agent" | null;
  created_at: string;
};

export default async function AccountVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const auth = await requireModerator();
  const params = await searchParams;
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const [{ data }, counts] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, primary_role, phone_verified_at, role_verified_at, role_verified_role, created_at")
      .in("primary_role", ["owner", "agent"])
      .order("created_at", { ascending: true }),
    getModerationQueueCounts(supabase),
  ]);
  const profiles = (data ?? []) as TrustProfile[];

  return (
    <main className="owner-shell moderation-shell moderation-accounts-shell">
      <header className="owner-header moderation-header">
        <div>
          <Link className="brand-link compact-brand" href="/">NearBasha</Link>
          <p className="eyebrow">Trust moderation</p>
          <h1 className="owner-title">Account verification</h1>
          <p className="intro">Review owner and agent trust signals. Role badges are NearBasha moderation signals, not proof of legal identity or property ownership.</p>
        </div>
      </header>

      <ModerationWorkbenchNav current="accounts" counts={counts} />

      {params.notice === "verified" && <div className="success-message">Account badge issued and synced to live listings.</div>}
      {params.notice === "revoked" && <div className="success-message">Account badge revoked and removed from live listings.</div>}

      <div className="moderation-queue-context">
        <strong>{counts.accounts} {counts.accounts === 1 ? "account" : "accounts"} without a role badge</strong>
        <span>{profiles.length} owner/agent {profiles.length === 1 ? "account" : "accounts"} in total.</span>
      </div>

      <section className="property-list-panel moderation-account-panel">
        {!profiles.length ? (
          <div className="empty-state"><div className="empty-icon">✓</div><h2>No owner or agent accounts yet</h2><p>Eligible accounts will appear here once they sign up.</p></div>
        ) : (
          <div className="verification-account-list moderation-account-list">
            {profiles.map((profile) => {
              const verified = Boolean(profile.role_verified_at && profile.role_verified_role === profile.primary_role);
              return (
                <article className={`listing-section moderation-account-card${verified ? " is-verified" : ""}`} key={profile.id}>
                  <div className="section-heading">
                    <span>{verified ? "✓" : "?"}</span>
                    <div>
                      <h2>{profile.display_name || "Unnamed account"}</h2>
                      <p>{profile.primary_role} · joined {new Date(profile.created_at).toLocaleDateString("en-BD")}</p>
                    </div>
                  </div>
                  <div className="property-tags moderation-account-signals">
                    <span>{profile.phone_verified_at ? "Phone verified" : "Phone not verified"}</span>
                    <span>{verified ? `Verified ${profile.primary_role}` : "No role badge"}</span>
                  </div>
                  <p className="section-copy">Check the available account signals before issuing or revoking a role badge. The badge should never be presented as government-ID or legal-ownership verification.</p>
                  <ProfileVerificationActions targetUserId={profile.id} reviewerId={auth.userId} verified={verified} />
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
