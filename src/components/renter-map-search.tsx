"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase, CircleCheck, GraduationCap, User, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { SaveHomeButton } from "@/components/save-home-button";
import type { MapListing, UserMapLocation } from "@/components/leaflet-map";
import { RenterResultsList } from "@/components/renter-results-list";
import { LOCATION_PRESETS } from "@/lib/location-presets";
import { TENANT_PROFILE_LABELS, tenantCompatibility, tenantSummary, tenantTone, type TenantType } from "@/lib/tenant-match";
import { createClient } from "@/lib/supabase/client";

const LeafletMap = dynamic(() => import("@/components/leaflet-map"), { ssr: false });
const DHAKA_CENTER: [number, number] = [23.8103, 90.4125];
const RADIUS_OPTIONS = ["2", "5", "10", "15", "25", "50", "100"];
const MAX_RENT_FILTER = 10_000_000;
const PUBLIC_MEDIA_TTL_SECONDS = 300;
const LIVE_SEARCH_MIN_DISTANCE_METERS = 120;
const LIVE_CENTER_MIN_DISTANCE_METERS = 30;
const LIVE_DISPLAY_MIN_DISTANCE_METERS = 12;
const LIVE_DISPLAY_ACCURACY_DELTA_METERS = 10;
const LIVE_STATUS_ACCURACY_DELTA_METERS = 5;

type SortOption = "recommended" | "distance" | "rent-asc" | "rent-desc";

type InitialSearch = {
  centerLat?: number;
  centerLong?: number;
  radiusKm?: string;
  minRent?: string;
  maxRent?: string;
  tenantType?: string;
  bedrooms?: string;
  selectedId?: string;
  sort?: string;
};

type TenantTypeRow = {
  property_id: string;
  tenant_type: TenantType;
};

function initialRadius(value?: string) {
  return value && RADIUS_OPTIONS.includes(value) ? value : "15";
}

function initialSort(value?: string): SortOption {
  return value === "distance" || value === "rent-asc" || value === "rent-desc" ? value : "recommended";
}

function sortDescription(sort: SortOption, preferredTenantType?: TenantType, tenantType?: string) {
  if (sort === "distance") return "Nearest first";
  if (sort === "rent-asc") return "Lowest rent first";
  if (sort === "rent-desc") return "Highest rent first";
  return preferredTenantType && !tenantType ? "Best matches first" : "Closest first";
}

function friendlySearchError(error: unknown) {
  const raw = error instanceof Error ? error.message : typeof error === "object" && error !== null && "message" in error && typeof (error as { message?: unknown }).message === "string" ? (error as { message: string }).message : "";
  const message = raw.toLowerCase();
  if (message.includes("search radius")) return "Choose a search radius between 0.5 and 100 km.";
  if (message.includes("minimum rent cannot")) return "Minimum rent cannot be higher than maximum rent.";
  if (message.includes("rent is outside")) return "Rent filters must be between ৳0 and ৳10,000,000.";
  if (message.includes("search center") || message.includes("latitude") || message.includes("longitude")) return "Choose a valid map location and try again.";
  if (message.includes("bedroom filter")) return "Choose a valid bedroom filter.";
  if (message.includes("violates check constraint")) return "One or more saved-search filters are outside the allowed range.";
  return "We couldn't run this search. Check the filters and try again.";
}

function distanceMeters(a: [number, number], b: [number, number]) {
  const earthRadius = 6_371_000;
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const lat1 = toRadians(a[0]);
  const lat2 = toRadians(b[0]);
  const deltaLat = toRadians(b[0] - a[0]);
  const deltaLong = toRadians(b[1] - a[1]);
  const value = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLong / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function pointInPolygon(point: [number, number], polygon: [number, number][]) {
  const [lat, lng] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [latI, lngI] = polygon[i];
    const [latJ, lngJ] = polygon[j];
    const intersects = (lngI > lng) !== (lngJ > lng) && lat < ((latJ - latI) * (lng - lngI)) / ((lngJ - lngI) || Number.EPSILON) + latI;
    if (intersects) inside = !inside;
  }
  return inside;
}

function compatibilityRank(listing: MapListing, preference?: TenantType) {
  const compatibility = tenantCompatibility(listing.tenant_types ?? [], preference);
  if (compatibility === "match") return 0;
  if (compatibility === "neutral") return 1;
  return 2;
}

