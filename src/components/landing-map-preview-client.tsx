"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowUpRight, MapPin } from "lucide-react";

import type { MapListing } from "@/components/leaflet-map";

const LeafletMap = dynamic(() => import("@/components/leaflet-map"), { ssr: false });
const DHAKA_CENTER: [number, number] = [23.7808, 90.4073];
const discoveryAreas = [
  { name: "Dhanmondi", note: "Lakeside, hospitals & universities", href: "/homes?area=Dhanmondi&radius=5", tone: "sage" },
  { name: "Banani", note: "Work, dining & city connections", href: "/homes?area=Banani&radius=5", tone: "sand" },
  { name: "Uttara", note: "Metro access & calmer streets", href: "/homes?area=Uttara&radius=5", tone: "sky" },
];

function money(value: number | null) {
  return value ? `৳${value.toLocaleString("en-BD")}` : "Rent on request";
}

export function LandingMapPreviewClient({ listings }: { listings: MapListing[] }) {
  const selected = listings[0] ?? null;
  const center: [number, number] = selected ? [selected.latitude, selected.longitude] : DHAKA_CENTER;
  const liveListings = listings.slice(0, 3);

  return (
    <div className="landing-map-preview" aria-label="Preview of currently available rental listings">
      <div className="landing-map-canvas-shell">
        <LeafletMap
          listings={listings}
          center={center}
          radiusKm={null}
          selectedId={selected?.id ?? null}
          onSelect={() => undefined}
        />
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
