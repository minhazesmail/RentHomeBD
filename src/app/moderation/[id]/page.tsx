import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ModerationDecisionForm } from "@/components/moderation-decision-form";
import { requireModerator } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ModerationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requireModerator();
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: property }, { data: tenants }, { data: amenityRows }, { data: mediaRows }] = await Promise.all([
    supabase.from("properties").select("id, owner_id, title, description, address_text, property_type, rent_bdt, deposit_bdt, utilities_included, size_sqft, bedrooms, bathrooms, floor_number, total_floors, furnishing, gender_preference, available_from, latitude, longitude, status, updated_at").eq("id", id).maybeSingle(),
    supabase.from("property_tenant_types").select("tenant_type").eq("property_id", id),
    supabase.from("property_amenities").select("amenity_slug").eq("property_id", id),
    supabase.from("property_media").select("id, storage_path, media_type, sort_order").eq("property_id", id).order("sort_order"),
  ]);

  if (!property || property.status !== "pending_review") notFound();

  const [{ data: owner }, { data: amenities }] = await Promise.all([
    supabase.from("profiles").select("display_name, primary_role").eq("id", property.owner_id).maybeSingle(),
    supabase.from("amenities").select("slug, name").in("slug", (amenityRows ?? []).map((row) => row.amenity_slug)),
  ]);

  const media = await Promise.all((mediaRows ?? []).map(async (item) => {
    const { data } = await supabase.storage.from("property-media").createSignedUrl(item.storage_path, 1800);
    return { ...item, signedUrl: data?.signedUrl ?? null };
  }));

  const mapUrl = property.latitude !== null && property.longitude !== null
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${property.longitude - 0.008}%2C${property.latitude - 0.005}%2C${property.longitude + 0.008}%2C${property.latitude + 0.005}&layer=mapnik&marker=${property.latitude}%2C${property.longitude}`
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
          <ModerationDecisionForm propertyId={property.id} reviewerId={auth.userId} />
        </aside>
      </section>
    </main>
  );
}
