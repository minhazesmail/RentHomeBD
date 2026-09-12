import Link from "next/link";
import { notFound } from "next/navigation";
import { Bath, BedDouble, Building2, CircleAlert, CircleCheck, Clock, MapPin, MessageCircle, Phone, Ruler, ShieldCheck, Sparkles, Users, Zap } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { BrandLogo } from "@/components/brand-logo";
import { PhoneRevealButton } from "@/components/phone-reveal-button";
import { PropertyLocationActions } from "@/components/property-location-actions";
import { PropertyMediaGallery, type PropertyGalleryMedia } from "@/components/property-media-gallery";
import { PropertyShareButton } from "@/components/property-share-button";
import { ReportListingButton } from "@/components/report-listing-button";
import { SaveHomeButton } from "@/components/save-home-button";
import { StartConversationButton } from "@/components/start-conversation-button";
import { formatCurrency, formatDate, formatNumber } from "@/i18n/format";
import { getDictionary } from "@/i18n/get-dictionary";
import { getLocale } from "@/i18n/get-locale";
import { formatPropertyDetailText, getPropertyDetailCopy, type PropertyDetailCopy } from "@/i18n/property-detail-copy";
import { getAuthContext } from "@/lib/auth";
import { safeHomesReturnPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";
import { normalizeTenantType, normalizeTenantTypes, tenantCompatibility, type TenantType } from "@/lib/tenant-match";

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

function displayValue(value: string | null | undefined, values: Record<string, string>) {
  if (!value) return "—";
  return values[value] ?? value.replaceAll("_", " ");
}

function formatPropertyDate(value: string | null | undefined, locale: "en" | "bn") {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return formatDate(parsed, locale, {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

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

function availabilityLabel(availableFrom: string | null, locale: "en" | "bn", copy: PropertyDetailCopy) {
  if (!availableFrom) return copy.availability.dateNotListed;
  const dateKey = availableFrom.slice(0, 10);
  if (dateKey <= dhakaDateKey()) return copy.availability.availableNow;
  return formatPropertyDetailText(copy.availability.availableFrom, { date: formatPropertyDate(availableFrom, locale) });
}

function tenantFromReturnPath(returnTo: string): Exclude<TenantType, "everyone"> | undefined {
  const parsed = new URL(returnTo, "https://nearbasha.invalid");
  const tenant = normalizeTenantType(parsed.searchParams.get("tenant"));
  return tenant && tenant !== "everyone" ? tenant : undefined;
}

export default async function PublicPropertyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query, locale] = await Promise.all([params, searchParams, getLocale()]);
  const dictionary = getDictionary(locale);
  const copy = getPropertyDetailCopy(locale);
  const returnTo = safeHomesReturnPath(typeof query.returnTo === "string" ? query.returnTo : null);
  const searchTenantType = tenantFromReturnPath(returnTo);
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const auth = await getAuthContext();
  const { data, error } = await supabase.rpc("get_public_property_detail", { property_uuid: id });
  if (error) throw error;
  const property = (data?.[0] ?? null) as PublicProperty | null;
  if (!property) notFound();

  const [{ data: savedRow }, { data: viewerProfile }, media] = await Promise.all([
    auth ? supabase.from("saved_properties").select("property_id").eq("user_id", auth.userId).eq("property_id", property.id).maybeSingle() : Promise.resolve({ data: null }),
    auth ? supabase.from("profiles").select("phone_verified_at, preferred_tenant_type").eq("id", auth.userId).maybeSingle() : Promise.resolve({ data: null }),
    Promise.all((property.media ?? []).map(async (item) => {
      const { data: signed } = await supabase.storage.from("property-media").createSignedUrl(item.storage_path, PUBLIC_MEDIA_TTL_SECONDS);
      return { ...item, signed_url: signed?.signedUrl ?? null };
    })),
  ]);

  const galleryMedia = media
    .filter((item): item is MediaItem & { signed_url: string } => Boolean(item.signed_url))
    .map<PropertyGalleryMedia>((item) => ({ id: item.id, media_type: item.media_type, sort_order: item.sort_order, signed_url: item.signed_url }));
  const renterTypes = normalizeTenantTypes(property.tenant_types);
  const profileTenantType = normalizeTenantType(viewerProfile?.preferred_tenant_type);
  const profileMatchTenant = profileTenantType && profileTenantType !== "everyone" ? profileTenantType : undefined;
  const activeTenantType = searchTenantType ?? profileMatchTenant;
  const fitSource = searchTenantType ? "search" : activeTenantType ? "profile" : null;
  const renterFit = tenantCompatibility(renterTypes, activeTenantType);
  const tenantLabels: Record<TenantType, string> = {
    family: dictionary.common.tenant.family,
    bachelor: dictionary.common.tenant.bachelor,
    student: dictionary.common.tenant.student,
    job_holder: dictionary.common.tenant.jobHolder,
    everyone: dictionary.common.tenant.everyone,
  };
  const activeTenantLabel = activeTenantType ? tenantLabels[activeTenantType] : null;
  const sourceLabel = fitSource === "search" ? copy.renter.searchSource : copy.renter.profileSource;
  const fitTemplate = activeTenantType
    ? fitSource === "search"
      ? renterFit === "match" ? copy.renter.searchMatch : renterFit === "mismatch" ? copy.renter.searchMismatch : copy.renter.searchUnknown
      : renterFit === "match" ? copy.renter.profileMatch : renterFit === "mismatch" ? copy.renter.profileMismatch : copy.renter.profileUnknown
    : null;
  const personalizedRenterFit = fitTemplate && activeTenantLabel
    ? formatPropertyDetailText(fitTemplate, { tenant: activeTenantLabel })
    : profileTenantType === "everyone"
      ? copy.renter.everyoneProfile
      : auth
        ? copy.renter.profilePrompt
        : copy.renter.policyIntro;
  const renterFitStatus = activeTenantType && activeTenantLabel
    ? formatPropertyDetailText(
      renterFit === "match" ? copy.renter.matchStatus : renterFit === "mismatch" ? copy.renter.mismatchStatus : copy.renter.unknownStatus,
      { tenant: activeTenantLabel, source: sourceLabel },
    )
    : null;
  const availability = availabilityLabel(property.available_from, locale, copy);
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${property.longitude - 0.006}%2C${property.latitude - 0.004}%2C${property.longitude + 0.006}%2C${property.latitude + 0.004}&layer=mapnik&marker=${property.latitude}%2C${property.longitude}`;
  const returnQuery = returnTo !== "/homes" ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
  const detailPath = `/homes/${property.id}${returnQuery}`;
  const signInHref = `/login?next=${encodeURIComponent(`${detailPath}#contact`)}`;
  const reportSignInHref = `/login?next=${encodeURIComponent(`${detailPath}#trust`)}`;
  const roleVerified = Boolean(property.owner_role_verified_at && property.owner_role_verified_role === property.owner_role);
  const ownerPhoneVerified = Boolean(property.owner_phone_verified_at);
  const viewerPhoneVerified = Boolean(viewerProfile?.phone_verified_at);
  const ownerRoleLabel = displayValue(property.owner_role, copy.values);
  const rentLabel = property.rent_bdt ? formatCurrency(property.rent_bdt, locale) : copy.common.rentOnRequest;
  const depositLabel = formatCurrency(property.deposit_bdt, locale);
  const showCompatibilityReturn = Boolean(searchTenantType && renterFit !== "match");

  return (
    <main className="property-detail-page">
      <header className="property-detail-topbar">
        <BrandLogo className="property-brand-logo" />
        <div className="property-detail-nav">
          <Link className="text-link" href={returnTo}>{copy.nav.backToMap}</Link>
          {auth && <Link className="text-link" href="/saved">{copy.nav.saved}</Link>}
          <Link className="text-link" href={auth ? "/messages" : "/login"}>{auth ? copy.nav.messages : copy.nav.signIn}</Link>
        </div>
      </header>

      <div className="property-detail-shell">
        <section className="property-detail-hero">
          <div className="property-detail-hero-main">
            <div className="property-detail-hero-kicker">
              <p className="eyebrow">{displayValue(property.property_type, copy.values)}</p>
              <span className="property-detail-availability"><CircleCheck size={13} aria-hidden="true" />{availability}</span>
            </div>
            <h1>{property.title || copy.common.rentalProperty}</h1>
            <p className="property-detail-address"><MapPin size={17} aria-hidden="true" />{property.address_text || copy.common.exactLocationFallback}</p>
          </div>
          <div className="property-detail-price">
            <span className="property-detail-price-label">{copy.common.monthlyRent}</span>
            <strong>{rentLabel}</strong>
            <span>{copy.common.perMonth}</span>
            <small>{property.deposit_bdt > 0 ? `${copy.common.deposit} ${depositLabel}` : copy.common.noDepositListed}</small>
          </div>
        </section>

        <PropertyMediaGallery media={galleryMedia} propertyTitle={property.title || copy.common.rentalProperty} />

        <div className="property-detail-layout">
          <div className="property-detail-main">
            <section className="property-detail-section property-summary-grid">
              <div className="summary-stat"><span className="summary-stat-icon"><BedDouble size={18} aria-hidden="true" /></span><span className="summary-stat-copy"><strong>{property.bedrooms == null ? "—" : formatNumber(property.bedrooms, locale)}</strong><span>{copy.stats.bedrooms}</span></span></div>
              <div className="summary-stat"><span className="summary-stat-icon"><Bath size={18} aria-hidden="true" /></span><span className="summary-stat-copy"><strong>{property.bathrooms == null ? "—" : formatNumber(property.bathrooms, locale)}</strong><span>{copy.stats.bathrooms}</span></span></div>
              <div className="summary-stat"><span className="summary-stat-icon"><Ruler size={18} aria-hidden="true" /></span><span className="summary-stat-copy"><strong>{property.size_sqft ? formatNumber(property.size_sqft, locale) : "—"}</strong><span>{copy.stats.squareFeet}</span></span></div>
              <div className="summary-stat"><span className="summary-stat-icon"><Building2 size={18} aria-hidden="true" /></span><span className="summary-stat-copy"><strong>{property.floor_number == null ? "—" : formatNumber(property.floor_number, locale)}{property.total_floors ? ` / ${formatNumber(property.total_floors, locale)}` : ""}</strong><span>{copy.stats.floor}</span></span></div>
            </section>

            <section className="property-detail-section">
              <div className="property-section-heading"><div><h2>{copy.about.heading}</h2><p className="section-copy">{copy.about.description}</p></div><Sparkles size={20} aria-hidden="true" /></div>
              <p className="property-description">{property.description || copy.about.noDescription}</p>
              <dl className="property-facts">
                <div><dt>{copy.about.propertyType}</dt><dd>{displayValue(property.property_type, copy.values)}</dd></div>
                <div><dt>{copy.about.furnishing}</dt><dd>{displayValue(property.furnishing, copy.values)}</dd></div>
                <div><dt>{copy.about.availableFrom}</dt><dd>{formatPropertyDate(property.available_from, locale)}</dd></div>
                <div><dt>{copy.about.deposit}</dt><dd>{depositLabel}</dd></div>
                <div><dt>{copy.about.genderPreference}</dt><dd>{displayValue(property.gender_preference, copy.values)}</dd></div>
              </dl>
            </section>

            <section className={`property-detail-section tenant-compatibility-card is-${renterFit}`}>
              <div className="tenant-compatibility-top">
                <div className="tenant-compatibility-icon"><Users size={22} aria-hidden="true" /></div>
                <div><h2>{copy.renter.heading}</h2><p>{personalizedRenterFit}</p></div>
              </div>
              <div className="tenant-compatibility-tags">
                {renterFitStatus && <span>{renterFit === "match" ? <CircleCheck size={14} aria-hidden="true" /> : <CircleAlert size={14} aria-hidden="true" />}{renterFitStatus}</span>}
                {renterTypes.length ? renterTypes.map((type) => <span key={type}><CircleCheck size={14} aria-hidden="true" />{tenantLabels[type]}</span>) : <span><CircleAlert size={14} aria-hidden="true" />{copy.renter.unspecified}</span>}
              </div>
              {showCompatibilityReturn && (
                <div className="owner-trust-summary">
                  <CircleAlert size={17} aria-hidden="true" />
                  <div>
                    <strong>{copy.contact.fitContext}</strong>
                    <span>{renterFit === "mismatch" ? copy.renter.mismatchContactNote : copy.renter.unknownContactNote}</span>
                    <Link className="text-link" href={returnTo}>{copy.renter.backToCompatibleHomes}</Link>
                  </div>
                </div>
              )}
            </section>

            <section className="property-detail-section">
              <div className="property-section-heading"><div><h2>{copy.amenities.heading}</h2><p className="section-copy">{copy.amenities.description}</p></div></div>
              <div className="property-tag-groups">
                <div><h3>{copy.amenities.amenities}</h3><div className="amenity-grid">{property.amenities.length ? property.amenities.map((amenity) => <span className="amenity-item" key={amenity.slug}><Sparkles size={15} aria-hidden="true" />{amenity.name}</span>) : <span className="amenity-item"><Sparkles size={15} aria-hidden="true" />{copy.amenities.noneListed}</span>}</div></div>
                <div><h3>{copy.amenities.utilities}</h3><div className="amenity-grid utility-grid">{property.utilities_included.length ? property.utilities_included.map((utility) => <span className="amenity-item" key={utility}><Zap size={15} aria-hidden="true" />{displayValue(utility, copy.values)}</span>) : <span className="amenity-item"><Zap size={15} aria-hidden="true" />{copy.amenities.noneListed}</span>}</div></div>
              </div>
            </section>

            <section className="property-detail-section">
              <div className="property-section-heading"><div><h2>{copy.location.heading}</h2><p className="section-copy">{copy.location.description}</p></div><MapPin size={20} aria-hidden="true" /></div>
              <div className="property-map"><iframe title={copy.location.iframeTitle} src={mapUrl} loading="lazy" /></div>
              <PropertyLocationActions latitude={property.latitude} longitude={property.longitude} locale={locale} />
            </section>

            <section className="property-detail-section property-trust-section" id="trust">
              <div className="trust-section-heading"><div><h2>{copy.trust.heading}</h2><p className="section-copy">{copy.trust.description}</p></div><div className="trust-shield" aria-hidden="true"><ShieldCheck size={23} /></div></div>
              <div className="trust-signal-grid">
                <div className="trust-signal"><div className="trust-signal-icon"><CircleCheck size={17} /></div><div className="trust-signal-copy"><strong>{copy.trust.listingReviewed}</strong><span>{copy.trust.listingReviewedText}</span></div></div>
                <div className="trust-signal"><div className="trust-signal-icon"><MapPin size={17} /></div><div className="trust-signal-copy"><strong>{copy.trust.exactMapPin}</strong><span>{copy.trust.exactMapPinText}</span></div></div>
                <div className="trust-signal"><div className="trust-signal-icon"><Clock size={17} /></div><div className="trust-signal-copy"><strong>{copy.trust.freshnessTracked}</strong><span>{copy.trust.freshnessTrackedText}</span></div></div>
                <div className="trust-signal"><div className="trust-signal-icon"><MessageCircle size={17} /></div><div className="trust-signal-copy"><strong>{copy.trust.privateContact}</strong><span>{copy.trust.privateContactText}</span></div></div>
                <div className="trust-signal"><div className="trust-signal-icon"><Phone size={17} /></div><div className="trust-signal-copy"><strong>{ownerPhoneVerified ? copy.trust.ownerPhoneVerified : copy.trust.phonePending}</strong><span>{ownerPhoneVerified ? copy.trust.ownerPhoneVerifiedText : copy.trust.phonePendingText}</span></div></div>
                <div className="trust-signal"><div className="trust-signal-icon"><ShieldCheck size={17} /></div><div className="trust-signal-copy"><strong>{formatPropertyDetailText(roleVerified ? copy.trust.verifiedRole : copy.trust.unverifiedRole, { role: ownerRoleLabel })}</strong><span>{roleVerified ? copy.trust.verifiedRoleText : copy.trust.unverifiedRoleText}</span></div></div>
              </div>
              <p className="trust-disclaimer">{copy.trust.disclaimer}</p>
              <div className="trust-report-action"><ReportListingButton propertyId={property.id} userId={auth?.userId ?? null} signInHref={reportSignInHref} /></div>
            </section>
          </div>

          <aside className="property-contact-card" id="contact">
            <div className="contact-price-summary"><span>{copy.common.monthlyRent}</span><strong>{rentLabel}</strong><small>{property.deposit_bdt > 0 ? `${copy.common.deposit} ${depositLabel}` : copy.common.depositNotListed}</small></div>
            <SaveHomeButton propertyId={property.id} userId={auth?.userId ?? null} initialSaved={Boolean(savedRow)} />
            <PropertyShareButton title={property.title || copy.common.rentalProperty} />
            <div className="owner-identity-row"><div className="owner-badge">{property.owner_display_name?.slice(0, 1).toUpperCase() || "O"}</div><div className="owner-identity-copy"><p className="eyebrow">{formatPropertyDetailText(copy.contact.listedBy, { role: ownerRoleLabel })}</p><h2>{property.owner_display_name || copy.contact.propertyOwner}</h2></div></div>
            <div className="owner-verification-badges">
              <span className={`owner-verification-badge${ownerPhoneVerified ? "" : " is-neutral"}`}><Phone size={12} aria-hidden="true" />{ownerPhoneVerified ? copy.contact.phoneVerified : copy.contact.phoneUnverified}</span>
              <span className={`owner-verification-badge${roleVerified ? "" : " is-neutral"}`}><ShieldCheck size={12} aria-hidden="true" />{roleVerified ? formatPropertyDetailText(copy.contact.verifiedRole, { role: ownerRoleLabel }) : copy.contact.roleUnverified}</span>
            </div>
            <Link className="text-link" href="#trust">{copy.trust.reviewDetails}</Link>
            {activeTenantType && renterFitStatus && (
              <div className="owner-trust-summary">
                {renterFit === "match" ? <CircleCheck size={17} aria-hidden="true" /> : <CircleAlert size={17} aria-hidden="true" />}
                <div>
                  <strong>{copy.contact.fitContext}</strong>
                  <span>{renterFitStatus}</span>
                  {showCompatibilityReturn && <Link className="text-link" href={returnTo}>{copy.renter.backToCompatibleHomes}</Link>}
                </div>
              </div>
            )}
            <div className="contact-action-stack">
              {auth ? <StartConversationButton propertyId={property.id} userId={auth.userId} /> : <Link className="primary-button link-button property-contact-button" href={signInHref}>{copy.contact.signInToContact}</Link>}
              <PhoneRevealButton propertyId={property.id} signedIn={Boolean(auth)} viewerPhoneVerified={viewerPhoneVerified} ownerPhoneVerified={ownerPhoneVerified} signInHref={signInHref} />
            </div>
            <div className="freshness-note"><Clock size={17} aria-hidden="true" /><div><strong>{copy.contact.freshListing}</strong><span>{formatPropertyDetailText(copy.contact.published, { date: formatPropertyDate(property.published_at, locale) })}{property.expires_at ? ` · ${formatPropertyDetailText(copy.contact.reconfirmationDue, { date: formatPropertyDate(property.expires_at, locale) })}` : ""}</span></div></div>
          </aside>
        </div>
      </div>
    </main>
  );
}
