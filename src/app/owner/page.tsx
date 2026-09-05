import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, FileEdit, Home, MessageSquareText, Plus, ShieldCheck } from "lucide-react";

import { ActionLink } from "@/components/action";
import { ListingFreshnessActions } from "@/components/listing-freshness-actions";
import { OwnerPortfolioControls } from "@/components/owner-portfolio-controls";
import { ProductNavigation } from "@/components/product-navigation";
import { requireOwnerOrAgent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import styles from "./portfolio-controls.module.css";

export const dynamic = "force-dynamic";

const OWNER_PROPERTY_MEDIA_TTL_SECONDS = 300;

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

type StatusPresentation = {
  label: string;
  detail: string;
  tone: "good" | "attention" | "urgent" | "neutral";
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function listingStatusPresentation(status: string, expiresAt: string | null): StatusPresentation {
  if (status === "pending_confirmation") {
    return {
      label: "Needs confirmation",
      detail: "Hidden from renter search until you confirm it is still available.",
      tone: "urgent",
    };
  }
  if (status === "rejected") {
    return {
      label: "Needs changes",
      detail: "Review the moderator feedback below, update the listing, then submit it again.",
      tone: "urgent",
    };
  }
  if (status === "draft") {
    return {
      label: "Draft",
      detail: "Finish the listing when ready, then submit it for moderation.",
      tone: "neutral",
    };
  }
  if (status === "pending_review") {
    return {
      label: "In review",
      detail: "Waiting for NearBasha moderation before it can appear in renter search.",
      tone: "neutral",
    };
  }
  if (status === "available") {
    if (!expiresAt) {
      return {
        label: "Available",
        detail: "Live and discoverable in renter search.",
        tone: "good",
      };
    }
    const days = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000));
    if (days <= 3) {
      return {
        label: "Available · Reconfirm soon",
        detail: days === 0 ? "Reconfirm today to keep this listing live." : `Live in renter search · reconfirm within ${days} day${days === 1 ? "" : "s"}.`,
        tone: "attention",
      };
    }
    return {
      label: "Available",
      detail: `Live in renter search · confirmation stays current for ${days} more days.`,
      tone: "good",
    };
  }
  if (status === "rented") {
    return {
      label: "Rented",
      detail: "Rental completed and no longer visible in renter search.",
      tone: "good",
    };
  }
  if (status === "expired") {
    return {
      label: "Expired",
      detail: "The confirmation window passed and this listing is no longer visible in renter search.",
      tone: "neutral",
    };
  }
  return {
    label: statusLabels[status] ?? "Review listing",
    detail: "Open the listing to review its current state.",
    tone: "neutral",
  };
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
  const visibleListingIds = visibleListings.map((property) => property.id);
  const { data: mediaRows } = visibleListingIds.length
    ? await supabase
        .from("property_media")
        .select("property_id, storage_path, sort_order")
        .in("property_id", visibleListingIds)
        .eq("media_type", "photo")
        .order("sort_order", { ascending: true })
    : { data: [] };
  const coverPathByProperty = new Map<string, string>();
  for (const media of mediaRows ?? []) {
    const propertyId = media.property_id as string;
    if (!coverPathByProperty.has(propertyId) && media.storage_path) {
      coverPathByProperty.set(propertyId, media.storage_path as string);
    }
  }
  const coverEntries = await Promise.all(
    Array.from(coverPathByProperty.entries()).map(async ([propertyId, storagePath]) => {
      const { data } = await supabase.storage.from("property-media").createSignedUrl(storagePath, OWNER_PROPERTY_MEDIA_TTL_SECONDS);
      return [propertyId, data?.signedUrl ?? null] as const;
    }),
  );
  const coverUrlByProperty = new Map(coverEntries);
  const liveCount = listings.filter((property) => property.status === "available").length;
  const attentionListings = listings.filter((property) => ["pending_confirmation", "rejected"].includes(property.status));
  const attentionCount = attentionListings.length;
  const reviewCount = listings.filter((property) => property.status === "pending_review").length;
  const draftCount = listings.filter((property) => property.status === "draft").length;

  return (
    <main className="owner-shell owner-management-shell">
      <ProductNavigation authenticated canList current="properties" />
      <header className="owner-header owner-management-header">
        <div>
          <h1 className="owner-title">Manage your properties</h1>
          <p className="intro">See what is live, resolve what needs attention, and keep your portfolio current.</p>
        </div>
        <div className="owner-header-actions">
          <ActionLink href="/owner/properties/new"><Plus size={16} aria-hidden="true" /> Add property</ActionLink>
        </div>
      </header>

      {notice === "saved" && <div className="success-message">Draft saved. You can return to it anytime.</div>}
      {notice === "submitted" && <div className="success-message">Listing submitted for moderation. We’ll keep its status visible here.</div>}

      {!!listings.length && (
        <section className="owner-portfolio-summary" aria-label="Property portfolio summary">
          <Link className={`owner-summary-card owner-summary-link is-live${status === "available" ? " is-active" : ""}`} href="/owner?status=available">
            <span><Home size={18} aria-hidden="true" /></span><div><strong>{liveCount}</strong><small>Live listings</small></div><ArrowRight className="owner-summary-arrow" size={16} aria-hidden="true" />
          </Link>
          <Link className={`owner-summary-card owner-summary-link${attentionCount ? " is-attention" : ""}${status === "attention" ? " is-active" : ""}`} href="/owner?status=attention">
            <span><AlertTriangle size={18} aria-hidden="true" /></span><div><strong>{attentionCount}</strong><small>Need attention</small></div><ArrowRight className="owner-summary-arrow" size={16} aria-hidden="true" />
          </Link>
          <Link className={`owner-summary-card owner-summary-link${status === "pending_review" ? " is-active" : ""}`} href="/owner?status=pending_review">
            <span><ShieldCheck size={18} aria-hidden="true" /></span><div><strong>{reviewCount}</strong><small>In moderation</small></div><ArrowRight className="owner-summary-arrow" size={16} aria-hidden="true" />
          </Link>
          <Link className={`owner-summary-card owner-summary-link${status === "draft" ? " is-active" : ""}`} href="/owner?status=draft">
            <span><FileEdit size={18} aria-hidden="true" /></span><div><strong>{draftCount}</strong><small>Drafts</small></div><ArrowRight className="owner-summary-arrow" size={16} aria-hidden="true" />
          </Link>
        </section>
      )}

      {!!attentionListings.length && (
        <section className="owner-attention-workbench" aria-labelledby="owner-attention-heading">
          <div className="owner-attention-workbench-heading">
            <div>
              <p className="eyebrow">Priority queue</p>
              <h2 id="owner-attention-heading">Needs action now</h2>
              <p>Resolve these listings first so renters are not blocked by stale availability or moderation issues.</p>
            </div>
            <Link className="text-link" href="/owner?status=attention">View all {attentionCount}</Link>
          </div>
          <div className="owner-attention-items">
            {attentionListings.slice(0, 3).map((property) => {
              const presentation = listingStatusPresentation(property.status, property.expires_at);
              const actionLabel = property.status === "pending_confirmation" ? "Confirm availability" : "Review requested changes";
              return (
                <Link className="owner-attention-item" href={`/owner/properties/${property.id}`} key={property.id}>
                  <span className="owner-attention-item-icon"><AlertTriangle size={16} aria-hidden="true" /></span>
                  <span className="owner-attention-item-copy">
                    <strong>{property.title || "Untitled draft"}</strong>
                    <small>{presentation.label}</small>
                    <span>{presentation.detail}</span>
                  </span>
                  <span className="owner-attention-item-action">{actionLabel}<ArrowRight size={14} aria-hidden="true" /></span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="property-list-panel owner-property-panel">
        <div className="owner-property-panel-heading">
          <div>
            <h2>{listings.length ? `${listings.length} ${listings.length === 1 ? "listing" : "listings"}` : "Your listings"}</h2>
            {!!listings.length && <p className={styles.ownerPortfolioPolicy}>Live listings need availability confirmation every 14 days.</p>}
          </div>
        </div>

        {!!listings.length && (
          <OwnerPortfolioControls
            query={query}
            status={status}
            sort={sort}
            visibleCount={visibleListings.length}
            totalCount={listings.length}
          />
        )}

        {!listings.length ? (
          <div className="empty-state owner-empty-state">
            <div className="empty-icon">⌂</div>
            <h2>No properties yet</h2>
            <p>Start a draft and finish it when you are ready.</p>
            <ActionLink href="/owner/properties/new">Create first listing</ActionLink>
          </div>
        ) : !visibleListings.length ? (
          <div className={styles.ownerPortfolioEmptyFiltered}>
            <h3>No listings match these filters</h3>
            <p>Try another search or status.</p>
            <ActionLink variant="secondary" href="/owner">Clear portfolio filters</ActionLink>
          </div>
        ) : (
          <div className="property-list owner-property-list">
            {visibleListings.map((property) => {
              const statusPresentation = listingStatusPresentation(property.status, property.expires_at);
              const hasFeedback = property.status === "rejected" && Boolean(property.moderation_notes?.trim());
              const coverUrl = coverUrlByProperty.get(property.id);
              const StatusIcon = statusPresentation.tone === "good"
                ? CheckCircle2
                : statusPresentation.tone === "urgent" || statusPresentation.tone === "attention"
                  ? AlertTriangle
                  : Clock3;
              return (
                <article className={`property-row property-row-with-actions owner-property-card status-card-${property.status}`} key={property.id}>
                  <Link className="property-row-link owner-property-card-link" href={`/owner/properties/${property.id}`}>
                    <div className={styles.ownerPortfolioListingBody}>
                      <div className={styles.ownerPortfolioThumbnail} aria-hidden="true">
                        {coverUrl ? <img src={coverUrl} alt="" loading="lazy" /> : <Home size={22} aria-hidden="true" />}
                      </div>
                      <div className="property-row-main owner-property-main">
                        <div className="owner-property-title-row">
                          <strong>{property.title || "Untitled draft"}</strong>
                        </div>
                        <span className="owner-property-address">{property.address_text || "Location not added yet"}</span>
                        <div className={`${styles.ownerPortfolioStatusSummary} ${styles[`ownerPortfolioStatus_${statusPresentation.tone}`]}`}>
                          <StatusIcon size={15} aria-hidden="true" />
                          <div>
                            <strong>{statusPresentation.label}</strong>
                            <span>{statusPresentation.detail}</span>
                          </div>
                        </div>
                        {hasFeedback && <div className="owner-moderation-feedback"><MessageSquareText size={15} aria-hidden="true" /><div><strong>Moderator feedback</strong><span>{property.moderation_notes}</span></div></div>}
                      </div>
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
        )}
      </section>
    </main>
  );
}
