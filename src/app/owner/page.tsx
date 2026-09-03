import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock3, FileEdit, Home, MessageSquareText, Plus, ShieldCheck } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { ListingFreshnessActions } from "@/components/listing-freshness-actions";
import { requireOwnerOrAgent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import styles from "./portfolio-controls.module.css";

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

const sortableStatuses = ["available", "pending_confirmation", "pending_review", "draft", "rejected", "rented", "expired"] as const;

type OwnerSearchParams = {
  notice?: string | string[];
  q?: string | string[];
  status?: string | string[];
  sort?: string | string[];
};

type Listing = {
  id: string;
  title: string | null;
  address_text: string | null;
  rent_bdt: number | null;
  status: string;
  updated_at: string;
  expires_at: string | null;
  last_confirmed_at: string | null;
  moderation_notes: string | null;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

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

function nextAction(status: string, expiresAt: string | null) {
  if (status === "pending_confirmation") return { label: "Reconfirm availability now", tone: "urgent" };
  if (status === "rejected") return { label: "Review feedback and update", tone: "urgent" };
  if (status === "draft") return { label: "Finish draft and submit", tone: "neutral" };
  if (status === "pending_review") return { label: "Waiting for moderation", tone: "neutral" };
  if (status === "available" && expiresAt) {
    const days = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000));
    return days <= 3 ? { label: "Reconfirm soon", tone: "attention" } : { label: "Live and discoverable", tone: "good" };
  }
  if (status === "rented") return { label: "Rental completed", tone: "good" };
  if (status === "expired") return { label: "Listing expired", tone: "neutral" };
  return { label: "Review listing", tone: "neutral" };
}

