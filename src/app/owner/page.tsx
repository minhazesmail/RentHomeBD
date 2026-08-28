import Link from "next/link";

import { requireOwnerOrAgent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  draft: "Draft",
  pending_review: "In review",
  available: "Available",
  pending_confirmation: "Needs confirmation",
  rented: "Rented",
  expired: "Expired",
  rejected: "Needs changes",
};

export default async function OwnerPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const auth = await requireOwnerOrAgent();
  const params = await searchParams;
  const supabase = await createClient();
  const { data: properties } = await supabase
    .from("properties")
    .select("id, title, address_text, rent_bdt, status, updated_at")
    .eq("owner_id", auth.userId)
    .order("updated_at", { ascending: false });

  return (
    <main className="owner-shell">
      <header className="owner-header">
        <div>
          <Link className="brand-link compact-brand" href="/">RentHomeBD</Link>
          <p className="eyebrow">Owner workspace</p>
          <h1 className="owner-title">Your properties</h1>
          <p className="intro">Create drafts, add exact map locations and media, then submit complete listings for moderation.</p>
        </div>
        <div className="owner-header-actions">
          <Link className="secondary-button link-button" href="/dashboard">Dashboard</Link>
          <Link className="primary-button link-button" href="/owner/properties/new">Add property</Link>
        </div>
      </header>

      {params.notice === "saved" && <div className="success-message">Draft saved.</div>}
      {params.notice === "submitted" && <div className="success-message">Listing submitted for moderation.</div>}

      <section className="property-list-panel">
        {!properties?.length ? (
          <div className="empty-state">
            <div className="empty-icon">⌂</div>
            <h2>No properties yet</h2>
            <p>Start with a draft. You can leave it incomplete and return whenever you are ready.</p>
            <Link className="primary-button link-button" href="/owner/properties/new">Create first listing</Link>
          </div>
        ) : (
          <div className="property-list">
            {properties.map((property) => (
              <Link className="property-row" href={`/owner/properties/${property.id}`} key={property.id}>
                <div className="property-row-main">
                  <strong>{property.title || "Untitled draft"}</strong>
                  <span>{property.address_text || "Location not added yet"}</span>
                </div>
                <div className="property-row-meta">
                  <span className={`status-pill status-${property.status}`}>{statusLabels[property.status] ?? property.status}</span>
                  <span>{property.rent_bdt ? `৳${property.rent_bdt.toLocaleString("en-BD")}/mo` : "Rent not set"}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
