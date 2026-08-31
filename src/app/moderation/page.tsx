import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireModerator } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ModerationQueuePage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  await requireModerator();
  const params = await searchParams;
  const typedSupabase = await createClient();
  const supabase = typedSupabase as unknown as SupabaseClient;
  const [{ data: listings }, { count: openReportCount }] = await Promise.all([
    typedSupabase.from("properties").select("id, title, address_text, property_type, rent_bdt, updated_at").eq("status", "pending_review").order("updated_at", { ascending: true }),
    supabase.from("listing_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
  ]);

  return (
    <main className="owner-shell">
      <header className="owner-header">
        <div>
          <Link className="brand-link compact-brand" href="/">NearBasha</Link>
          <p className="eyebrow">Moderation</p>
          <h1 className="owner-title">Review queue</h1>
          <p className="intro">Listings stay private until a moderator approves them. Safety reports and account trust reviews have separate queues.</p>
        </div>
        <div className="owner-header-actions"><Link className="secondary-button link-button" href="/moderation/accounts">Account trust</Link><Link className="secondary-button link-button" href="/moderation/reports">Reports{openReportCount ? ` (${openReportCount})` : ""}</Link><Link className="secondary-button link-button" href="/dashboard">Dashboard</Link></div>
      </header>

      {params.notice === "approved" && <div className="success-message">Listing approved and published for 14 days.</div>}
      {params.notice === "rejected" && <div className="success-message">Listing returned to the owner with reviewer notes.</div>}

      <section className="property-list-panel">
        {!listings?.length ? (
          <div className="empty-state"><div className="empty-icon">✓</div><h2>Queue is clear</h2><p>There are no listings waiting for review.</p></div>
        ) : (
          <div className="property-list">
            {listings.map((listing) => (
              <Link className="property-row" href={`/moderation/${listing.id}`} key={listing.id}>
                <div className="property-row-main"><strong>{listing.title || "Untitled listing"}</strong><span>{listing.address_text || "No address"} · {listing.property_type?.replaceAll("_", " ") || "Type missing"}</span></div>
                <div className="property-row-meta"><span className="status-pill status-pending_review">Needs review</span><span>{listing.rent_bdt ? `৳${listing.rent_bdt.toLocaleString("en-BD")}/mo` : "Rent missing"}</span></div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
