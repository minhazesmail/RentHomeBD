import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";

import { ModerationWorkbenchNav } from "@/components/moderation-workbench-nav";
import { requireModerator } from "@/lib/auth";
import { getModerationQueueCounts } from "@/lib/moderation-queue-counts";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ModerationQueuePage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  await requireModerator();
  const params = await searchParams;
  const typedSupabase = await createClient();
  const supabase = typedSupabase as unknown as SupabaseClient;
  const [{ data: listings }, counts] = await Promise.all([
    typedSupabase
      .from("properties")
      .select("id, title, address_text, property_type, rent_bdt, updated_at")
      .eq("status", "pending_review")
      .order("updated_at", { ascending: true }),
    getModerationQueueCounts(supabase),
  ]);

  return (
    <main className="owner-shell moderation-shell moderation-queue-shell">
      <header className="owner-header moderation-header">
        <div>
          <Link className="brand-link compact-brand" href="/">NearBasha</Link>
          <p className="eyebrow">Moderation</p>
          <h1 className="owner-title">Review queue</h1>
          <p className="intro">Process listings, safety reports, and account trust reviews from one operational workbench.</p>
        </div>
      </header>

      <ModerationWorkbenchNav current="listings" counts={counts} />

      {params.notice === "approved" && <div className="success-message">Listing approved and published for 14 days.</div>}
      {params.notice === "rejected" && <div className="success-message">Listing returned to the owner with reviewer notes.</div>}

      <div className="moderation-queue-context">
        <strong>{counts.listings} {counts.listings === 1 ? "listing" : "listings"} waiting</strong>
        <span>Oldest submissions appear first.</span>
      </div>

      <section className="property-list-panel moderation-queue-panel">
        {!listings?.length ? (
          <div className="empty-state"><div className="empty-icon">✓</div><h2>Queue is clear</h2><p>There are no listings waiting for review.</p></div>
        ) : (
          <div className="property-list moderation-list">
            {listings.map((listing) => (
              <Link className="property-row moderation-row" href={`/moderation/${listing.id}`} key={listing.id}>
                <div className="property-row-main">
                  <strong>{listing.title || "Untitled listing"}</strong>
                  <span>{listing.address_text || "No address"} · {listing.property_type?.replaceAll("_", " ") || "Type missing"}</span>
                </div>
                <div className="property-row-meta">
                  <span className="status-pill status-pending_review">Needs review</span>
                  <span>{listing.rent_bdt ? `৳${listing.rent_bdt.toLocaleString("en-BD")}/mo` : "Rent missing"}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
