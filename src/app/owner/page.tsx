import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { ListingFreshnessActions } from "@/components/listing-freshness-actions";
import { requireOwnerOrAgent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import "./freshness.css";

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

function freshnessCopy(status: string, expiresAt: string | null) {
  if (status === "pending_confirmation") return "Hidden from search until you confirm it is still available.";
  if (status === "available" && expiresAt) {
    const date = new Date(expiresAt);
    const days = Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86_400_000));
    return days <= 3 ? `Reconfirm soon · ${days} day${days === 1 ? "" : "s"} left` : `Fresh for ${days} more days`;
  }
  if (status === "expired") return "Expired after the confirmation grace period.";
  return null;
}

export default async function OwnerPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const auth = await requireOwnerOrAgent();
  const params = await searchParams;
  const supabase = await createClient();
  const { data: properties } = await supabase
    .from("properties")
    .select("id, title, address_text, rent_bdt, status, updated_at, expires_at, last_confirmed_at")
    .eq("owner_id", auth.userId)
    .order("updated_at", { ascending: false });

  return (
    <main className="owner-shell">
      <header className="owner-header">
        <div>
          <BrandLogo />
          <p className="eyebrow">Owner workspace</p>
          <h1 className="owner-title">Your properties</h1>
          <p className="intro">Available listings must be reconfirmed every 14 days. Stale listings are automatically removed from public search until you confirm them again.</p>
        </div>
        <div className="owner-header-actions">
          <Link className="secondary-button link-button" href="/messages">Messages</Link>
          <Link className="secondary-button link-button" href="/dashboard">Dashboard</Link>
          <Link className="primary-button link-button" href="/owner/properties/new">Add property</Link>
        </div>
      </header>

      {params.notice === "saved" && <div className="success-message">Draft saved.</div>}
      {params.notice === "submitted" && <div className="success-message">Listing submitted for moderation.</div>}

      <section className="freshness-explainer">
        <strong>How freshness works</strong>
        <span>Approved listings stay live for 14 days. When that window ends, the hourly freshness sweep moves them to “Needs confirmation” and hides them from renters. Owners have 7 days to reconfirm before the listing becomes expired.</span>
      </section>

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
            {properties.map((property) => {
              const freshness = freshnessCopy(property.status, property.expires_at);
              return (
                <div className="property-row property-row-with-actions" key={property.id}>
                  <Link className="property-row-link" href={`/owner/properties/${property.id}`}>
                    <div className="property-row-main">
                      <strong>{property.title || "Untitled draft"}</strong>
                      <span>{property.address_text || "Location not added yet"}</span>
                      {freshness && <small className={`freshness-copy freshness-${property.status}`}>{freshness}</small>}
                    </div>
                    <div className="property-row-meta">
                      <span className={`status-pill status-${property.status}`}>{statusLabels[property.status] ?? property.status}</span>
                      <span>{property.rent_bdt ? `৳${property.rent_bdt.toLocaleString("en-BD")}/mo` : "Rent not set"}</span>
                    </div>
                  </Link>
                  <ListingFreshnessActions propertyId={property.id} status={property.status} />
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
