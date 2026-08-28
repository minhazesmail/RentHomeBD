import Link from "next/link";

import { requireOwnerOrAgent } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function OwnerPage() {
  const auth = await requireOwnerOrAgent();

  return (
    <main className="shell dashboard-shell">
      <section className="dashboard-card">
        <p className="eyebrow">Owner workspace</p>
        <h1 className="dashboard-title">Property management access is ready.</h1>
        <p className="intro">
          This route is protected for owner and agent profiles. The guided property listing flow will be built as the next product task.
        </p>
        <div className="status-card">
          <span className="status-dot" aria-hidden="true" />
          <span>{auth.profile.primary_role === "agent" ? "Agent" : "Owner"} access verified</span>
        </div>
        <div className="dashboard-actions">
          <Link className="text-link" href="/dashboard">Back to dashboard</Link>
        </div>
      </section>
    </main>
  );
}
