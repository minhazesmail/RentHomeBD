"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import type { MapListing } from "@/components/leaflet-map";

const LeafletMap = dynamic(() => import("@/components/leaflet-map"), { ssr: false });
const DHAKA_CENTER: [number, number] = [23.8103, 90.4125];

export function RenterMapSearch() {
  const supabase = useMemo(() => createClient() as unknown as SupabaseClient, []);
  const [listings, setListings] = useState<MapListing[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [center, setCenter] = useState<[number, number]>(DHAKA_CENTER);
  const [radiusKm, setRadiusKm] = useState("15");
  const [minRent, setMinRent] = useState("");
  const [maxRent, setMaxRent] = useState("");
  const [tenantType, setTenantType] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [busy, setBusy] = useState(true);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const runSearch = useCallback(async (searchCenter = center) => {
    setBusy(true);
    setMessage(null);

    const { data, error } = await supabase.rpc("search_available_properties", {
      center_lat: searchCenter[0],
      center_long: searchCenter[1],
      radius_km: radiusKm ? Number(radiusKm) : null,
      min_rent: minRent ? Number(minRent) : null,
      max_rent: maxRent ? Number(maxRent) : null,
      renter_tenant_type: tenantType || null,
      min_bedrooms: bedrooms ? Number(bedrooms) : null,
    });

    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }

    const rows = (data ?? []) as MapListing[];
    const hydrated = await Promise.all(rows.map(async (listing) => {
      if (!listing.cover_media_path) return listing;
      const { data: signed } = await supabase.storage.from("property-media").createSignedUrl(listing.cover_media_path, 1800);
      return { ...listing, cover_url: signed?.signedUrl ?? null };
    }));

    setListings(hydrated);
    setSelectedId(hydrated[0]?.id ?? null);
    setBusy(false);
  }, [bedrooms, center, maxRent, minRent, radiusKm, supabase, tenantType]);

  useEffect(() => {
    void runSearch(DHAKA_CENTER);
  }, []); // Initial MVP search is centered on Dhaka.

  function useMyLocation() {
    if (!navigator.geolocation) {
      setMessage("Location access is not supported by this browser.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const next: [number, number] = [coords.latitude, coords.longitude];
        setCenter(next);
        setLocating(false);
        void runSearch(next);
      },
      () => {
        setLocating(false);
        setMessage("Could not access your location. The search is still centered on Dhaka.");
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  return (
    <div className="renter-search-shell">
      <aside className="renter-search-sidebar">
        <div className="renter-search-heading">
          <p className="eyebrow">Live map search</p>
          <h1>Find a home around you.</h1>
          <p>Only moderated, currently available listings appear here.</p>
        </div>

        <div className="renter-filter-panel">
          <div className="renter-filter-grid">
            <label className="field">Minimum rent (৳)<input inputMode="numeric" value={minRent} onChange={(e) => setMinRent(e.target.value)} placeholder="10000" /></label>
            <label className="field">Maximum rent (৳)<input inputMode="numeric" value={maxRent} onChange={(e) => setMaxRent(e.target.value)} placeholder="40000" /></label>
            <label className="field">Tenant type<select value={tenantType} onChange={(e) => setTenantType(e.target.value)}><option value="">Any tenant type</option><option value="family">Family</option><option value="bachelor">Bachelor</option><option value="student">Student</option><option value="job_holder">Job holder</option></select></label>
            <label className="field">Bedrooms<select value={bedrooms} onChange={(e) => setBedrooms(e.target.value)}><option value="">Any</option><option value="1">1+</option><option value="2">2+</option><option value="3">3+</option><option value="4">4+</option></select></label>
            <label className="field">Radius<select value={radiusKm} onChange={(e) => setRadiusKm(e.target.value)}><option value="2">2 km</option><option value="5">5 km</option><option value="10">10 km</option><option value="15">15 km</option><option value="25">25 km</option><option value="50">50 km</option><option value="">No radius limit</option></select></label>
          </div>
          <div className="renter-filter-actions">
            <button className="secondary-button" type="button" onClick={useMyLocation} disabled={locating || busy}>{locating ? "Locating…" : "Use my location"}</button>
            <button className="primary-button" type="button" onClick={() => void runSearch()} disabled={busy}>{busy ? "Searching…" : "Search map"}</button>
          </div>
          <p className="form-hint">Search center: {center[0].toFixed(4)}, {center[1].toFixed(4)}</p>
          {message && <div className="auth-message">{message}</div>}
        </div>

        <div className="renter-results-header"><strong>{busy ? "Searching…" : `${listings.length} home${listings.length === 1 ? "" : "s"}`}</strong><span>Closest first</span></div>
        <div className="renter-results-list">
          {!busy && listings.length === 0 && <div className="renter-empty">No available homes match these filters yet.</div>}
          {listings.map((listing) => (
            <button className={`renter-result-card${selectedId === listing.id ? " active" : ""}`} type="button" key={listing.id} onClick={() => setSelectedId(listing.id)}>
              <div className="renter-result-image">{listing.cover_url ? <img src={listing.cover_url} alt="" /> : <span>⌂</span>}</div>
              <div className="renter-result-copy">
                <strong>{listing.title || "Rental property"}</strong>
                <span>{listing.address_text || "Location available on map"}</span>
                <div className="renter-result-meta"><b>{listing.rent_bdt ? `৳${listing.rent_bdt.toLocaleString("en-BD")}` : "Rent on request"}</b><small>{listing.bedrooms ?? "—"} bed · {listing.bathrooms ?? "—"} bath</small></div>
                {listing.distance_meters !== null && <small>{listing.distance_meters < 1000 ? `${Math.round(listing.distance_meters)} m away` : `${(listing.distance_meters / 1000).toFixed(1)} km away`}</small>}
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className="renter-map-panel">
        <LeafletMap listings={listings} center={center} radiusKm={radiusKm ? Number(radiusKm) : null} selectedId={selectedId} onSelect={setSelectedId} />
      </section>
    </div>
  );
}