function sortedResults(listings: MapListing[], sort: SortOption, preferredTenantType?: TenantType, tenantType?: string) {
  const next = [...listings];
  const distance = (listing: MapListing) => listing.distance_meters ?? Number.MAX_SAFE_INTEGER;
  const rent = (listing: MapListing) => listing.rent_bdt ?? Number.MAX_SAFE_INTEGER;

  if (sort === "distance") return next.sort((a, b) => distance(a) - distance(b));
  if (sort === "rent-asc") return next.sort((a, b) => rent(a) - rent(b) || distance(a) - distance(b));
  if (sort === "rent-desc") {
    return next.sort((a, b) => {
      if (a.rent_bdt == null && b.rent_bdt == null) return distance(a) - distance(b);
      if (a.rent_bdt == null) return 1;
      if (b.rent_bdt == null) return -1;
      return b.rent_bdt - a.rent_bdt || distance(a) - distance(b);
    });
  }
  if (preferredTenantType && !tenantType) {
    return next.sort((a, b) => compatibilityRank(a, preferredTenantType) - compatibilityRank(b, preferredTenantType) || distance(a) - distance(b));
  }
  return next.sort((a, b) => distance(a) - distance(b));
}

function TenantBadge({ types, preference }: { types: TenantType[]; preference?: TenantType }) {
  const tone = tenantTone(types);
  const compatibility = tenantCompatibility(types, preference);
  const iconProps = { size: 12, strokeWidth: 2.2, "aria-hidden": true as const };
  const icon = tone === "family" ? <Users {...iconProps} />
    : tone === "student" ? <GraduationCap {...iconProps} />
    : tone === "bachelor" ? (types.includes("job_holder") ? <Briefcase {...iconProps} /> : <User {...iconProps} />)
    : <CircleCheck {...iconProps} />;

  return <span className={`tenant-match-badge tenant-${tone}${compatibility === "match" ? " is-profile-match" : ""}`}>{icon}<span>{tenantSummary(types)}</span></span>;
}

