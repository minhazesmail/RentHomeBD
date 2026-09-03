import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bath, BedDouble, Building2, Camera, CircleCheck, Clock, MapPin, MessageCircle, Phone, Ruler, ShieldCheck, Sparkles, Users, Zap } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { BrandLogo } from "@/components/brand-logo";
import { PhoneRevealButton } from "@/components/phone-reveal-button";
import { ReportListingButton } from "@/components/report-listing-button";
import { SaveHomeButton } from "@/components/save-home-button";
import { StartConversationButton } from "@/components/start-conversation-button";
import { getAuthContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { normalizeTenantTypes, TENANT_PROFILE_LABELS } from "@/lib/tenant-match";
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

function dhakaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function availabilityLabel(availableFrom: string | null) {
  if (!availableFrom) return "Availability date not listed";
  const dateKey = availableFrom.slice(0, 10);
  return dateKey <= dhakaDateKey() ? "Available now" : `Available from ${dateKey}`;
}

export default async function PublicPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const auth = await getAuthContext();
  const { data, error } = await supabase.rpc("get_public_property_detail", { property_uuid: id });
  if (error) throw error;
  const property = (data?.[0] ?? null) as PublicProperty | null;
  if (!property) notFound();

  const [{ data: savedRow }, { data: viewerTrust }, media] = await Promise.all([
    auth ? supabase.from("saved_properties").select("property_id").eq("user_id", auth.userId).eq("property_id", property.id).maybeSingle() : Promise.resolve({ data: null }),
    auth ? supabase.from("profiles").select("phone_verified_at").eq("id", auth.userId).maybeSingle() : Promise.resolve({ data: null }),
    Promise.all((property.media ?? []).map(async (item) => {
      const { data: signed } = await supabase.storage.from("property-media").createSignedUrl(item.storage_path, PUBLIC_MEDIA_TTL_SECONDS);
      return { ...item, signed_url: signed?.signedUrl ?? null };
    })),
  ]);

  const photos = media.filter((item) => item.media_type === "photo" && item.signed_url);
  const videos = media.filter((item) => item.media_type === "video" && item.signed_url);
  const renterTypes = normalizeTenantTypes(property.tenant_types);
  const availability = availabilityLabel(property.available_from);
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${property.longitude - 0.006}%2C${property.latitude - 0.004}%2C${property.longitude + 0.006}%2C${property.latitude + 0.004}&layer=mapnik&marker=${property.latitude}%2C${property.longitude}`;
  const signInHref = `/login?next=${encodeURIComponent(`/homes/${property.id}#contact`)}`;
  const roleVerified = Boolean(property.owner_role_verified_at && property.owner_role_verified_role === property.owner_role);
  const ownerPhoneVerified = Boolean(property.owner_phone_verified_at);
  const viewerPhoneVerified = Boolean(viewerTrust?.phone_verified_at);

  return (
    <main className="property-detail-page">
      <header className="property-detail-topbar">
        <BrandLogo className="property-brand-logo" />
        <div className="property-detail-nav"><Link className="text-link" href="/homes">Back to map</Link>{auth && <Link className="text-link" href="/saved">Saved</Link>}<Link className="text-link" href={auth ? "/messages" : "/login"}>{auth ? "Messages" : "Sign in"}</Link></div>
      </header>
      <div className="property-detail-shell">
        <section className="property-detail-hero">
          <div className="property-detail-hero-main">
            <div className="property-detail-hero-kicker"><p className="eyebrow">{label(property.property_type)}</p><span className="property-detail-availability"><CircleCheck size={13} />{availability}</span></div>
            <h1>{property.title || "Rental property"}</h1>
            <p className="property-detail-address"><MapPin size={17} aria-hidden="true" />{property.address_text || "Exact location shown below"}</p>
          </div>
          <div className="property-detail-price"><span className="property-detail-price-label">Monthly rent</span><strong>{property.rent_bdt ? `৳${property.rent_bdt.toLocaleString("en-BD")}` : "Rent on request"}</strong><span>per month</span><small>{property.deposit_bdt > 0 ? `Deposit ৳${property.deposit_bdt.toLocaleString("en-BD")}` : "No deposit listed"}</small></div>
        </section>

        <section className="property-gallery">
          {photos.length ? photos.slice(0, 5).map((item, index) => <div className={`property-gallery-item ${index === 0 ? "property-gallery-primary" : ""}`} key={item.id}><Image src={item.signed_url!} alt={`${property.title || "Property"} photo ${index + 1}`} fill sizes={index === 0 ? "(max-width: 900px) 100vw, 60vw" : "(max-width: 900px) 50vw, 20vw"} /></div>) : <div className="property-gallery-empty">No property photos are available.</div>}
          {photos.length > 0 && <div className="property-gallery-count"><Camera size={15} aria-hidden="true" />{photos.length} photo{photos.length === 1 ? "" : "s"}</div>}
        </section>

        <div className="property-detail-layout">
          <div className="property-detail-main">
            <section className="property-detail-section property-summary-grid">
              <div className="summary-stat"><span className="summary-stat-icon"><BedDouble size={18} /></span><span className="summary-stat-copy"><strong>{property.bedrooms ?? "—"}</strong><span>Bedrooms</span></span></div>
              <div className="summary-stat"><span className="summary-stat-icon"><Bath size={18} /></span><span className="summary-stat-copy"><strong>{property.bathrooms ?? "—"}</strong><span>Bathrooms</span></span></div>
              <div className="summary-stat"><span className="summary-stat-icon"><Ruler size={18} /></span><span className="summary-stat-copy"><strong>{property.size_sqft ? property.size_sqft.toLocaleString("en-BD") : "—"}</strong><span>Sq ft</span></span></div>
              <div className="summary-stat"><span className="summary-stat-icon"><Building2 size={18} /></span><span className="summary-stat-copy"><strong>{property.floor_number ?? "—"}{property.total_floors ? ` / ${property.total_floors}` : ""}</strong><span>Floor</span></span></div>
            </section>

            <section className="property-detail-section"><div className="property-section-heading"><div><h2>About this home</h2><p className="section-copy">The practical details you’ll want before arranging a viewing.</p></div><Sparkles size={20} aria-hidden="true" /></div><p className="property-description">{property.description || "The owner has not added a longer description yet."}</p><dl className="property-facts"><div><dt>Property type</dt><dd>{label(property.property_type)}</dd></div><div><dt>Furnishing</dt><dd>{label(property.furnishing)}</dd></div><div><dt>Available from</dt><dd>{property.available_from || "—"}</dd></div><div><dt>Deposit</dt><dd>৳{property.deposit_bdt.toLocaleString("en-BD")}</dd></div><div><dt>Gender preference</dt><dd>{label(property.gender_preference)}</dd></div></dl></section>

            <section className="property-detail-section tenant-compatibility-card"><div className="tenant-compatibility-top"><div className="tenant-compatibility-icon"><Users size={22} /></div><div><h2>Renter fit</h2><p>These are the renter types the owner has marked as suitable for this home.</p></div></div><div className="tenant-compatibility-tags">{renterTypes.length ? renterTypes.map((type) => <span key={type}><CircleCheck size={14} />{TENANT_PROFILE_LABELS[type]}</span>) : <span>Renter type not specified</span>}</div></section>

            <section className="property-detail-section"><div className="property-section-heading"><div><h2>Amenities & included utilities</h2><p className="section-copy">A quick scan of what comes with the property and what may already be covered in rent.</p></div></div><div className="property-tag-groups"><div><h3>Amenities</h3><div className="amenity-grid">{property.amenities.length ? property.amenities.map((amenity) => <span className="amenity-item" key={amenity.slug}><Sparkles size={15} />{amenity.name}</span>) : <span className="amenity-item"><Sparkles size={15} />None listed</span>}</div></div><div><h3>Utilities included</h3><div className="amenity-grid utility-grid">{property.utilities_included.length ? property.utilities_included.map((utility) => <span className="amenity-item" key={utility}><Zap size={15} />{label(utility)}</span>) : <span className="amenity-item"><Zap size={15} />None listed</span>}</div></div></div></section>

            {videos.length > 0 && <section className="property-detail-section"><h2>Property video</h2><div className="property-video-grid">{videos.map((item) => <video key={item.id} src={item.signed_url!} controls preload="metadata" />)}</div></section>}
            <section className="property-detail-section"><div className="property-section-heading"><div><h2>Exact location</h2><p className="section-copy">The owner pinned this exact property location during listing creation.</p></div><MapPin size={20} aria-hidden="true" /></div><div className="property-map"><iframe title="Exact property location" src={mapUrl} loading="lazy" /></div></section>
            <section className="property-detail-section property-trust-section" id="trust">
              <div className="trust-section-heading"><div><h2>Trust & safety</h2><p className="section-copy">NearBasha surfaces the checks that matter before you contact a landlord, so you can understand what has been verified at a glance.</p></div><div className="trust-shield" aria-hidden="true"><ShieldCheck size={23} /></div></div>
              <div className="trust-signal-grid">
                <div className="trust-signal"><div className="trust-signal-icon"><CircleCheck size={17} /></div><div className="trust-signal-copy"><strong>Listing reviewed</strong><span>This listing passed the platform moderation flow before appearing publicly.</span></div></div>
                <div className="trust-signal"><div className="trust-signal-icon"><MapPin size={17} /></div><div className="trust-signal-copy"><strong>Exact map pin</strong><span>The owner pinned the property location during listing creation.</span></div></div>
                <div className="trust-signal"><div className="trust-signal-icon"><Clock size={17} /></div><div className="trust-signal-copy"><strong>Freshness tracked</strong><span>Availability has a reconfirmation lifecycle to reduce stale listings.</span></div></div>
                <div className="trust-signal"><div className="trust-signal-icon"><MessageCircle size={17} /></div><div className="trust-signal-copy"><strong>Private contact first</strong><span>You can start with in-app messaging instead of exposing your phone number immediately.</span></div></div>
                <div className="trust-signal"><div className="trust-signal-icon"><Phone size={17} /></div><div className="trust-signal-copy"><strong>{ownerPhoneVerified ? "Owner phone verified" : "Phone verification pending"}</strong><span>{ownerPhoneVerified ? "The listing account has completed phone verification." : "This owner has not completed the phone verification signal yet."}</span></div></div>
                <div className="trust-signal"><div className="trust-signal-icon"><ShieldCheck size={17} /></div><div className="trust-signal-copy"><strong>{roleVerified ? `Verified ${label(property.owner_role)}` : `${label(property.owner_role)} role not verified`}</strong><span>{roleVerified ? "The account role has been reviewed by NearBasha." : "No verified owner/agent role signal is currently attached to this account."}</span></div></div>
              </div>
              <p className="trust-disclaimer">Verification badges are platform trust signals. They do not prove legal ownership of the property or replace your own viewing, document checks, and rental due diligence.</p>
              <div className="trust-report-action"><ReportListingButton propertyId={property.id} userId={auth?.userId ?? null} /></div>
            </section>
          </div>

          <aside className="property-contact-card" id="contact">
            <div className="contact-price-summary"><span>Monthly rent</span><strong>{property.rent_bdt ? `৳${property.rent_bdt.toLocaleString("en-BD")}` : "Rent on request"}</strong><small>{property.deposit_bdt > 0 ? `Deposit ৳${property.deposit_bdt.toLocaleString("en-BD")}` : "Deposit not listed"}</small></div>
            <SaveHomeButton propertyId={property.id} userId={auth?.userId ?? null} initialSaved={Boolean(savedRow)} />
            <div className="owner-identity-row"><div className="owner-badge">{property.owner_display_name?.slice(0, 1).toUpperCase() || "O"}</div><div className="owner-identity-copy"><p className="eyebrow">Listed by {label(property.owner_role)}</p><h2>{property.owner_display_name || "Property owner"}</h2></div></div>
            <div className="owner-verification-badges">
              <span className={`owner-verification-badge${ownerPhoneVerified ? "" : " is-neutral"}`}><Phone size={12} aria-hidden="true" />{ownerPhoneVerified ? "Phone verified" : "Phone unverified"}</span>
              <span className={`owner-verification-badge${roleVerified ? "" : " is-neutral"}`}><ShieldCheck size={12} aria-hidden="true" />{roleVerified ? `Verified ${label(property.owner_role)}` : "Role unverified"}</span>
            </div>
            <div className="owner-trust-summary"><ShieldCheck size={18} aria-hidden="true" /><div><strong>{ownerPhoneVerified || roleVerified ? "Trust signals available" : "Limited verification signals"}</strong><span>Review the trust section below before arranging a viewing or sharing sensitive information.</span></div></div>
            <div className="contact-safe-note"><MessageCircle size={17} aria-hidden="true" /><span>Start with private NearBasha chat. Phone reveal stays controlled and only appears when the verification rules allow it.</span></div>
            <div className="contact-action-stack">
              {auth ? <StartConversationButton propertyId={property.id} userId={auth.userId} /> : <Link className="primary-button link-button property-contact-button" href={signInHref}>Sign in to contact owner</Link>}
              <PhoneRevealButton
                propertyId={property.id}
                signedIn={Boolean(auth)}
                viewerPhoneVerified={viewerPhoneVerified}
                ownerPhoneVerified={ownerPhoneVerified}
                signInHref={signInHref}
              />
            </div>
            <div className="freshness-note"><Clock size={17} aria-hidden="true" /><strong>Fresh listing</strong><span>Published {new Date(property.published_at).toLocaleDateString("en-BD")}{property.expires_at ? ` · reconfirmation due ${new Date(property.expires_at).toLocaleDateString("en-BD")}` : ""}</span></div>
          </aside>
        </div>
      </div>
    </main>
  );
}