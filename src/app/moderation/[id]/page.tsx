import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { ModerationDecisionForm } from "@/components/moderation-decision-form";
import { ModerationWorkbenchNav } from "@/components/moderation-workbench-nav";
import { formatCurrency, formatNumber } from "@/i18n/format";
import { getDictionary } from "@/i18n/get-dictionary";
import { getLocale } from "@/i18n/get-locale";
import { formatModerationText, getModerationCopy } from "@/i18n/moderation-copy";
import { requireModerator } from "@/lib/auth";
import { getModerationQueueCounts } from "@/lib/moderation-queue-counts";
import { createClient } from "@/lib/supabase/server";
import { normalizeTenantType } from "@/lib/tenant-match";

export const dynamic = "force-dynamic";

export default async function ModerationDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ notice?: string }> }) {
  const [auth, locale] = await Promise.all([requireModerator(), getLocale()]);
  const copy = getModerationCopy(locale);
  const dictionary = getDictionary(locale);
  const { id } = await params;
  const query = await searchParams;
  const typedSupabase = await createClient();
  const supabase = typedSupabase as unknown as SupabaseClient;

  const [{ data: property }, { data: tenants }, { data: amenityRows }, { data: mediaRows }] = await Promise.all([
    typedSupabase.from("properties").select("id, owner_id, title, description, address_text, property_type, rent_bdt, deposit_bdt, utilities_included, size_sqft, bedrooms, bathrooms, floor_number, total_floors, furnishing, gender_preference, available_from, latitude, longitude, status, updated_at").eq("id", id).maybeSingle(),
    typedSupabase.from("property_tenant_types").select("tenant_type").eq("property_id", id),
    typedSupabase.from("property_amenities").select("amenity_slug").eq("property_id", id),
    typedSupabase.from("property_media").select("id, storage_path, media_type, sort_order").eq("property_id", id).order("sort_order"),
  ]);
  if (!property || property.status !== "pending_review") notFound();

  const [{ data: owner }, { data: amenities }, reportCountResult, { data: queueRows }, counts] = await Promise.all([
    supabase.from("profiles").select("display_name, primary_role, phone_verified_at, role_verified_at, role_verified_role").eq("id", property.owner_id).maybeSingle(),
    typedSupabase.from("amenities").select("slug, name").in("slug", (amenityRows ?? []).map((row) => row.amenity_slug)),
    supabase.from("listing_reports").select("id", { count: "exact", head: true }).eq("property_id", id),
    typedSupabase.from("properties").select("id").eq("status", "pending_review").order("updated_at", { ascending: true }),
    getModerationQueueCounts(supabase),
  ]);

  const media = await Promise.all((mediaRows ?? []).map(async (item) => {
    const { data } = await typedSupabase.storage.from("property-media").createSignedUrl(item.storage_path, 1800);
    return { ...item, signedUrl: data?.signedUrl ?? null };
  }));
  const queueIds = (queueRows ?? []).map((row) => row.id);
  const queueIndex = queueIds.indexOf(id);
  const previousPropertyId = queueIndex > 0 ? queueIds[queueIndex - 1] : null;
  const nextPropertyId = queueIndex >= 0 && queueIndex < queueIds.length - 1 ? queueIds[queueIndex + 1] : null;
  const photoCount = (mediaRows ?? []).filter((item) => item.media_type === "photo").length;
  const reportCount = reportCountResult.count ?? 0;
  const hasExactPin = property.latitude !== null && property.longitude !== null;
  const descriptionLength = property.description?.trim().length ?? 0;
  const roleVerified = Boolean(owner?.role_verified_at && owner.role_verified_role === owner.primary_role);
  const ownerRole = owner?.primary_role === "agent" ? copy.common.agent : copy.common.owner;
  const tenantLabels = {
    family: dictionary.common.tenant.family,
    bachelor: dictionary.common.tenant.bachelor,
    student: dictionary.common.tenant.student,
    job_holder: dictionary.common.tenant.jobHolder,
    everyone: dictionary.common.tenant.everyone,
  };
  const mapUrl = hasExactPin ? `https://www.openstreetmap.org/export/embed.html?bbox=${property.longitude! - 0.008}%2C${property.latitude! - 0.005}%2C${property.longitude! + 0.008}%2C${property.latitude! + 0.005}&layer=mapnik&marker=${property.latitude}%2C${property.longitude}` : null;

  return (
    <main className="listing-shell moderation-shell moderation-detail-shell">
      <header className="listing-page-header moderation-header">
        <div><Link className="brand-link compact-brand" href="/">NearBasha</Link><p className="eyebrow">{copy.listingDetail.eyebrow}</p><h1 className="listing-page-title">{property.title || copy.common.untitled}</h1><p className="intro">{formatModerationText(copy.listingDetail.submittedBy, { name: owner?.display_name || copy.common.unnamedOwner, role: ownerRole })}</p></div>
        <Link className="text-link" href="/moderation">{copy.listingDetail.back}</Link>
      </header>
      <ModerationWorkbenchNav current="listings" counts={counts} />
      {query.notice === "approved" && <div className="success-message">{copy.listingDetail.approvedNotice}</div>}
      {query.notice === "rejected" && <div className="success-message">{copy.listingDetail.rejectedNotice}</div>}

      <section className="moderation-attention-summary" aria-label={copy.listingDetail.attentionAria}>
        <div className={`moderation-attention-signal${owner?.phone_verified_at ? " is-good" : " is-alert"}`}><span>{copy.listingDetail.phone}</span><strong>{owner?.phone_verified_at ? copy.common.phoneVerified : copy.common.phoneNotVerified}</strong></div>
        <div className={`moderation-attention-signal${roleVerified ? " is-good" : " is-alert"}`}><span>{copy.listingDetail.roleBadge}</span><strong>{formatModerationText(roleVerified ? copy.common.roleVerified : copy.common.roleNotVerified, { role: ownerRole })}</strong></div>
        <div className={`moderation-attention-signal${reportCount ? " is-risk" : " is-good"}`}><span>{copy.listingDetail.reports}</span><strong>{reportCount ? formatModerationText(reportCount === 1 ? copy.listingDetail.priorReportOne : copy.listingDetail.priorReportMany, { count: formatNumber(reportCount, locale) }) : copy.listingDetail.noReports}</strong></div>
        <div className={`moderation-attention-signal${hasExactPin ? " is-good" : " is-alert"}`}><span>{copy.listingDetail.location}</span><strong>{hasExactPin ? copy.listingDetail.exactPin : copy.listingDetail.pinMissing}</strong></div>
        <div className={`moderation-attention-signal${photoCount >= 3 ? " is-good" : " is-alert"}`}><span>{copy.listingDetail.media}</span><strong>{formatModerationText(photoCount === 1 ? copy.listingDetail.photoOne : copy.listingDetail.photoMany, { count: formatNumber(photoCount, locale) })}</strong></div>
        <div className={`moderation-attention-signal${descriptionLength >= 120 ? " is-good" : " is-alert"}`}><span>{copy.listingDetail.description}</span><strong>{descriptionLength >= 120 ? copy.listingDetail.detailed : copy.listingDetail.shortCopy}</strong></div>
      </section>

      <p className="trust-disclaimer">{copy.common.legalDisclaimer}</p>

      <section className="moderation-review-grid moderation-inspection-grid">
        <div className="listing-form moderation-inspection-stack">
          <section className="listing-section moderation-inspection-card">
            <div className="section-heading"><span>1</span><div><h2>{copy.listingDetail.details}</h2><p>{copy.listingDetail.detailsHint}</p></div></div>
            <dl className="review-facts">
              <div><dt>{copy.listingDetail.type}</dt><dd>{property.property_type?.replaceAll("_", " ") || "—"}</dd></div>
              <div><dt>{copy.listingDetail.rent}</dt><dd>{property.rent_bdt ? formatCurrency(property.rent_bdt, locale) : "—"}</dd></div>
              <div><dt>{copy.listingDetail.deposit}</dt><dd>{formatCurrency(property.deposit_bdt, locale)}</dd></div>
              <div><dt>{copy.listingDetail.available}</dt><dd>{property.available_from || "—"}</dd></div>
              <div><dt>{copy.listingDetail.bedrooms}</dt><dd>{property.bedrooms ?? "—"}</dd></div>
              <div><dt>{copy.listingDetail.bathrooms}</dt><dd>{property.bathrooms ?? "—"}</dd></div>
              <div><dt>{copy.listingDetail.size}</dt><dd>{property.size_sqft ? `${formatNumber(property.size_sqft, locale)} sq ft` : "—"}</dd></div>
              <div><dt>{copy.listingDetail.floor}</dt><dd>{property.floor_number ?? "—"}{property.total_floors ? ` / ${formatNumber(property.total_floors, locale)}` : ""}</dd></div>
              <div><dt>{copy.listingDetail.furnishing}</dt><dd>{property.furnishing.replaceAll("_", " ")}</dd></div>
              <div><dt>{copy.listingDetail.gender}</dt><dd>{property.gender_preference}</dd></div>
            </dl>
            {property.description && <div className="review-description"><strong>{copy.listingDetail.description}</strong><p>{property.description}</p></div>}
          </section>

          <section className="listing-section moderation-inspection-card">
            <div className="section-heading"><span>2</span><div><h2>{copy.listingDetail.tenantAmenities}</h2><p>{copy.listingDetail.tenantHint}</p></div></div>
            <div className="review-tags"><strong>{copy.listingDetail.tenantTypes}</strong><div>{(tenants ?? []).map((row) => { const type = normalizeTenantType(row.tenant_type); return <span key={row.tenant_type}>{type ? tenantLabels[type] : row.tenant_type.replaceAll("_", " ")}</span>; })}</div></div>
            <div className="review-tags"><strong>{copy.listingDetail.amenities}</strong><div>{(amenities ?? []).map((amenity) => <span key={amenity.slug}>{amenity.name}</span>)}</div></div>
            <div className="review-tags"><strong>{copy.listingDetail.utilities}</strong><div>{property.utilities_included.map((item) => <span key={item}>{item.replaceAll("_", " ")}</span>)}</div></div>
          </section>

          <section className="listing-section moderation-inspection-card"><div className="section-heading"><span>3</span><div><h2>{copy.listingDetail.locationTitle}</h2><p>{copy.listingDetail.locationHint}</p></div></div><p className="review-address">{property.address_text}</p>{mapUrl && <div className="map-preview moderation-map-preview"><iframe title={copy.listingDetail.iframe} src={mapUrl} loading="lazy" /></div>}</section>
          <section className="listing-section moderation-inspection-card moderation-media-section"><div className="section-heading"><span>4</span><div><h2>{copy.listingDetail.mediaTitle}</h2><p>{copy.listingDetail.mediaHint}</p></div></div><div className="moderation-media-grid">{media.map((item) => item.signedUrl ? (item.media_type === "photo" ? <Image key={item.id} src={item.signedUrl} alt={copy.listingDetail.mediaAlt} width={960} height={720} sizes="(max-width: 900px) 100vw, 50vw" /> : <video key={item.id} controls src={item.signedUrl} />) : <div className="media-placeholder" key={item.id}>{copy.listingDetail.mediaUnavailable}</div>)}</div></section>
        </div>
        <aside className="moderation-sidebar moderation-decision-rail">
          <ModerationDecisionForm propertyId={property.id} reviewerId={auth.userId} nextPropertyId={nextPropertyId} />
          <div className="moderation-review-progress" aria-label={copy.listingDetail.queueAria}>
            {previousPropertyId ? <Link href={`/moderation/${previousPropertyId}`}><ArrowLeft size={14} aria-hidden="true" /> {copy.common.previous}</Link> : <span className="is-disabled"><ArrowLeft size={14} aria-hidden="true" /> {copy.common.previous}</span>}
            <span>{formatModerationText(copy.common.of, { current: formatNumber(queueIndex + 1, locale), total: formatNumber(queueIds.length, locale) })}</span>
            {nextPropertyId ? <Link href={`/moderation/${nextPropertyId}`}>{copy.common.next} <ArrowRight size={14} aria-hidden="true" /></Link> : <span className="is-disabled">{copy.common.next} <ArrowRight size={14} aria-hidden="true" /></span>}
          </div>
        </aside>
      </section>
    </main>
  );
}
