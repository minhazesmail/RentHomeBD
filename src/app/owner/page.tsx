import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, FileEdit, Home, MessageSquareText, Plus, ShieldCheck } from "lucide-react";

import { ActionLink } from "@/components/action";
import { ListingFreshnessActions } from "@/components/listing-freshness-actions";
import { OwnerPortfolioControls } from "@/components/owner-portfolio-controls";
import { ProductNavigation } from "@/components/product-navigation";
import { formatCurrency, formatDate, formatNumber } from "@/i18n/format";
import { getLocale } from "@/i18n/get-locale";
import { formatOwnerPortfolioText, getOwnerPortfolioCopy, type OwnerPortfolioCopy } from "@/i18n/owner-portfolio-copy";
import { requireOwnerOrAgent } from "@/lib/auth";
import { daysUntilListingExpiry, listingNeedsAttention, RECONFIRM_SOON_DAYS } from "@/lib/listing-freshness";
import { serverNowMs } from "@/lib/server-clock";
import { createClient } from "@/lib/supabase/server";
import styles from "./portfolio-controls.module.css";

export const dynamic = "force-dynamic";

const OWNER_PROPERTY_MEDIA_TTL_SECONDS = 300;
const sortableStatuses = ["available", "pending_confirmation", "pending_review", "draft", "rejected", "rented", "expired"] as const;

type OwnerSearchParams = { notice?: string | string[]; q?: string | string[]; status?: string | string[]; sort?: string | string[] };
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
type StatusPresentation = { label: string; detail: string; tone: "good" | "attention" | "urgent" | "neutral" };

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function listingStatusPresentation(listing: Listing, now: number, copy: OwnerPortfolioCopy): StatusPresentation {
  const status = listing.status;
  const statusCopy = copy.status;
  if (status === "pending_confirmation") return { label: statusCopy.pendingConfirmation, detail: statusCopy.pendingConfirmationDetail, tone: "urgent" };
  if (status === "rejected") return { label: statusCopy.rejected, detail: statusCopy.rejectedDetail, tone: "urgent" };
  if (status === "draft") return { label: statusCopy.draft, detail: statusCopy.draftDetail, tone: "neutral" };
  if (status === "pending_review") return { label: statusCopy.pendingReview, detail: statusCopy.pendingReviewDetail, tone: "neutral" };
  if (status === "available") {
    const days = daysUntilListingExpiry(listing.expires_at, now);
    if (days === null) return { label: statusCopy.available, detail: statusCopy.availableDetail, tone: "good" };
    const unit = days === 1 ? statusCopy.day : statusCopy.days;
    if (days <= RECONFIRM_SOON_DAYS) {
      return {
        label: statusCopy.availableSoon,
        detail: days === 0 ? statusCopy.reconfirmToday : formatOwnerPortfolioText(statusCopy.reconfirmDays, { count: days, unit }),
        tone: "attention",
      };
    }
    return { label: statusCopy.available, detail: formatOwnerPortfolioText(statusCopy.confirmationDays, { count: days, unit }), tone: "good" };
  }
  if (status === "rented") return { label: statusCopy.rented, detail: statusCopy.rentedDetail, tone: "good" };
  if (status === "expired") return { label: statusCopy.expired, detail: statusCopy.expiredDetail, tone: "neutral" };
  return { label: statusCopy.review, detail: statusCopy.reviewDetail, tone: "neutral" };
}