export function RenterMapSearch({ userId, initialSavedPropertyIds = [], initialSearch = {}, preferredTenantType }: { userId: string | null; initialSavedPropertyIds?: string[]; initialSearch?: InitialSearch; preferredTenantType?: TenantType }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient() as unknown as SupabaseClient, []);
  const initialCenter: [number, number] = [initialSearch.centerLat ?? DHAKA_CENTER[0], initialSearch.centerLong ?? DHAKA_CENTER[1]];
  const initialLocationPreset = LOCATION_PRESETS.find((preset) => Math.abs(preset.latitude - initialCenter[0]) < 0.0001 && Math.abs(preset.longitude - initialCenter[1]) < 0.0001)?.label ?? "";
  const [listings, setListings] = useState<MapListing[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialSearch.selectedId ?? null);
  const [center, setCenter] = useState<[number, number]>(initialCenter);
  const [locationPreset, setLocationPreset] = useState(initialLocationPreset);
  const [radiusKm, setRadiusKm] = useState(initialRadius(initialSearch.radiusKm));
  const [minRent, setMinRent] = useState(initialSearch.minRent ?? "");
  const [maxRent, setMaxRent] = useState(initialSearch.maxRent ?? "");
  const [tenantType, setTenantType] = useState(initialSearch.tenantType ?? "");
  const [bedrooms, setBedrooms] = useState(initialSearch.bedrooms ?? "");
  const [sortOption, setSortOption] = useState<SortOption>(initialSort(initialSearch.sort));
  const [searchName, setSearchName] = useState("");
  const [busy, setBusy] = useState(true);
  const [savingSearch, setSavingSearch] = useState(false);
  const [locating, setLocating] = useState(false);
  const [liveTracking, setLiveTracking] = useState(false);
  const [userLocation, setUserLocation] = useState<UserMapLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [customArea, setCustomArea] = useState<[number, number][]>([]);
  const [drawingCustomArea, setDrawingCustomArea] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const lastLiveCenterRef = useRef<[number, number] | null>(null);
  const lastLiveSearchLocationRef = useRef<[number, number] | null>(null);
  const lastLiveDisplayLocationRef = useRef<UserMapLocation | null>(null);
  const lastLiveStatusAccuracyRef = useRef<number | null>(null);
  const liveFixReceivedRef = useRef(false);
  const runSearchRef = useRef<(searchCenter?: [number, number]) => Promise<void>>(async () => {});
  const initialCenterRef = useRef(initialCenter);

  const savedSet = useMemo(() => new Set(initialSavedPropertyIds), [initialSavedPropertyIds]);
  const softPreference = tenantType ? undefined : preferredTenantType;
  const customAreaMode = drawingCustomArea || customArea.length > 0;
  const orderedListings = useMemo(() => sortedResults(listings, sortOption, preferredTenantType, tenantType), [listings, preferredTenantType, sortOption, tenantType]);
  const visibleListings = useMemo(() => customArea.length >= 3 ? orderedListings.filter((listing) => pointInPolygon([listing.latitude, listing.longitude], customArea)) : orderedListings, [customArea, orderedListings]);
  const effectiveSelectedId = selectedId && visibleListings.some((listing) => listing.id === selectedId) ? selectedId : null;
  const selectedListing = useMemo(
    () => visibleListings.find((listing) => listing.id === effectiveSelectedId) ?? null,
    [effectiveSelectedId, visibleListings],
  );

  const searchReturnPath = useCallback((selectionId: string) => {
    const params = new URLSearchParams({
      lat: center[0].toFixed(6),
      lng: center[1].toFixed(6),
      radius: radiusKm,
      selected: selectionId,
      sort: sortOption,
    });
    if (minRent) params.set("minRent", minRent);
    if (maxRent) params.set("maxRent", maxRent);
    if (tenantType) params.set("tenant", tenantType);
    if (bedrooms) params.set("bedrooms", bedrooms);
    return `/homes?${params.toString()}`;
  }, [bedrooms, center, maxRent, minRent, radiusKm, sortOption, tenantType]);

  const propertyHref = useCallback((propertyId: string) => {
    return `/homes/${propertyId}?returnTo=${encodeURIComponent(searchReturnPath(propertyId))}`;
  }, [searchReturnPath]);

  const handleSelectListing = useCallback((propertyId: string) => {
    setSelectedId(propertyId);
  }, []);

  const validateFilters = useCallback(() => {
    const radius = Number(radiusKm);
    const minimum = minRent ? Number(minRent) : null;
    const maximum = maxRent ? Number(maxRent) : null;
    if (!Number.isFinite(radius) || radius < 0.5 || radius > 100) return "Choose a search radius between 0.5 and 100 km.";
    if (minimum !== null && (!Number.isFinite(minimum) || minimum < 0 || minimum > MAX_RENT_FILTER)) return "Minimum rent must be between ৳0 and ৳10,000,000.";
    if (maximum !== null && (!Number.isFinite(maximum) || maximum < 0 || maximum > MAX_RENT_FILTER)) return "Maximum rent must be between ৳0 and ৳10,000,000.";
    if (minimum !== null && maximum !== null && minimum > maximum) return "Minimum rent cannot be higher than maximum rent.";
    return null;
  }, [maxRent, minRent, radiusKm]);

  const runSearch = useCallback(async (searchCenter = center) => {
    const validationMessage = validateFilters();
    if (validationMessage) { setMessage(validationMessage); setBusy(false); return; }
    setBusy(true);
    setMessage(null);
    const { data, error } = await supabase.rpc("search_available_properties", {
      center_lat: searchCenter[0], center_long: searchCenter[1], radius_km: Number(radiusKm), min_rent: minRent ? Number(minRent) : null, max_rent: maxRent ? Number(maxRent) : null, renter_tenant_type: tenantType || null, min_bedrooms: bedrooms ? Number(bedrooms) : null,
    });
    if (error) { setMessage(friendlySearchError(error)); setBusy(false); return; }

    const rows = (data ?? []) as MapListing[];
    const propertyIds = rows.map((listing) => listing.id);
    const tenantRows = propertyIds.length > 0
      ? (await supabase.from("property_tenant_types").select("property_id, tenant_type").in("property_id", propertyIds)).data as TenantTypeRow[] | null
      : [];
    const tenantTypesByProperty = new Map<string, TenantType[]>();
    for (const row of tenantRows ?? []) {
      const current = tenantTypesByProperty.get(row.property_id) ?? [];
      current.push(row.tenant_type);
      tenantTypesByProperty.set(row.property_id, current);
    }

    const coverPaths = [...new Set(rows.flatMap((listing) => listing.cover_media_path ? [listing.cover_media_path] : []))];
    const signedUrlByPath = new Map<string, string>();
    if (coverPaths.length > 0) {
      const { data: signedRows } = await supabase.storage.from("property-media").createSignedUrls(coverPaths, PUBLIC_MEDIA_TTL_SECONDS);
      for (const signed of signedRows ?? []) {
        if (signed.path && signed.signedUrl) signedUrlByPath.set(signed.path, signed.signedUrl);
      }
    }

    const hydrated = rows.map((listing) => ({
      ...listing,
      tenant_types: tenantTypesByProperty.get(listing.id) ?? [],
      cover_url: listing.cover_media_path ? signedUrlByPath.get(listing.cover_media_path) ?? null : null,
    }));
    setListings(hydrated);
    setSelectedId((current) => current && hydrated.some((listing) => listing.id === current) ? current : null);
    setBusy(false);
  }, [bedrooms, center, maxRent, minRent, radiusKm, supabase, tenantType, validateFilters]);

  useEffect(() => { runSearchRef.current = runSearch; }, [runSearch]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void runSearchRef.current(initialCenterRef.current); }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => () => { if (watchIdRef.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchIdRef.current); }, []);

  function stopLiveLocation() {
    if (watchIdRef.current !== null && navigator.geolocation) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    liveFixReceivedRef.current = false;
    setLiveTracking(false); setLocating(false); setLocationStatus("Live location paused. Your last position remains on the map.");
  }

  function startLiveLocation() {
    if (!navigator.geolocation) { setMessage("Location access is not supported by this browser."); return; }
    if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    setLocating(true);
    setMessage(null);
    setLocationStatus("Requesting precise location…");
    lastLiveCenterRef.current = null;
    lastLiveSearchLocationRef.current = null;
    lastLiveDisplayLocationRef.current = null;
    lastLiveStatusAccuracyRef.current = null;
    liveFixReceivedRef.current = false;
    watchIdRef.current = navigator.geolocation.watchPosition(({ coords }) => {
      const next: [number, number] = [coords.latitude, coords.longitude];
      const accuracy = Number.isFinite(coords.accuracy) ? Math.max(coords.accuracy, 0) : 0;
      const roundedAccuracy = Math.round(accuracy);
      const centerThreshold = Math.max(LIVE_CENTER_MIN_DISTANCE_METERS, Math.min(accuracy * 0.5, 100));
      const searchThreshold = Math.max(LIVE_SEARCH_MIN_DISTANCE_METERS, Math.min(accuracy, 250));
      const displayThreshold = Math.max(LIVE_DISPLAY_MIN_DISTANCE_METERS, Math.min(accuracy * 0.25, LIVE_CENTER_MIN_DISTANCE_METERS));
      const lastCenter = lastLiveCenterRef.current;
      const lastSearchLocation = lastLiveSearchLocationRef.current;
      const lastDisplayLocation = lastLiveDisplayLocationRef.current;
      const shouldMoveCenter = !lastCenter || distanceMeters(lastCenter, next) >= centerThreshold;
      const shouldRefreshResults = !lastSearchLocation || distanceMeters(lastSearchLocation, next) >= searchThreshold;
      const shouldUpdateDisplay = !lastDisplayLocation
        || shouldMoveCenter
        || distanceMeters([lastDisplayLocation.latitude, lastDisplayLocation.longitude], next) >= displayThreshold
        || Math.abs(lastDisplayLocation.accuracy - accuracy) >= LIVE_DISPLAY_ACCURACY_DELTA_METERS;

      if (!liveFixReceivedRef.current) {
        liveFixReceivedRef.current = true;
        setLocationPreset("");
        setLocating(false);
        setLiveTracking(true);
      }

      if (shouldUpdateDisplay) {
        const nextDisplayLocation = { latitude: coords.latitude, longitude: coords.longitude, accuracy };
        lastLiveDisplayLocationRef.current = nextDisplayLocation;
        setUserLocation(nextDisplayLocation);
      }

      if (lastLiveStatusAccuracyRef.current === null || Math.abs(lastLiveStatusAccuracyRef.current - roundedAccuracy) >= LIVE_STATUS_ACCURACY_DELTA_METERS) {
        lastLiveStatusAccuracyRef.current = roundedAccuracy;
        setLocationStatus(`Live GPS on · accuracy ±${roundedAccuracy} m · results refresh after meaningful movement.`);
      }

      if (shouldMoveCenter) {
        lastLiveCenterRef.current = next;
        setCenter(next);
      }
      if (shouldRefreshResults) {
        lastLiveSearchLocationRef.current = next;
        void runSearchRef.current(next);
      }
    }, (error) => {
      liveFixReceivedRef.current = false;
      setLocating(false); setLiveTracking(false); if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
      setMessage(error.code === error.PERMISSION_DENIED ? "Location permission was denied. Enable location access for NearBasha in your browser settings and try again." : "Could not keep track of your location. Check GPS/network access and try again."); setLocationStatus(null);
    }, { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 });
  }

  function searchPresetLocation(label: string) {
    setLocationPreset(label);
    const preset = LOCATION_PRESETS.find((location) => location.label === label);
    if (!preset) return;
    if (liveTracking) {
      stopLiveLocation();
      setLocationStatus("Live location paused because you chose another search area.");
    }
    setCustomArea([]);
    setDrawingCustomArea(false);
    setSelectedId(null);
    const nextCenter: [number, number] = [preset.latitude, preset.longitude];
    setCenter(nextCenter);
    void runSearch(nextCenter);
  }

  function handleMapCenterChange(nextCenter: [number, number]) {
    if (liveTracking) {
      stopLiveLocation();
      setLocationStatus("Live location paused because you moved the map manually.");
    }
    setLocationPreset("");
    setCenter(nextCenter);
    setSelectedId(null);
    setMessage("Map moved. Choose Search map to find homes around this area.");
  }

  function clearFilters() {
    setMinRent("");
    setMaxRent("");
    setTenantType("");
    setBedrooms("");
    setRadiusKm("15");
    setCustomArea([]);
    setDrawingCustomArea(false);
    setSelectedId(null);
    setMessage("Filters cleared. Refreshing homes around this map location.");
    window.setTimeout(() => { void runSearchRef.current(center); }, 0);
  }

  async function saveSearch() {
    if (customAreaMode) { setMessage("Custom drawn areas are temporary and cannot be saved yet. Clear the custom area first, then save the radius and filters."); return; }
    if (!userId) { router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`); return; }
    if (!searchName.trim()) { setMessage("Give this search a short name before saving it."); return; }
    const validationMessage = validateFilters();
    if (validationMessage) { setMessage(validationMessage); return; }
    setSavingSearch(true); setMessage(null);
    const { error } = await supabase.from("saved_searches").insert({ user_id: userId, name: searchName.trim(), center_lat: center[0], center_long: center[1], radius_km: Number(radiusKm), min_rent: minRent ? Number(minRent) : null, max_rent: maxRent ? Number(maxRent) : null, tenant_type: tenantType || null, min_bedrooms: bedrooms ? Number(bedrooms) : null });
    if (error) setMessage(friendlySearchError(error)); else { setSearchName(""); setMessage("Search saved. You can reopen it from Saved."); }
    setSavingSearch(false);
  }

  function startCustomArea() {
    stopLiveLocation();
    setLocationPreset("");
    setCustomArea([]);
    setSelectedId(null);
    setDrawingCustomArea(true);
    setMessage("Custom area mode: tap at least 3 points on the map, then choose Finish area. Drawn areas are temporary and cannot be saved yet.");
  }

  function finishCustomArea() {
    if (customArea.length < 3) { setMessage("Add at least 3 points to create a custom search area."); return; }
    setDrawingCustomArea(false);
    setSelectedId(null);
    setMessage(`${visibleListings.length} home${visibleListings.length === 1 ? "" : "s"} inside your custom area. Choose a result or map marker to preview a specific home. This drawn area is temporary and will not be saved.`);
  }

  function clearCustomArea() {
    setCustomArea([]); setDrawingCustomArea(false); setSelectedId(null); setMessage(null);
  }

  return (
    <div className="renter-search-shell">
      <aside className="renter-search-sidebar">
        <div className="renter-search-heading"><p className="eyebrow">Live map search</p><h1>Find a home around you.</h1><p>Use live GPS, radius filters, or draw a custom area around the streets and blocks that actually matter to you.</p></div>
        <div className="renter-filter-panel">
          <div className="renter-filter-grid">
            <label className="field full">Area or landmark<select value={locationPreset} onChange={(event) => searchPresetLocation(event.target.value)} disabled={busy}><option value="">Choose a supported Dhaka location</option>{LOCATION_PRESETS.map((location) => <option key={location.label} value={location.label}>{location.label}</option>)}</select></label>
            <label className="field">Minimum rent (৳)<input inputMode="numeric" value={minRent} onChange={(e) => setMinRent(e.target.value.replace(/\D/g, ""))} placeholder="10000" /></label>
            <label className="field">Maximum rent (৳)<input inputMode="numeric" value={maxRent} onChange={(e) => setMaxRent(e.target.value.replace(/\D/g, ""))} placeholder="40000" /></label>
            <label className="field">Renter type<select value={tenantType} onChange={(e) => setTenantType(e.target.value)}><option value="">Any renter type</option><option value="family">{TENANT_PROFILE_LABELS.family}</option><option value="bachelor">{TENANT_PROFILE_LABELS.bachelor}</option><option value="student">{TENANT_PROFILE_LABELS.student}</option><option value="job_holder">{TENANT_PROFILE_LABELS.job_holder}</option></select></label>
            <label className="field">Bedrooms<select value={bedrooms} onChange={(e) => setBedrooms(e.target.value)}><option value="">Any</option><option value="1">1+</option><option value="2">2+</option><option value="3">3+</option><option value="4">4+</option></select></label>
            <label className="field">Radius<select value={radiusKm} onChange={(e) => setRadiusKm(e.target.value)}><option value="2">2 km</option><option value="5">5 km</option><option value="10">10 km</option><option value="15">15 km</option><option value="25">25 km</option><option value="50">50 km</option><option value="100">100 km</option></select></label>
            <label className="field">Sort results<select value={sortOption} onChange={(event) => setSortOption(event.target.value as SortOption)}><option value="recommended">Recommended</option><option value="distance">Distance: nearest</option><option value="rent-asc">Rent: low to high</option><option value="rent-desc">Rent: high to low</option></select></label>
          </div>
          <p className="form-hint">Choose a supported area to move the map and search there immediately. You can still pan the map manually for anywhere else.</p>
          {softPreference && <div className="tenant-profile-preference"><CircleCheck size={15} aria-hidden="true" /><span><strong>{TENANT_PROFILE_LABELS[softPreference]} renter type active</strong>Compatible homes are shown first. Other homes stay visible for comparison.</span></div>}
          <div className="tenant-match-legend" aria-label="Renter fit map colors">
            <span className="tenant-legend-chip tenant-family"><Users size={12} aria-hidden="true" />{TENANT_PROFILE_LABELS.family}</span>
            <span className="tenant-legend-chip tenant-bachelor"><User size={12} aria-hidden="true" />{TENANT_PROFILE_LABELS.bachelor} / {TENANT_PROFILE_LABELS.job_holder}</span>
            <span className="tenant-legend-chip tenant-student"><GraduationCap size={12} aria-hidden="true" />{TENANT_PROFILE_LABELS.student}</span>
            <span className="tenant-legend-chip tenant-everyone"><CircleCheck size={12} aria-hidden="true" />{TENANT_PROFILE_LABELS.everyone}</span>
          </div>
          <div className="renter-filter-actions">{liveTracking ? <button className="secondary-button renter-live-location-button" type="button" onClick={stopLiveLocation}>Stop live location</button> : <button className="secondary-button renter-live-location-button" type="button" onClick={startLiveLocation} disabled={locating}>{locating ? "Finding you…" : "◎ My live location"}</button>}<button className="primary-button" type="button" onClick={() => void runSearch()} disabled={busy}>{busy ? "Searching…" : "Search map"}</button></div>
          <div className="custom-area-controls">
            <button className="text-button" type="button" onClick={clearFilters} disabled={busy}>Clear filters</button>
            {!drawingCustomArea && customArea.length < 3 && <button className="secondary-button" type="button" onClick={startCustomArea}>◇ Draw custom area</button>}
            {drawingCustomArea && <><button className="primary-button" type="button" onClick={finishCustomArea}>Finish area ({customArea.length})</button><button className="text-button" type="button" onClick={clearCustomArea}>Cancel</button></>}
            {!drawingCustomArea && customArea.length >= 3 && <><span><strong>Custom area active · temporary</strong>{visibleListings.length} homes inside</span><button className="text-button" type="button" onClick={clearCustomArea}>Clear area</button></>}
          </div>
          {locationStatus && <div className="success-message compact-message" role="status" aria-live="polite">{locationStatus}</div>}
          <div className="save-search-row"><input value={searchName} onChange={(e) => setSearchName(e.target.value)} maxLength={80} placeholder={customAreaMode ? "Clear custom area to save a radius search" : "Name this search, e.g. Dhanmondi family"} disabled={customAreaMode} aria-describedby="save-search-help" /><button className="secondary-button" type="button" onClick={() => void saveSearch()} disabled={savingSearch || customAreaMode}>{savingSearch ? "Saving…" : "Save radius search"}</button></div>
          <p className="form-hint" id="save-search-help">{customAreaMode ? "Custom drawn areas are session-only and are not stored in Saved. Clear the custom area to save the current center, radius, and filters." : `Saved searches store this center, radius, and your filters. Search radius is capped at 100 km.`}</p>
          {message && <div className={message.startsWith("Search saved") || message.includes("inside your custom area") ? "success-message compact-message" : "auth-message"} role="status" aria-live="polite">{message}</div>}
        </div>

        <div className="renter-results-header"><strong>{busy ? "Searching…" : `${visibleListings.length} home${visibleListings.length === 1 ? "" : "s"}`}</strong><span>{customArea.length >= 3 ? `Inside custom area · ${sortDescription(sortOption, preferredTenantType, tenantType)}` : sortDescription(sortOption, preferredTenantType, tenantType)}</span></div>
        <RenterResultsList
          listings={visibleListings}
          busy={busy}
          customAreaActive={customArea.length >= 3}
          selectedId={effectiveSelectedId}
          preference={softPreference}
          userId={userId}
          savedPropertyIds={savedSet}
          propertyHref={propertyHref}
          onSelect={handleSelectListing}
        />
      </aside>

      <section className="renter-map-panel">
        <LeafletMap listings={visibleListings} center={center} radiusKm={Number(radiusKm)} selectedId={effectiveSelectedId} onSelect={handleSelectListing} onCenterChange={handleMapCenterChange} userLocation={userLocation} liveTracking={liveTracking} customArea={customArea} drawingCustomArea={drawingCustomArea} onCustomAreaChange={setCustomArea} />
        {drawingCustomArea && <div className="custom-area-map-hint" role="status"><strong>Draw your search area</strong><span>Tap corners on the map · {customArea.length}/3 minimum · temporary session only</span></div>}
        {selectedListing && <article className={`mobile-map-sheet tenant-compatibility-${tenantCompatibility(selectedListing.tenant_types ?? [], softPreference)}`} aria-live="polite"><button className="mobile-map-sheet-close" type="button" onClick={() => setSelectedId(null)} aria-label="Close property preview">×</button><div className="mobile-map-sheet-handle" aria-hidden="true" /><div className="mobile-map-sheet-content"><div className="mobile-map-sheet-image">{selectedListing.cover_url ? <Image src={selectedListing.cover_url} alt="" fill sizes="118px" /> : <span aria-hidden="true">⌂</span>}</div><div className="mobile-map-sheet-copy"><TenantBadge types={selectedListing.tenant_types ?? []} preference={softPreference} /><h2>{selectedListing.title || "Rental property"}</h2><p>{selectedListing.address_text || "Location available on map"}</p>{tenantCompatibility(selectedListing.tenant_types ?? [], softPreference) === "mismatch" && <small className="tenant-preference-note is-mismatch">Different renter type preference</small>}<div className="mobile-map-sheet-meta"><strong>{selectedListing.rent_bdt ? `৳${selectedListing.rent_bdt.toLocaleString("en-BD")}` : "Rent on request"}</strong><span>{selectedListing.bedrooms ?? "—"} bed · {selectedListing.bathrooms ?? "—"} bath</span></div></div></div><div className="mobile-map-sheet-actions"><SaveHomeButton propertyId={selectedListing.id} userId={userId} initialSaved={savedSet.has(selectedListing.id)} compact /><Link className="primary-button link-button" href={propertyHref(selectedListing.id)}>View full listing</Link></div></article>}
      </section>
    </div>
  );
}
