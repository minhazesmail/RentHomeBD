import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { BrandLogo } from "@/components/brand-logo";
import { ReportListingButton } from "@/components/report-listing-button";
import { SaveHomeButton } from "@/components/save-home-button";
import { StartConversationButton } from "@/components/start-conversation-button";
import { getAuthContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import "../property-detail.css";

type Amenity = { slug: string; name: string };
type MediaItem = { id: string; storage_path: string; media_type: "photo" | "video"; sort_order: number; signed_url?: string | null };
type PublicProperty = {
  id: string; title: string | null; description: string | null; address_text: string | null; property_type: string | null;
  rent_bdt: number | null; deposit_bdt: number; utilities_included: string[]; size_sqft: number | null; bedrooms: number | null;
  bathrooms: number | null; floor_number: number | null; total_floors: number | null; furnishing: string; gender_preference: string;
  available_from: string | null; latitude: number; longitude: number; published_at: string; expires_at: string | null;
  owner_display_name: string | null; owner_role: string; owner_phone_verified_at: string | null; owner_role_verified_at: string | null;
  owner_role_verified_role: string | null; tenant_types: string[]; amenities: Amenity[]; media: MediaItem[];
};

const PUBLIC_MEDIA_TTL_SECONDS = 300;

export const dynamic = "force-dynamic";

function label(value: string | null | undefined) { return value ? value.replaceAll("_", " ") : "—"; }

export default async function PublicPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const auth = await getAuthContext();
  const { data, error } = await supabase.rpc("get_public_property_detail", { property_uuid: id });
  if (error) throw error;
  const property = (data?.[0] ?? null) as PublicProperty | null;
  if (!property) notFound();

  const [{ data: savedRow }, media] = await Promise.all([
    auth ? supabase.from("saved_properties").select("property_id").eq("user_id", auth.userId).eq("property_id", property.id).maybeSingle() : Promise.resolve({ data: null }),
    Promise.all((property.media ?? []).map(async (item) => {
      const { data: signed } = await supabase.storage.from("property-media").createSignedUrl(item.storage_path, PUBLIC_MEDIA_TTL_SECONDS);
      return { ...item, signed_url: signed?.signedUrl ?? null };
    })),
  ]);

  const photos = media.filter((item) => item.media_type === "photo" && item.signed_url);
  const videos = media.filter((item) => item.media_type === "video" && item.signed_url);
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${property.longitude - 0.006}%2C${property.latitude - 0.004}%2C${property.longitude + 0.006}%2C${property.latitude + 0.004}&layer=mapnik&marker=${property.latitude}%2C${property.longitude}`;
  const signInHref = `/login?next=${encodeURIComponent(`/homes/${property.id}#contact`)}`;
  const roleVerified = Boolean(property.owner_role_verified_at && property.owner_role_verified_role === property.owner_role);

  return (
    <main className="property-detail-page">
      <header className="property-detail-topbar">
        <BrandLogo className="property-brand-logo" />
        <div className="property-detail-nav"><Link className="text-link" href="/homes">Back to map</Link>{auth && <Link className="text-link" href="/saved">Saved</Link>}<Link className="text-link" href={auth ? "/messages" : "/login"}>{auth ? "Messages" : "Sign in"}</Link></div>
      </header>
      <div className="property-detail-shell">
        <section className="property-detail-hero">
          <div><p className="eyebrow">{label(property.property_type)} · Available now</p><h1>{property.title || "Rental property"}</h1><p className="property-detail-address">{property.address_text || "Exact location shown below"}</p></div>
          <div className="property-detail-price"><strong>{property.rent_bdt ? `৳${property.rent_bdt.toLocaleString("en-BD")}` : "Rent on request"}</strong><span>per month</span></div>
        </section>

        <section className="property-gallery">
          {photos.length ? photos.slice(0, 5).map((item, index) => <div className={`property-gallery-item ${index === 0 ? "property-gallery-primary" : ""}`} key={item.id}><Image src={item.signed_url!} alt={`${property.title || "Property"} photo ${index + 1}`} fill sizes={index === 0 ? "(max-width: 900px) 100vw, 60vw" : "(max-width: 900px) 50vw, 20vw"} /></div>) : <div className="property-gallery-empty">No property photos are available.</div>}
        </section>

        <div className="property-detail-layout">
          <div className="property-detail-main">
            <section className="property-detail-section property-summary-grid"><div><strong>{property.bedrooms ?? "—"}</strong><span>Bedrooms</span></div><div><strong>{property.bathrooms ?? "—"}</strong><span>Bathrooms</span></div><div><strong>{property.size_sqft ? property.size_sqft.toLocaleString("en-BD") : "—"}</strong><span>Sq ft</span></div><div><strong>{property.floor_number ?? "—"}{property.total_floors ? ` / ${property.total_floors}` : ""}</strong><span>Floor</span></div></section>
            <section className="property-detail-section"><h2>About this home</h2><p className="property-description">{property.description || "The owner has not added a longer description yet."}</p><dl className="property-facts"><div><dt>Property type</dt><dd>{label(property.property_type)}</dd></div><div><dt>Furnishing</dt><dd>{label(property.furnishing)}</dd></div><div><dt>Available from</dt><dd>{property.available_from || "—"}</dd></div><div><dt>Deposit</dt><dd>৳{property.deposit_bdt.toLocaleString("en-BD")}</dd></div><div><dt>Gender preference</dt><dd>{label(property.gender_preference)}</dd></div></dl></section>
            <section className="property-detail-section"><h2>Tenant compatibility</h2><p className="section-copy">These are the tenant types the owner has explicitly marked as acceptable for this listing.</p><div className="property-tags">{property.tenant_types.map((type) => <span key={type}>{label(type)}</span>)}</div></section>
            <section className="property-detail-section"><h2>Amenities & included utilities</h2><div className="property-tag-groups"><div><h3>Amenities</h3><div className="property-tags">{property.amenities.length ? property.amenities.map((amenity) => <span key={amenity.slug}>{amenity.name}</span>) : <span>None listed</span>}</div></div><div><h3>Utilities included</h3><div className="property-tags">{property.utilities_included.length ? property.utilities_included.map((utility) => <span key={utility}>{label(utility)}</span>) : <span>None listed</span>}</div></div></div></section>
            {videos.length > 0 && <section className="property-detail-section"><h2>Property video</h2><div className="property-video-grid">{videos.map((item) => <video key={item.id} src={item.signed_url!} controls preload="metadata" />)}</div></section>}
            <section className="property-detail-section"><h2>Exact location</h2><p className="section-copy">The owner pinned this exact location when creating the listing.</p><div className="property-map"><iframe title="Exact property location" src={mapUrl} loading="lazy" /></div></section>
            <section className="property-detail-section" id="trust"><h2>Trust & safety</h2><p className="section-copy">Trust signals describe checks completed by NearBasha. A verified owner/agent badge is an account-review signal, not proof of legal identity or ownership of this property.</p><div className="property-tags"><span>Moderator reviewed listing</span><span>Exact pin</span><span>Freshness checked</span><span>Private in-app contact</span>{property.owner_phone_verified_at && <span>Owner phone verified</span>}{roleVerified && <span>Verified {label(property.owner_role)}</span>}</div><ReportListingButton propertyId={property.id} userId={auth?.userId ?? null} /></section>
          </div>

          <aside className="property-contact-card" id="contact">
            <SaveHomeButton propertyId={property.id} userId={auth?.userId ?? null} initialSaved={Boolean(savedRow)} />
            <div className="owner-badge">{property.owner_display_name?.slice(0, 1).toUpperCase() || "O"}</div>
            <p className="eyebrow">Listed by {label(property.owner_role)}</p><h2>{property.owner_display_name || "Property owner"}</h2>
            <div className="property-tags">{property.owner_phone_verified_at && <span>Phone verified</span>}{roleVerified && <span>Verified {label(property.owner_role)}</span>}</div>
            <p>Contact details stay private. Conversations happen inside NearBasha so neither side has to expose a phone number publicly.</p>
            {auth ? <StartConversationButton propertyId={property.id} userId={auth.userId} /> : <Link className="primary-button link-button property-contact-button" href={signInHref}>Sign in to contact owner</Link>}
            <div className="freshness-note"><strong>Fresh listing</strong><span>Published {new Date(property.published_at).toLocaleDateString("en-BD")}{property.expires_at ? ` · reconfirmation due ${new Date(property.expires_at).toLocaleDateString("en-BD")}` : ""}</span></div>
          </aside>
        </div>
      </div>
    </main>
  );
}
