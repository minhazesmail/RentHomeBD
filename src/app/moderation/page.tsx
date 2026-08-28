import Link from "next/link";

import { requireModerator } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ModerationQueuePage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  await requireModerator();
  const params = await searchParams;
  const supabase = await createClient();
  const { data: listings } = await supabase
    .from("properties")
    .select("id, title, address_text, property_type, rent_bdt, updated_at")
    .eq("status", "pending_review")
    .order("updated_at", { ascending: true });

  return (
    <main className="owner-shell">
      <header className="owner-header">
        <div>
          <Link className="brand-link compact-brand" href="/">RentHomeBD</Link>
          <p className="eyebrow">Moderation</p>
          <h1 className="owner-title">Review queue</h1>
          <p className="intro">Listings stay private until a moderator approves them.</p>
        </div>
        <Link className="secondary-button link-button" href="/dashboard">Dashboard</Link>
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
                <div className="property-row-main">
                  <strong>{listing.title || "Untitled listing"}</strong>
                  <span>{listing.address_text || "No address"} · {listing.property_type?.replaceAll("_", " ") || "Type missing"}</span>
                </div>
                <div className="property-row-meta"><span className="status-pill status-pending_review">Needs review</span><span>{listing.rent_bdt ? `৳${listing.rent_bdt.toLocaleString("en-BD")}/mo` : "Rent missing"}</span></div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
