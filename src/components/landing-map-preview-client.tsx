"use client";

import dynamic from "next/dynamic";

import type { MapListing } from "@/components/leaflet-map";

const LeafletMap = dynamic(() => import("@/components/leaflet-map"), { ssr: false });
const DHAKA_CENTER: [number, number] = [23.7808, 90.4073];

export function LandingMapPreviewClient({ listings }: { listings: MapListing[] }) {
  const selected = listings[0] ?? null;
  const center: [number, number] = selected ? [selected.latitude, selected.longitude] : DHAKA_CENTER;

  return (
    <div className="landing-map-preview" aria-label="Preview of currently available rental listings">
      <LeafletMap
        listings={listings}
        center={center}
        radiusKm={null}
        selectedId={selected?.id ?? null}
        onSelect={() => undefined}
      />
      <div className="demo-card">
        {selected ? (
          <>
            <div className="demo-card-top">
              <div>
                <h3>{selected.title || "Available rental home"}</h3>
                <p>{selected.address_text || "Exact location pinned"}</p>
              </div>
              <div className="demo-price">{selected.rent_bdt ? `৳${selected.rent_bdt.toLocaleString("en-BD")}/mo` : "Rent on request"}</div>
            </div>
            <div className="demo-meta">
              {selected.bedrooms != null && <span>{selected.bedrooms} bedrooms</span>}
              <span>Exact location pin</span>
              <span>Moderated listing</span>
            </div>
          </>
        ) : (
          <div className="demo-card-top">
            <div>
              <h3>Live listings will appear here</h3>
              <p>The map only shows homes that are currently moderated, published, and available.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
