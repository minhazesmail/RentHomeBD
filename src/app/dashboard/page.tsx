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
  const { data: moderatorMembership } = await supabase.from("moderators").select("user_id").eq("user_id", auth.userId).maybeSingle();

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

        <div className="dashboard-actions">
          {canList ? <Link className="primary-button link-button" href="/owner">Open owner workspace</Link> : <p className="form-hint">Renter search and saved homes will be added in the upcoming marketplace tasks.</p>}
          {moderatorMembership && <Link className="secondary-button link-button" href="/moderation">Open moderation queue</Link>}
          <Link className="text-link" href="/">Back to home</Link>
        </div>
      </section>
    </main>
  );
}
