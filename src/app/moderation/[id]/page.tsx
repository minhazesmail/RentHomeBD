import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { ModerationDecisionForm } from "@/components/moderation-decision-form";
import { ModerationWorkbenchNav } from "@/components/moderation-workbench-nav";
import { requireModerator } from "@/lib/auth";
import { getModerationQueueCounts } from "@/lib/moderation-queue-counts";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ModerationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const auth = await requireModerator();
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

  const [
    { data: owner },
    { data: amenities },
    reportCountResult,
    { data: queueRows },
    counts,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, primary_role, phone_verified_at, role_verified_at, role_verified_role")
      .eq("id", property.owner_id)
      .maybeSingle(),
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

  const mapUrl = hasExactPin
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${property.longitude! - 0.008}%2C${property.latitude! - 0.005}%2C${property.longitude! + 0.008}%2C${property.latitude! + 0.005}&layer=mapnik&marker=${property.latitude}%2C${property.longitude}`
    : null;

  return (
    <main className="listing-shell moderation-shell moderation-detail-shell">
      <header className="listing-page-header moderation-header">
        <div>
          <Link className="brand-link compact-brand" href="/">NearBasha</Link>
          <p className="eyebrow">Moderation review</p>
          <h1 className="listing-page-title">{property.title || "Untitled listing"}</h1>
          <p className="intro">Submitted by {owner?.display_name || "Unnamed owner"} · {owner?.primary_role || "owner"}</p>
        </div>
        <Link className="text-link" href="/moderation">Back to queue</Link>
      </header>

      <ModerationWorkbenchNav current="listings" counts={counts} />

      {query.notice === "approved" && <div className="success-message">Previous listing approved. Continue with this review.</div>}
      {query.notice === "rejected" && <div className="success-message">Previous listing returned to its owner. Continue with this review.</div>}

      <section className="moderation-attention-summary" aria-label="Review attention summary">
        <div className={`moderation-attention-signal${owner?.phone_verified_at ? " is-good" : " is-alert"}`}><span>Phone</span><strong>{owner?.phone_verified_at ? "Verified" : "Not verified"}</strong></div>
        <div className={`moderation-attention-signal${roleVerified ? " is-good" : " is-alert"}`}><span>Role badge</span><strong>{roleVerified ? `Verified ${owner?.primary_role}` : "Not verified"}</strong></div>
        <div className={`moderation-attention-signal${reportCount ? " is-risk" : " is-good"}`}><span>Reports</span><strong>{reportCount ? `${reportCount} prior ${reportCount === 1 ? "report" : "reports"}` : "No prior reports"}</strong></div>
        <div className={`moderation-attention-signal${hasExactPin ? " is-good" : " is-alert"}`}><span>Location</span><strong>{hasExactPin ? "Exact pin present" : "Pin missing"}</strong></div>
        <div className={`moderation-attention-signal${photoCount >= 3 ? " is-good" : " is-alert"}`}><span>Media</span><strong>{photoCount} {photoCount === 1 ? "photo" : "photos"}</strong></div>
        <div className={`moderation-attention-signal${descriptionLength >= 120 ? " is-good" : " is-alert"}`}><span>Description</span><strong>{descriptionLength >= 120 ? "Detailed" : "Review short copy"}</strong></div>
      </section>

      <section className="moderation-review-grid moderation-inspection-grid">
        <div className="listing-form moderation-inspection-stack">
          <section className="listing-section moderation-inspection-card">
            <div className="section-heading"><span>1</span><div><h2>Listing details</h2><p>Check completeness and consistency before publishing.</p></div></div>
            <dl className="review-facts">
              <div><dt>Type</dt><dd>{property.property_type?.replaceAll("_", " ")}</dd></div>
              <div><dt>Monthly rent</dt><dd>{property.rent_bdt ? `৳${property.rent_bdt.toLocaleString("en-BD")}` : "—"}</dd></div>
              <div><dt>Deposit</dt><dd>৳{property.deposit_bdt.toLocaleString("en-BD")}</dd></div>
              <div><dt>Available from</dt><dd>{property.available_from || "—"}</dd></div>
              <div><dt>Bedrooms</dt><dd>{property.bedrooms ?? "—"}</dd></div>
              <div><dt>Bathrooms</dt><dd>{property.bathrooms ?? "—"}</dd></div>
              <div><dt>Size</dt><dd>{property.size_sqft ? `${property.size_sqft} sq ft` : "—"}</dd></div>
              <div><dt>Floor</dt><dd>{property.floor_number ?? "—"}{property.total_floors ? ` of ${property.total_floors}` : ""}</dd></div>
              <div><dt>Furnishing</dt><dd>{property.furnishing.replaceAll("_", " ")}</dd></div>
              <div><dt>Gender preference</dt><dd>{property.gender_preference}</dd></div>
            </dl>
            {property.description && <div className="review-description"><strong>Description</strong><p>{property.description}</p></div>}
          </section>

          <section className="listing-section moderation-inspection-card">
            <div className="section-heading"><span>2</span><div><h2>Tenant fit & amenities</h2><p>Verify the structured preferences match the description.</p></div></div>
            <div className="review-tags"><strong>Tenant types</strong><div>{(tenants ?? []).map((row) => <span key={row.tenant_type}>{row.tenant_type.replaceAll("_", " ")}</span>)}</div></div>
            <div className="review-tags"><strong>Amenities</strong><div>{(amenities ?? []).map((amenity) => <span key={amenity.slug}>{amenity.name}</span>)}</div></div>
            <div className="review-tags"><strong>Utilities included</strong><div>{property.utilities_included.map((item) => <span key={item}>{item.replaceAll("_", " ")}</span>)}</div></div>
          </section>

          <section className="listing-section moderation-inspection-card">
            <div className="section-heading"><span>3</span><div><h2>Location</h2><p>Confirm the pin matches the stated address.</p></div></div>
            <p className="review-address">{property.address_text}</p>
            {mapUrl && <div className="map-preview moderation-map-preview"><iframe title="Submitted property location" src={mapUrl} loading="lazy" /></div>}
          </section>

          <section className="listing-section moderation-inspection-card moderation-media-section">
            <div className="section-heading"><span>4</span><div><h2>Media</h2><p>Check that photos clearly represent the property.</p></div></div>
            <div className="moderation-media-grid">
              {media.map((item) => item.signedUrl ? (
                item.media_type === "photo" ? <Image key={item.id} src={item.signedUrl} alt="Submitted property" width={960} height={720} sizes="(max-width: 900px) 100vw, 50vw" /> : <video key={item.id} controls src={item.signedUrl} />
              ) : <div className="media-placeholder" key={item.id}>Media unavailable</div>)}
            </div>
          </section>
        </div>

        <aside className="moderation-sidebar moderation-decision-rail">
          <ModerationDecisionForm propertyId={property.id} reviewerId={auth.userId} nextPropertyId={nextPropertyId} />
          <div className="moderation-review-progress" aria-label="Review queue navigation">
            {previousPropertyId ? <Link href={`/moderation/${previousPropertyId}`}><ArrowLeft size={14} aria-hidden="true" /> Previous</Link> : <span className="is-disabled"><ArrowLeft size={14} aria-hidden="true" /> Previous</span>}
            <span>{queueIndex + 1} of {queueIds.length}</span>
            {nextPropertyId ? <Link href={`/moderation/${nextPropertyId}`}>Next <ArrowRight size={14} aria-hidden="true" /></Link> : <span className="is-disabled">Next <ArrowRight size={14} aria-hidden="true" /></span>}
          </div>
        </aside>
      </section>
    </main>
  );
}