function filteredAndSortedListings(listings: Listing[], query: string, status: string, sort: string, now: number, locale: "en" | "bn", copy: OwnerPortfolioCopy) {
  const localeTag = locale === "bn" ? "bn-BD" : "en-BD";
  const normalizedQuery = query.toLocaleLowerCase(localeTag);
  const filtered = listings.filter((listing) => {
    const matchesQuery = !normalizedQuery || `${listing.title ?? ""} ${listing.address_text ?? ""}`.toLocaleLowerCase(localeTag).includes(normalizedQuery);
    const matchesStatus = status === "all" ? true : status === "attention" ? listingNeedsAttention(listing, now) : listing.status === status;
    return matchesQuery && matchesStatus;
  });
  return filtered.sort((a, b) => {
    if (sort === "updated-asc") return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
    if (sort === "rent-high") return (b.rent_bdt ?? -1) - (a.rent_bdt ?? -1);
    if (sort === "rent-low") return (a.rent_bdt ?? Number.MAX_SAFE_INTEGER) - (b.rent_bdt ?? Number.MAX_SAFE_INTEGER);
    if (sort === "title") return (a.title || copy.page.untitled).localeCompare(b.title || copy.page.untitled, localeTag);
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}

export default async function OwnerPage({ searchParams }: { searchParams: Promise<OwnerSearchParams> }) {
  const [auth, locale] = await Promise.all([requireOwnerOrAgent(), getLocale()]);
  const copy = getOwnerPortfolioCopy(locale);
  const params = await searchParams;
  const notice = firstValue(params.notice);
  const query = (firstValue(params.q) || "").trim().slice(0, 120);
  const requestedStatus = firstValue(params.status) || "all";
  const status = requestedStatus === "attention" || requestedStatus === "all" || sortableStatuses.includes(requestedStatus as (typeof sortableStatuses)[number]) ? requestedStatus : "all";
  const requestedSort = firstValue(params.sort) || "updated-desc";
  const sort = ["updated-desc", "updated-asc", "rent-high", "rent-low", "title"].includes(requestedSort) ? requestedSort : "updated-desc";
  const now = serverNowMs();
  const supabase = await createClient();
  const { data: properties } = await supabase.from("properties").select("id, title, address_text, rent_bdt, status, updated_at, expires_at, last_confirmed_at, moderation_notes").eq("owner_id", auth.userId).order("updated_at", { ascending: false });

  const listings = (properties ?? []) as Listing[];
  const visibleListings = filteredAndSortedListings(listings, query, status, sort, now, locale, copy);
  const visibleListingIds = visibleListings.map((property) => property.id);
  const { data: mediaRows } = visibleListingIds.length
    ? await supabase.from("property_media").select("property_id, storage_path, sort_order").in("property_id", visibleListingIds).eq("media_type", "photo").order("sort_order", { ascending: true })
    : { data: [] };
  const coverPathByProperty = new Map<string, string>();
  for (const media of mediaRows ?? []) {
    const propertyId = media.property_id as string;
    if (!coverPathByProperty.has(propertyId) && media.storage_path) coverPathByProperty.set(propertyId, media.storage_path as string);
  }
  const coverEntries = await Promise.all(Array.from(coverPathByProperty.entries()).map(async ([propertyId, storagePath]) => {
    const { data } = await supabase.storage.from("property-media").createSignedUrl(storagePath, OWNER_PROPERTY_MEDIA_TTL_SECONDS);
    return [propertyId, data?.signedUrl ?? null] as const;
  }));
  const coverUrlByProperty = new Map(coverEntries);
  const liveCount = listings.filter((property) => property.status === "available").length;
  const attentionListings = listings.filter((property) => listingNeedsAttention(property, now));
  const attentionCount = attentionListings.length;
  const reviewCount = listings.filter((property) => property.status === "pending_review").length;
  const draftCount = listings.filter((property) => property.status === "draft").length;

  return (
    <main className="owner-shell owner-management-shell">
      <ProductNavigation authenticated canList current="properties" />
      <header className="owner-header owner-management-header">
        <div><h1 className="owner-title">{copy.page.title}</h1><p className="intro">{copy.page.description}</p></div>
        <div className="owner-header-actions"><ActionLink href="/owner/properties/new"><Plus size={16} aria-hidden="true" /> {copy.page.addProperty}</ActionLink></div>
      </header>

      {notice === "saved" && <div className="success-message">{copy.page.draftSaved}</div>}
      {notice === "submitted" && <div className="success-message">{copy.page.submitted}</div>}

      {!!listings.length && (
        <section className="owner-portfolio-summary" aria-label={copy.page.summaryAria}>
          <Link className={`owner-summary-card owner-summary-link is-live${status === "available" ? " is-active" : ""}`} href="/owner?status=available"><span><Home size={18} aria-hidden="true" /></span><div><strong>{formatNumber(liveCount, locale)}</strong><small>{copy.page.liveListings}</small></div><ArrowRight className="owner-summary-arrow" size={16} aria-hidden="true" /></Link>
          <Link className={`owner-summary-card owner-summary-link${attentionCount ? " is-attention" : ""}${status === "attention" ? " is-active" : ""}`} href="/owner?status=attention"><span><AlertTriangle size={18} aria-hidden="true" /></span><div><strong>{formatNumber(attentionCount, locale)}</strong><small>{copy.page.needAttention}</small></div><ArrowRight className="owner-summary-arrow" size={16} aria-hidden="true" /></Link>
          <Link className={`owner-summary-card owner-summary-link${status === "pending_review" ? " is-active" : ""}`} href="/owner?status=pending_review"><span><ShieldCheck size={18} aria-hidden="true" /></span><div><strong>{formatNumber(reviewCount, locale)}</strong><small>{copy.page.inModeration}</small></div><ArrowRight className="owner-summary-arrow" size={16} aria-hidden="true" /></Link>
          <Link className={`owner-summary-card owner-summary-link${status === "draft" ? " is-active" : ""}`} href="/owner?status=draft"><span><FileEdit size={18} aria-hidden="true" /></span><div><strong>{formatNumber(draftCount, locale)}</strong><small>{copy.page.drafts}</small></div><ArrowRight className="owner-summary-arrow" size={16} aria-hidden="true" /></Link>
        </section>
      )}

      {!!attentionListings.length && (
        <section className="owner-attention-workbench" aria-labelledby="owner-attention-heading">
          <div className="owner-attention-workbench-heading">
            <div><p className="eyebrow">{copy.page.priorityEyebrow}</p><h2 id="owner-attention-heading">{copy.page.priorityTitle}</h2><p>{copy.page.priorityDescription}</p></div>
            <Link className="text-link" href="/owner?status=attention">{formatOwnerPortfolioText(copy.page.viewAll, { count: formatNumber(attentionCount, locale) })}</Link>
          </div>
          <div className="owner-attention-items">
            {attentionListings.slice(0, 3).map((property) => {
              const presentation = listingStatusPresentation(property, now, copy);
              const actionLabel = property.status === "pending_confirmation" ? copy.page.confirmAvailability : property.status === "rejected" ? copy.page.reviewChanges : copy.page.reconfirmSoon;
              return (
                <Link className="owner-attention-item" href={`/owner/properties/${property.id}`} key={property.id}>
                  <span className="owner-attention-item-icon"><AlertTriangle size={16} aria-hidden="true" /></span>
                  <span className="owner-attention-item-copy"><strong>{property.title || copy.page.untitled}</strong><small>{presentation.label}</small><span>{presentation.detail}</span></span>
                  <span className="owner-attention-item-action">{actionLabel}<ArrowRight size={14} aria-hidden="true" /></span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="property-list-panel owner-property-panel">
        <div className="owner-property-panel-heading"><div><h2>{listings.length ? formatOwnerPortfolioText(listings.length === 1 ? copy.page.listingsOne : copy.page.listingsMany, { count: formatNumber(listings.length, locale) }) : copy.page.yourListings}</h2>{!!listings.length && <p className={styles.ownerPortfolioPolicy}>{copy.page.confirmationPolicy}</p>}</div></div>

        {!!listings.length && <OwnerPortfolioControls query={query} status={status} sort={sort} visibleCount={visibleListings.length} totalCount={listings.length} />}

        {!listings.length ? (
          <div className="empty-state owner-empty-state"><div className="empty-icon">⌂</div><h2>{copy.page.noProperties}</h2><p>{copy.page.noPropertiesHint}</p><ActionLink href="/owner/properties/new">{copy.page.createFirst}</ActionLink></div>
        ) : !visibleListings.length ? (
          <div className={styles.ownerPortfolioEmptyFiltered}><h3>{copy.page.noFiltered}</h3><p>{copy.page.noFilteredHint}</p><ActionLink variant="secondary" href="/owner">{copy.page.clearFilters}</ActionLink></div>
        ) : (
          <div className="property-list owner-property-list">
            {visibleListings.map((property) => {
              const statusPresentation = listingStatusPresentation(property, now, copy);
              const hasFeedback = property.status === "rejected" && Boolean(property.moderation_notes?.trim());
              const coverUrl = coverUrlByProperty.get(property.id);
              const StatusIcon = statusPresentation.tone === "good" ? CheckCircle2 : statusPresentation.tone === "urgent" || statusPresentation.tone === "attention" ? AlertTriangle : Clock3;
              return (
                <article className={`property-row property-row-with-actions owner-property-card status-card-${property.status}`} key={property.id}>
                  <Link className="property-row-link owner-property-card-link" href={`/owner/properties/${property.id}`}>
                    <div className={styles.ownerPortfolioListingBody}>
                      <div className={styles.ownerPortfolioThumbnail} aria-hidden="true">{coverUrl ? <img src={coverUrl} alt="" loading="lazy" /> : <Home size={22} aria-hidden="true" />}</div>
                      <div className="property-row-main owner-property-main">
                        <div className="owner-property-title-row"><strong>{property.title || copy.page.untitled}</strong></div>
                        <span className="owner-property-address">{property.address_text || copy.page.noLocation}</span>
                        <div className={`${styles.ownerPortfolioStatusSummary} ${styles[`ownerPortfolioStatus_${statusPresentation.tone}`]}`}><StatusIcon size={15} aria-hidden="true" /><div><strong>{statusPresentation.label}</strong><span>{statusPresentation.detail}</span></div></div>
                        {hasFeedback && <div className="owner-moderation-feedback"><MessageSquareText size={15} aria-hidden="true" /><div><strong>{copy.page.moderatorFeedback}</strong><span>{property.moderation_notes}</span></div></div>}
                      </div>
                    </div>
                    <div className="property-row-meta owner-property-meta">
                      <strong>{property.rent_bdt ? formatCurrency(property.rent_bdt, locale) : "—"}</strong>
                      <span>{property.rent_bdt ? copy.page.perMonth : copy.page.rentNotSet}</span>
                      <small>{formatOwnerPortfolioText(copy.page.updated, { date: formatDate(new Date(property.updated_at), locale, { timeZone: "Asia/Dhaka", day: "numeric", month: "short", year: "numeric" }) })}</small>
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
