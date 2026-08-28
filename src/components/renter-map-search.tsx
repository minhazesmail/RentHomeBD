"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { SaveHomeButton } from "@/components/save-home-button";
import { createClient } from "@/lib/supabase/client";
import type { MapListing } from "@/components/leaflet-map";

const LeafletMap = dynamic(() => import("@/components/leaflet-map"), { ssr: false });
const DHAKA_CENTER: [number, number] = [23.8103, 90.4125];

type InitialSearch = {
  centerLat?: number;
  centerLong?: number;
  radiusKm?: string;
  minRent?: string;
  maxRent?: string;
  tenantType?: string;
  bedrooms?: string;
};

export function RenterMapSearch({
  userId,
  initialSavedPropertyIds = [],
  initialSearch = {},
}: {
  userId: string | null;
  initialSavedPropertyIds?: string[];
  initialSearch?: InitialSearch;
}) {
  const supabase = useMemo(() => createClient() as unknown as SupabaseClient, []);
  const initialCenter: [number, number] = [
    initialSearch.centerLat ?? DHAKA_CENTER[0],
    initialSearch.centerLong ?? DHAKA_CENTER[1],
  ];
  const [listings, setListings] = useState<MapListing[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [center, setCenter] = useState<[number, number]>(initialCenter);
  const [radiusKm, setRadiusKm] = useState(initialSearch.radiusKm ?? "15");
  const [minRent, setMinRent] = useState(initialSearch.minRent ?? "");
  const [maxRent, setMaxRent] = useState(initialSearch.maxRent ?? "");
  const [tenantType, setTenantType] = useState(initialSearch.tenantType ?? "");
  const [bedrooms, setBedrooms] = useState(initialSearch.bedrooms ?? "");
  const [searchName, setSearchName] = useState("");
  const [busy, setBusy] = useState(true);
  const [savingSearch, setSavingSearch] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const savedSet = useMemo(() => new Set(initialSavedPropertyIds), [initialSavedPropertyIds]);

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
    void runSearch(initialCenter);
  }, []);

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
        setMessage("Could not access your location. The search center was not changed.");
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  async function saveSearch() {
    if (!userId) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      return;
    }
    if (!searchName.trim()) {
      setMessage("Give this search a short name before saving it.");
      return;
    }

    setSavingSearch(true);
    setMessage(null);
    const { error } = await supabase.from("saved_searches").insert({
      user_id: userId,
      name: searchName.trim(),
      center_lat: center[0],
      center_long: center[1],
      radius_km: radiusKm ? Number(radiusKm) : null,
      min_rent: minRent ? Number(minRent) : null,
      max_rent: maxRent ? Number(maxRent) : null,
      tenant_type: tenantType || null,
      min_bedrooms: bedrooms ? Number(bedrooms) : null,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setSearchName("");
      setMessage("Search saved. You can reopen it from Saved.");
    }
    setSavingSearch(false);
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
          <div className="save-search-row">
            <input value={searchName} onChange={(e) => setSearchName(e.target.value)} maxLength={80} placeholder="Name this search, e.g. Dhanmondi family" />
            <button className="secondary-button" type="button" onClick={() => void saveSearch()} disabled={savingSearch}>{savingSearch ? "Saving…" : "Save search"}</button>
          </div>
          <p className="form-hint">Search center: {center[0].toFixed(4)}, {center[1].toFixed(4)}</p>
          {message && <div className={message.startsWith("Search saved") ? "success-message compact-message" : "auth-message"}>{message}</div>}
        </div>

        <div className="renter-results-header"><strong>{busy ? "Searching…" : `${listings.length} home${listings.length === 1 ? "" : "s"}`}</strong><span>Closest first</span></div>
        <div className="renter-results-list">
          {!busy && listings.length === 0 && <div className="renter-empty">No available homes match these filters yet.</div>}
          {listings.map((listing) => (
            <div className={`renter-result-card-wrap${selectedId === listing.id ? " active" : ""}`} key={listing.id} onMouseEnter={() => setSelectedId(listing.id)}>
              <Link className="renter-result-card" href={`/homes/${listing.id}`} onFocus={() => setSelectedId(listing.id)}>
                <div className="renter-result-image">{listing.cover_url ? <img src={listing.cover_url} alt="" /> : <span>⌂</span>}</div>
                <div className="renter-result-copy">
                  <strong>{listing.title || "Rental property"}</strong>
                  <span>{listing.address_text || "Location available on map"}</span>
                  <div className="renter-result-meta"><b>{listing.rent_bdt ? `৳${listing.rent_bdt.toLocaleString("en-BD")}` : "Rent on request"}</b><small>{listing.bedrooms ?? "—"} bed · {listing.bathrooms ?? "—"} bath</small></div>
                  {listing.distance_meters !== null && <small>{listing.distance_meters < 1000 ? `${Math.round(listing.distance_meters)} m away` : `${(listing.distance_meters / 1000).toFixed(1)} km away`}</small>}
                </div>
              </Link>
              <SaveHomeButton propertyId={listing.id} userId={userId} initialSaved={savedSet.has(listing.id)} compact />
            </div>
          ))}
        </div>
      </aside>

      <section className="renter-map-panel">
        <LeafletMap listings={listings} center={center} radiusKm={radiusKm ? Number(radiusKm) : null} selectedId={selectedId} onSelect={setSelectedId} />
      </section>
    </div>
  );
}
