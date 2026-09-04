import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";

import styles from "@/components/landing-map-static.module.css";

export type LandingMapListing = {
  id: string;
  title: string | null;
  address_text: string | null;
  rent_bdt: number | null;
  bedrooms: number | null;
  latitude: number;
  longitude: number;
  cover_url: string | null;
};

const discoveryAreas = [
  { name: "Dhanmondi", note: "Lakeside, hospitals & universities", href: "/homes?area=Dhanmondi&radius=5", tone: "sage" },
  { name: "Banani", note: "Work, dining & city connections", href: "/homes?area=Banani&radius=5", tone: "sand" },
  { name: "Uttara", note: "Metro access & calmer streets", href: "/homes?area=Uttara&radius=5", tone: "sky" },
];

const previewLabels = [
  { name: "Dhanmondi", left: "20%", top: "68%" },
  { name: "Banani", left: "62%", top: "29%" },
  { name: "Gulshan", left: "74%", top: "19%" },
  { name: "Tejgaon", left: "48%", top: "43%" },
  { name: "Uttara", left: "51%", top: "10%" },
];

function money(value: number | null) {
  return value ? `৳${value.toLocaleString("en-BD")}` : "Rent on request";
}

function pinPosition(listing: LandingMapListing, index: number) {
  // Project Dhaka-area coordinates into a stable decorative viewport. Clamp so
  // unexpected coordinates never render a pin outside the preview surface.
  const minLat = 23.68;
  const maxLat = 23.9;
  const minLng = 90.32;
  const maxLng = 90.48;
  const rawLeft = ((listing.longitude - minLng) / (maxLng - minLng)) * 76 + 12;
  const rawTop = (1 - (listing.latitude - minLat) / (maxLat - minLat)) * 72 + 12;
  const fallbackLeft = 24 + index * 24;
  const fallbackTop = 36 + (index % 2) * 24;

  return {
    left: `${Math.min(88, Math.max(12, Number.isFinite(rawLeft) ? rawLeft : fallbackLeft))}%`,
    top: `${Math.min(84, Math.max(16, Number.isFinite(rawTop) ? rawTop : fallbackTop))}%`,
  };
}

export function LandingMapPreviewClient({ listings }: { listings: LandingMapListing[] }) {
  const liveListings = listings.slice(0, 3);

  return (
    <div className="landing-map-preview" aria-label="Preview of currently available rental listings">
      <div className="landing-map-canvas-shell">
        <div className={styles.mapSurface} aria-label="Decorative Dhaka map preview">
          {previewLabels.map((label) => (
            <span className={styles.mapLabel} style={{ left: label.left, top: label.top }} key={label.name}>{label.name}</span>
          ))}

          {liveListings.map((listing, index) => {
            const position = pinPosition(listing, index);
            return (
              <Link
                className={styles.pinLink}
                href={`/homes/${listing.id}`}
                style={position}
                aria-label={`${listing.title || "Rental home"} · ${money(listing.rent_bdt)}`}
                key={listing.id}
              >
                <span className={styles.pin}><span>{index + 1}</span></span>
              </Link>
            );
          })}

          {!liveListings.length && (
            <div className={styles.emptyState}>
              <strong>Explore Dhaka by neighborhood</strong>
              <span>Open the full map to search exact streets, landmarks, and nearby rental homes.</span>
            </div>
          )}
        </div>
      </div>

      <aside className="landing-map-rail" aria-label={liveListings.length ? "Available homes" : "Suggested places to explore"}>
        <div className="landing-map-rail-heading">
          <div><span>{liveListings.length ? "Live near you" : "Start exploring"}</span><strong>{liveListings.length ? `${liveListings.length} recent homes` : "Popular Dhaka areas"}</strong></div>
          <MapPin aria-hidden="true" />
        </div>

        <div className="landing-map-rail-list">
          {liveListings.length ? liveListings.map((listing) => (
            <Link className="landing-map-property-card" href={`/homes/${listing.id}`} key={listing.id}>
              <div className="landing-map-property-image">
                {listing.cover_url ? <Image src={listing.cover_url} alt="" fill sizes="240px" /> : <span aria-hidden="true">⌂</span>}
                <small>Moderated</small>
              </div>
              <div className="landing-map-property-copy">
                <span>{listing.address_text || "Exact location pinned"}</span>
                <strong>{listing.title || "Rental home"}</strong>
                <div><b>{money(listing.rent_bdt)}</b><small>{listing.bedrooms ?? "—"} bed</small></div>
              </div>
            </Link>
          )) : discoveryAreas.map((area, index) => (
            <Link className={`landing-map-area-card tone-${area.tone}`} href={area.href} key={area.name}>
              <span className="landing-map-area-number">0{index + 1}</span>
              <div><strong>{area.name}</strong><small>{area.note}</small></div>
              <ArrowUpRight aria-hidden="true" />
            </Link>
          ))}
        </div>

        <Link className="landing-map-rail-action" href="/homes">Browse the full map <ArrowUpRight aria-hidden="true" /></Link>
      </aside>

      <div className="landing-map-floating-note"><span aria-hidden="true" />Exact pins reveal what “nearby” really means</div>
    </div>
  );
}
