import Link from "next/link";

import { requireUser } from "@/lib/auth";

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

        {params.error === "owner-role-required" && (
          <p className="auth-message">Property management is available to owner and agent accounts.</p>
        )}

        <div className="dashboard-actions">
          {canList ? (
            <Link className="primary-button link-button" href="/owner">Open owner workspace</Link>
          ) : (
            <p className="form-hint">Renter search and saved homes will be added in the upcoming marketplace tasks.</p>
          )}
          <Link className="text-link" href="/">Back to home</Link>
        </div>
      </section>
    </main>
  );
}