function filteredAndSortedListings(listings: Listing[], query: string, status: string, sort: string) {
  const normalizedQuery = query.toLocaleLowerCase("en-BD");
  const filtered = listings.filter((listing) => {
    const matchesQuery = !normalizedQuery || `${listing.title ?? ""} ${listing.address_text ?? ""}`.toLocaleLowerCase("en-BD").includes(normalizedQuery);
    const matchesStatus = status === "all"
      ? true
      : status === "attention"
        ? ["pending_confirmation", "rejected"].includes(listing.status)
        : listing.status === status;
    return matchesQuery && matchesStatus;
  });

  return filtered.sort((a, b) => {
    if (sort === "updated-asc") return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
    if (sort === "rent-high") return (b.rent_bdt ?? -1) - (a.rent_bdt ?? -1);
    if (sort === "rent-low") return (a.rent_bdt ?? Number.MAX_SAFE_INTEGER) - (b.rent_bdt ?? Number.MAX_SAFE_INTEGER);
    if (sort === "title") return (a.title || "Untitled draft").localeCompare(b.title || "Untitled draft", "en-BD");
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}

export default async function OwnerPage({ searchParams }: { searchParams: Promise<OwnerSearchParams> }) {
  const auth = await requireOwnerOrAgent();
  const params = await searchParams;
  const notice = firstValue(params.notice);
  const query = (firstValue(params.q) || "").trim().slice(0, 120);
  const requestedStatus = firstValue(params.status) || "all";
  const status = requestedStatus === "attention" || requestedStatus === "all" || sortableStatuses.includes(requestedStatus as (typeof sortableStatuses)[number])
    ? requestedStatus
    : "all";
  const requestedSort = firstValue(params.sort) || "updated-desc";
  const sort = ["updated-desc", "updated-asc", "rent-high", "rent-low", "title"].includes(requestedSort) ? requestedSort : "updated-desc";
  const supabase = await createClient();
  const { data: properties } = await supabase
    .from("properties")
    .select("id, title, address_text, rent_bdt, status, updated_at, expires_at, last_confirmed_at, moderation_notes")
    .eq("owner_id", auth.userId)
    .order("updated_at", { ascending: false });

  const listings = (properties ?? []) as Listing[];
  const visibleListings = filteredAndSortedListings(listings, query, status, sort);
  const hasPortfolioFilters = Boolean(query || status !== "all" || sort !== "updated-desc");
  const liveCount = listings.filter((property) => property.status === "available").length;
  const attentionCount = listings.filter((property) => ["pending_confirmation", "rejected"].includes(property.status)).length;
  const reviewCount = listings.filter((property) => property.status === "pending_review").length;
  const draftCount = listings.filter((property) => property.status === "draft").length;

  return (
    <main className="owner-shell owner-management-shell">
      <header className="owner-header owner-management-header">
        <div>
          <BrandLogo />
          <p className="eyebrow">Owner workspace</p>
          <h1 className="owner-title">Manage your properties</h1>
          <p className="intro">See what is live, what needs attention, and what NearBasha needs from you next. Available listings are reconfirmed every 14 days to keep renter search fresh.</p>
        </div>
        <div className="owner-header-actions">
          <Link className="secondary-button link-button" href="/messages"><MessageSquareText size={16} aria-hidden="true" /> Messages</Link>
          <Link className="secondary-button link-button" href="/dashboard">Dashboard</Link>
          <Link className="primary-button link-button" href="/owner/properties/new"><Plus size={16} aria-hidden="true" /> Add property</Link>
        </div>
      </header>

      {notice === "saved" && <div className="success-message">Draft saved. You can return to it anytime.</div>}
      {notice === "submitted" && <div className="success-message">Listing submitted for moderation. We’ll keep its status visible here.</div>}

      {!!listings.length && (
        <section className="owner-portfolio-summary" aria-label="Property portfolio summary">
          <div className="owner-summary-card is-live"><span><Home size={18} aria-hidden="true" /></span><div><strong>{liveCount}</strong><small>Live listings</small></div></div>
          <div className={`owner-summary-card${attentionCount ? " is-attention" : ""}`}><span><AlertTriangle size={18} aria-hidden="true" /></span><div><strong>{attentionCount}</strong><small>Need attention</small></div></div>
          <div className="owner-summary-card"><span><ShieldCheck size={18} aria-hidden="true" /></span><div><strong>{reviewCount}</strong><small>In moderation</small></div></div>
          <div className="owner-summary-card"><span><FileEdit size={18} aria-hidden="true" /></span><div><strong>{draftCount}</strong><small>Drafts</small></div></div>
        </section>
      )}

      <section className="freshness-explainer owner-freshness-explainer">
        <span className="freshness-explainer-icon"><Clock3 size={19} aria-hidden="true" /></span>
        <div><strong>Freshness protects renter trust</strong><span>Approved listings stay live for 14 days. When that window ends, they move to “Needs confirmation” and disappear from renter search. You then have 7 days to reconfirm before they expire.</span></div>
      </section>

      <section className="property-list-panel owner-property-panel">
        <div className="owner-property-panel-heading">
          <div><p className="eyebrow">Property portfolio</p><h2>{listings.length ? `${listings.length} ${listings.length === 1 ? "listing" : "listings"}` : "Your listings"}</h2></div>
          {!!attentionCount && <span className="owner-attention-count"><AlertTriangle size={14} aria-hidden="true" /> {attentionCount} need{attentionCount === 1 ? "s" : ""} action</span>}
        </div>

        {!!listings.length && (
          <form className={styles.toolbar} action="/owner" method="get" aria-label="Search, filter and sort property portfolio">
            <label className={styles.field}>
              Search properties
              <input name="q" type="search" defaultValue={query} maxLength={120} placeholder="Title or location" />
            </label>
            <label className={styles.field}>
              Status
              <select name="status" defaultValue={status}>
                <option value="all">All statuses</option>
                <option value="attention">Needs attention</option>
                {sortableStatuses.map((value) => <option value={value} key={value}>{statusLabels[value]}</option>)}
              </select>
            </label>
            <label className={styles.field}>
              Sort by
              <select name="sort" defaultValue={sort}>
                <option value="updated-desc">Recently updated</option>
                <option value="updated-asc">Oldest updated</option>
                <option value="rent-high">Rent: high to low</option>
                <option value="rent-low">Rent: low to high</option>
                <option value="title">Title A–Z</option>
              </select>
            </label>
            <div className={styles.actions}>
              <button className="secondary-button" type="submit">Apply</button>
              {hasPortfolioFilters && <Link className="text-link" href="/owner">Clear</Link>}
            </div>
          </form>
        )}

        {!listings.length ? (
          <div className="empty-state owner-empty-state">
            <div className="empty-icon">⌂</div>
            <h2>No properties yet</h2>
            <p>Start with a draft. You can leave it incomplete, save your progress, and return whenever you are ready.</p>
            <Link className="primary-button link-button" href="/owner/properties/new">Create first listing</Link>
          </div>
        ) : !visibleListings.length ? (
          <div className={styles.emptyFiltered}>
            <h3>No listings match these portfolio filters</h3>
            <p>Try another search term or status, or clear the controls to see your full portfolio.</p>
            <Link className="secondary-button link-button" href="/owner">Clear portfolio filters</Link>
          </div>
        ) : (
          <>
            {hasPortfolioFilters && <p className={styles.resultNote}>Showing {visibleListings.length} of {listings.length} listings.</p>}
            <div className="property-list owner-property-list">
              {visibleListings.map((property) => {
                const freshness = freshnessCopy(property.status, property.expires_at);
                const action = nextAction(property.status, property.expires_at);
                const hasFeedback = property.status === "rejected" && Boolean(property.moderation_notes?.trim());
                return (
                  <article className={`property-row property-row-with-actions owner-property-card status-card-${property.status}`} key={property.id}>
                    <Link className="property-row-link owner-property-card-link" href={`/owner/properties/${property.id}`}>
                      <div className="property-row-main owner-property-main">
                        <div className="owner-property-title-row">
                          <strong>{property.title || "Untitled draft"}</strong>
                          <span className={`status-pill status-${property.status}`}>{statusLabels[property.status] ?? property.status}</span>
                        </div>
                        <span className="owner-property-address">{property.address_text || "Location not added yet"}</span>
                        <div className="owner-property-signals">
                          <span className={`owner-next-action is-${action.tone}`}>{action.tone === "good" ? <CheckCircle2 size={13} aria-hidden="true" /> : action.tone === "urgent" || action.tone === "attention" ? <AlertTriangle size={13} aria-hidden="true" /> : <Clock3 size={13} aria-hidden="true" />}{action.label}</span>
                          {freshness && <small className={`freshness-copy freshness-${property.status}`}>{freshness}</small>}
                        </div>
                        {hasFeedback && <div className="owner-moderation-feedback"><MessageSquareText size={15} aria-hidden="true" /><div><strong>Moderator feedback</strong><span>{property.moderation_notes}</span></div></div>}
                      </div>
                      <div className="property-row-meta owner-property-meta">
                        <strong>{property.rent_bdt ? `৳${property.rent_bdt.toLocaleString("en-BD")}` : "—"}</strong>
                        <span>{property.rent_bdt ? "per month" : "Rent not set"}</span>
                        <small>Updated {new Date(property.updated_at).toLocaleDateString("en-BD")}</small>
                      </div>
                    </Link>
                    <ListingFreshnessActions propertyId={property.id} status={property.status} />
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
