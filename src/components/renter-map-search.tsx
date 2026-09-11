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
import { formatCurrency, formatNumber } from "@/i18n/format";
import { useLocale } from "@/i18n/use-locale";
import { formatWorkflowText, getWorkflowCopy, type WorkflowCopy } from "@/i18n/workflow-copy";
import { LOCATION_PRESETS } from "@/lib/location-presets";
import { tenantCompatibility, tenantTone, type TenantType } from "@/lib/tenant-match";
import { createClient } from "@/lib/supabase/client";

const LeafletMap = dynamic(() => import("@/components/leaflet-map"), { ssr: false });
const DHAKA_CENTER: [number, number] = [23.8103, 90.4125];
const RADIUS_OPTIONS = ["2", "5", "10", "15", "25", "50", "100"];
const MAX_RENT_FILTER = 10_000_000;
const MAX_CUSTOM_AREA_VERTICES = 100;
const PUBLIC_MEDIA_TTL_SECONDS = 300;
const LIVE_SEARCH_MIN_DISTANCE_METERS = 120;
const LIVE_CENTER_MIN_DISTANCE_METERS = 30;
const LIVE_DISPLAY_MIN_DISTANCE_METERS = 12;
const LIVE_DISPLAY_ACCURACY_DELTA_METERS = 10;
const LIVE_STATUS_ACCURACY_DELTA_METERS = 5;

type SortOption = "recommended" | "distance" | "rent-asc" | "rent-desc";
type SearchCopy = WorkflowCopy["homes"]["search"];
type TenantLabels = Record<TenantType, string> & { unspecified: string };

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

type SearchMapListing = MapListing & {
  total_matches?: number;
  results_truncated?: boolean;
};

type SearchPolygonGeoJson = {
  type: "Polygon";
  coordinates: [number, number][][];
};

function initialRadius(value?: string) {
  return value && RADIUS_OPTIONS.includes(value) ? value : "15";
}

function initialSort(value?: string): SortOption {
  return value === "distance" || value === "rent-asc" || value === "rent-desc" ? value : "recommended";
}

function sortDescription(sort: SortOption, copy: SearchCopy, preferredTenantType?: TenantType, tenantType?: string) {
  if (sort === "distance") return copy.nearestFirst;
  if (sort === "rent-asc") return copy.lowestRentFirst;
  if (sort === "rent-desc") return copy.highestRentFirst;
  return preferredTenantType && !tenantType ? copy.bestMatchesFirst : copy.closestFirst;
}

function friendlySearchError(error: unknown, copy: SearchCopy) {
  const raw = error instanceof Error ? error.message : typeof error === "object" && error !== null && "message" in error && typeof (error as { message?: unknown }).message === "string" ? (error as { message: string }).message : "";
  const message = raw.toLowerCase();
  if (message.includes("saved search limit reached")) return copy.savedSearchLimit;
  if (message.includes("search radius")) return copy.radiusValidation;
  if (message.includes("minimum rent cannot")) return copy.rentOrderValidation;
  if (message.includes("rent is outside")) return copy.rentRangeValidation;
  if (message.includes("search center") || message.includes("latitude") || message.includes("longitude")) return copy.locationValidation;
  if (message.includes("bedroom filter")) return copy.bedroomsValidation;
  if (message.includes("sort mode")) return copy.sortValidation;
  if (message.includes("custom search polygon")) return copy.customAreaValidation;
  if (message.includes("violates check constraint")) return copy.savedFilterValidation;
  return copy.genericSearchError;
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

function customAreaGeoJson(points: [number, number][]): SearchPolygonGeoJson | null {
  if (points.length < 3 || points.length > MAX_CUSTOM_AREA_VERTICES) return null;
  const ring = points.map(([lat, lng]) => [lng, lat] as [number, number]);
  return { type: "Polygon", coordinates: [[...ring, ring[0]]] };
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

function tenantSummary(types: TenantType[], labels: TenantLabels) {
  if (!types.length) return labels.unspecified;
  if (types.includes("everyone")) return labels.everyone;
  return types.map((type) => labels[type]).join(" · ");
}

function TenantBadge({ types, preference, labels }: { types: TenantType[]; preference?: TenantType; labels: TenantLabels }) {
  const tone = tenantTone(types);
  const compatibility = tenantCompatibility(types, preference);
  const iconProps = { size: 12, strokeWidth: 2.2, "aria-hidden": true as const };
  const icon = tone === "family" ? <Users {...iconProps} />
    : tone === "student" ? <GraduationCap {...iconProps} />
    : tone === "bachelor" ? (types.includes("job_holder") ? <Briefcase {...iconProps} /> : <User {...iconProps} />)
    : <CircleCheck {...iconProps} />;

  return <span className={`tenant-match-badge tenant-${tone}${compatibility === "match" ? " is-profile-match" : ""}`}>{icon}<span>{tenantSummary(types, labels)}</span></span>;
}

export function RenterMapSearch({ userId, initialSearch = {}, preferredTenantType }: { userId: string | null; initialSearch?: InitialSearch; preferredTenantType?: TenantType }) {
  const router = useRouter();
  const { locale, dictionary } = useLocale();
  const copy = getWorkflowCopy(locale).homes.search;
  const tenantLabels = useMemo<TenantLabels>(() => ({
    family: dictionary.common.tenant.family,
    bachelor: dictionary.common.tenant.bachelor,
    student: dictionary.common.tenant.student,
    job_holder: dictionary.common.tenant.jobHolder,
    everyone: dictionary.common.tenant.everyone,
    unspecified: dictionary.common.tenant.unspecified,
  }), [dictionary]);
  const distanceUnit = locale === "bn" ? "কিমি" : "km";
  const supabase = useMemo(() => createClient() as unknown as SupabaseClient, []);
  const initialCenter: [number, number] = [initialSearch.centerLat ?? DHAKA_CENTER[0], initialSearch.centerLong ?? DHAKA_CENTER[1]];
  const initialLocationPreset = LOCATION_PRESETS.find((preset) => Math.abs(preset.latitude - initialCenter[0]) < 0.0001 && Math.abs(preset.longitude - initialCenter[1]) < 0.0001)?.label ?? "";
  const [listings, setListings] = useState<SearchMapListing[]>([]);
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
  const searchRequestIdRef = useRef(0);
  const searchAbortRef = useRef<AbortController | null>(null);
  const runSearchRef = useRef<(searchCenter?: [number, number], requestedSort?: SortOption, requestedArea?: [number, number][] | null) => Promise<void>>(async () => {});
  const initialCenterRef = useRef(initialCenter);
  const lastPreferredTenantTypeRef = useRef<TenantType | undefined>(preferredTenantType);

  const softPreference = tenantType ? undefined : preferredTenantType;
  const customAreaMode = drawingCustomArea || customArea.length > 0;
  const customAreaActive = !drawingCustomArea && customArea.length >= 3;
  const orderedListings = useMemo(() => sortedResults(listings, sortOption, preferredTenantType, tenantType), [listings, preferredTenantType, sortOption, tenantType]);
  const visibleListings = orderedListings;
  const effectiveSelectedId = selectedId && visibleListings.some((listing) => listing.id === selectedId) ? selectedId : null;
  const selectedListing = useMemo(
    () => visibleListings.find((listing) => listing.id === effectiveSelectedId) ?? null,
    [effectiveSelectedId, visibleListings],
  );
  const totalMatches = listings[0]?.total_matches ?? listings.length;
  const resultsTruncated = Boolean(listings[0]?.results_truncated);
  const resultCountText = busy
    ? copy.searching
    : resultsTruncated
      ? formatWorkflowText(copy.showingHomes, { visible: formatNumber(visibleListings.length, locale), total: formatNumber(totalMatches, locale) })
      : formatWorkflowText(visibleListings.length === 1 ? copy.homeCountOne : copy.homeCountMany, { count: formatNumber(visibleListings.length, locale) });

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

  const cancelActiveSearch = useCallback(() => {
    searchRequestIdRef.current += 1;
    searchAbortRef.current?.abort();
    searchAbortRef.current = null;
    setBusy(false);
    setMessage(null);
  }, []);

  const validateFilters = useCallback(() => {
    const radius = Number(radiusKm);
    const minimum = minRent ? Number(minRent) : null;
    const maximum = maxRent ? Number(maxRent) : null;
    if (!Number.isFinite(radius) || radius < 0.5 || radius > 100) return copy.radiusValidation;
    if (minimum !== null && (!Number.isFinite(minimum) || minimum < 0 || minimum > MAX_RENT_FILTER)) return copy.minimumRentValidation;
    if (maximum !== null && (!Number.isFinite(maximum) || maximum < 0 || maximum > MAX_RENT_FILTER)) return copy.maximumRentValidation;
    if (minimum !== null && maximum !== null && minimum > maximum) return copy.rentOrderValidation;
    return null;
  }, [copy, maxRent, minRent, radiusKm]);

  const runSearch = useCallback(async (searchCenter = center, requestedSort = sortOption, requestedArea?: [number, number][] | null) => {
    const requestId = ++searchRequestIdRef.current;
    searchAbortRef.current?.abort();
    const searchController = new AbortController();
    searchAbortRef.current = searchController;
    const isCurrentSearch = () => searchRequestIdRef.current === requestId && !searchController.signal.aborted;
    const areaPoints = requestedArea === undefined ? (customAreaActive ? customArea : null) : requestedArea;
    const searchPolygon = areaPoints ? customAreaGeoJson(areaPoints) : null;
    const validationMessage = validateFilters() ?? (areaPoints && !searchPolygon ? formatWorkflowText(copy.customAreaCorners, { max: MAX_CUSTOM_AREA_VERTICES }) : null);

    if (validationMessage) {
      if (isCurrentSearch()) {
        searchAbortRef.current = null;
        setMessage(validationMessage);
        setBusy(false);
      }
      return;
    }

    setBusy(true);
    setMessage(null);

    const { data, error } = await supabase.rpc("search_available_properties", {
      center_lat: searchCenter[0],
      center_long: searchCenter[1],
      radius_km: Number(radiusKm),
      min_rent: minRent ? Number(minRent) : null,
      max_rent: maxRent ? Number(maxRent) : null,
      renter_tenant_type: tenantType || null,
      min_bedrooms: bedrooms ? Number(bedrooms) : null,
      sort_mode: requestedSort,
      preferred_tenant_type: tenantType ? null : preferredTenantType ?? null,
      search_polygon: searchPolygon,
    }).abortSignal(searchController.signal);

    if (!isCurrentSearch()) return;
    if (error) {
      searchAbortRef.current = null;
      setMessage(friendlySearchError(error, copy));
      setBusy(false);
      return;
    }

    const rows = (data ?? []) as SearchMapListing[];
    const propertyIds = rows.map((listing) => listing.id);
    let tenantRows: TenantTypeRow[] = [];
    if (propertyIds.length > 0) {
      const tenantResult = await supabase
        .from("property_tenant_types")
        .select("property_id, tenant_type")
        .in("property_id", propertyIds)
        .abortSignal(searchController.signal);
      if (!isCurrentSearch()) return;
      tenantRows = (tenantResult.data ?? []) as TenantTypeRow[];
    }

    const tenantTypesByProperty = new Map<string, TenantType[]>();
    for (const row of tenantRows) {
      const current = tenantTypesByProperty.get(row.property_id) ?? [];
      current.push(row.tenant_type);
      tenantTypesByProperty.set(row.property_id, current);
    }

    const coverPaths = [...new Set(rows.flatMap((listing) => listing.cover_media_path ? [listing.cover_media_path] : []))];
    const signedUrlByPath = new Map<string, string>();
    if (coverPaths.length > 0) {
      const { data: signedRows } = await supabase.storage.from("property-media").createSignedUrls(coverPaths, PUBLIC_MEDIA_TTL_SECONDS);
      if (!isCurrentSearch()) return;
      for (const signed of signedRows ?? []) {
        if (signed.path && signed.signedUrl) signedUrlByPath.set(signed.path, signed.signedUrl);
      }
    }

    const hydrated = rows.map((listing) => ({
      ...listing,
      tenant_types: tenantTypesByProperty.get(listing.id) ?? [],
      cover_url: listing.cover_media_path ? signedUrlByPath.get(listing.cover_media_path) ?? null : null,
    }));

    if (!isCurrentSearch()) return;
    setListings(hydrated);
    setSelectedId((current) => current && hydrated.some((listing) => listing.id === current) ? current : null);
    searchAbortRef.current = null;
    setBusy(false);
  }, [bedrooms, center, copy, customArea, customAreaActive, maxRent, minRent, preferredTenantType, radiusKm, sortOption, supabase, tenantType, validateFilters]);

  const handleCustomAreaChange = useCallback((points: [number, number][]) => {
    if (points.length > MAX_CUSTOM_AREA_VERTICES) {
      setMessage(formatWorkflowText(copy.customAreaMaxCorners, { max: MAX_CUSTOM_AREA_VERTICES }));
      return;
    }
    setCustomArea(points);
    setSelectedId(null);
    if (!drawingCustomArea && points.length >= 3) {
      void runSearch(center, sortOption, points);
    }
  }, [center, copy, drawingCustomArea, runSearch, sortOption]);

  useEffect(() => { runSearchRef.current = runSearch; }, [runSearch]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void runSearchRef.current(initialCenterRef.current); }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (lastPreferredTenantTypeRef.current === preferredTenantType) return;
    lastPreferredTenantTypeRef.current = preferredTenantType;
    void runSearchRef.current();
  }, [preferredTenantType]);
  useEffect(() => () => {
    searchRequestIdRef.current += 1;
    searchAbortRef.current?.abort();
  }, []);
  useEffect(() => () => { if (watchIdRef.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchIdRef.current); }, []);

  function stopLiveLocation() {
    if (watchIdRef.current !== null && navigator.geolocation) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    liveFixReceivedRef.current = false;
    setLiveTracking(false); setLocating(false); setLocationStatus(copy.livePaused);
  }

  function startLiveLocation() {
    if (!navigator.geolocation) { setMessage(copy.locationUnsupported); return; }
    cancelActiveSearch();
    if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    if (customAreaMode) {
      setCustomArea([]);
      setDrawingCustomArea(false);
      setSelectedId(null);
    }
    setLocating(true);
    setMessage(null);
    setLocationStatus(copy.requestingLocation);
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
        setLocationStatus(formatWorkflowText(copy.liveGps, { accuracy: formatNumber(roundedAccuracy, locale) }));
      }

      if (shouldMoveCenter) {
        lastLiveCenterRef.current = next;
        setCenter(next);
      }
      if (shouldRefreshResults) {
        lastLiveSearchLocationRef.current = next;
        void runSearchRef.current(next, undefined, null);
      }
    }, (error) => {
      liveFixReceivedRef.current = false;
      setLocating(false); setLiveTracking(false); if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
      setMessage(error.code === error.PERMISSION_DENIED ? copy.permissionDenied : copy.locationTrackingError); setLocationStatus(null);
    }, { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 });
  }

  function searchPresetLocation(label: string) {
    setLocationPreset(label);
    const preset = LOCATION_PRESETS.find((location) => location.label === label);
    if (!preset) return;
    if (liveTracking) {
      stopLiveLocation();
      setLocationStatus(copy.pausedForArea);
    }
    setCustomArea([]);
    setDrawingCustomArea(false);
    setSelectedId(null);
    const nextCenter: [number, number] = [preset.latitude, preset.longitude];
    setCenter(nextCenter);
    void runSearch(nextCenter, sortOption, null);
  }

  function handleMapCenterChange(nextCenter: [number, number]) {
    cancelActiveSearch();
    if (liveTracking) {
      stopLiveLocation();
      setLocationStatus(copy.pausedForMapMove);
    }
    setLocationPreset("");
    setCenter(nextCenter);
    setSelectedId(null);
    setMessage(copy.mapMoved);
  }

  function clearFilters() {
    cancelActiveSearch();
    setMinRent("");
    setMaxRent("");
    setTenantType("");
    setBedrooms("");
    setRadiusKm("15");
    setCustomArea([]);
    setDrawingCustomArea(false);
    setSelectedId(null);
    setMessage(copy.filtersCleared);
    window.setTimeout(() => { void runSearchRef.current(center, sortOption, null); }, 0);
  }

  async function saveSearch() {
    if (customAreaMode) { setMessage(copy.customAreaTemporary); return; }
    if (!userId) { router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`); return; }
    if (!searchName.trim()) { setMessage(copy.nameSearch); return; }
    const validationMessage = validateFilters();
    if (validationMessage) { setMessage(validationMessage); return; }
    setSavingSearch(true); setMessage(null);
    const { error } = await supabase.from("saved_searches").insert({ user_id: userId, name: searchName.trim(), center_lat: center[0], center_long: center[1], radius_km: Number(radiusKm), min_rent: minRent ? Number(minRent) : null, max_rent: maxRent ? Number(maxRent) : null, tenant_type: tenantType || null, min_bedrooms: bedrooms ? Number(bedrooms) : null });
    if (error) setMessage(friendlySearchError(error, copy)); else { setSearchName(""); setMessage(copy.searchSaved); }
    setSavingSearch(false);
  }

  function startCustomArea() {
    cancelActiveSearch();
    stopLiveLocation();
    setLocationPreset("");
    setCustomArea([]);
    setSelectedId(null);
    setDrawingCustomArea(true);
    setMessage(copy.customAreaMode);
  }

  function finishCustomArea() {
    if (customArea.length < 3) { setMessage(copy.customAreaMinPoints); return; }
    if (customArea.length > MAX_CUSTOM_AREA_VERTICES) { setMessage(formatWorkflowText(copy.customAreaMaxCorners, { max: MAX_CUSTOM_AREA_VERTICES })); return; }
    setDrawingCustomArea(false);
    setSelectedId(null);
    void runSearch(center, sortOption, customArea);
  }

  function clearCustomArea() {
    setCustomArea([]);
    setDrawingCustomArea(false);
    setSelectedId(null);
    void runSearch(center, sortOption, null);
  }

  return (
    <div className="renter-search-shell">
      <aside className="renter-search-sidebar">
        <div className="renter-search-heading"><p className="eyebrow">{copy.eyebrow}</p><h1>{copy.title}</h1><p>{copy.description}</p></div>
        <div className="renter-filter-panel">
          <div className="renter-filter-grid">
            <label className="field full">{copy.areaOrLandmark}<select value={locationPreset} onChange={(event) => searchPresetLocation(event.target.value)} disabled={busy}><option value="">{copy.chooseDhakaLocation}</option>{LOCATION_PRESETS.map((location) => <option key={location.label} value={location.label}>{location.label}</option>)}</select></label>
            <label className="field">{copy.minimumRent}<input inputMode="numeric" value={minRent} onChange={(event) => { cancelActiveSearch(); setMinRent(event.target.value.replace(/\D/g, "")); }} placeholder="10000" /></label>
            <label className="field">{copy.maximumRent}<input inputMode="numeric" value={maxRent} onChange={(event) => { cancelActiveSearch(); setMaxRent(event.target.value.replace(/\D/g, "")); }} placeholder="40000" /></label>
            <label className="field">{copy.renterType}<select value={tenantType} onChange={(event) => { cancelActiveSearch(); setTenantType(event.target.value); }}><option value="">{copy.anyRenterType}</option><option value="family">{tenantLabels.family}</option><option value="bachelor">{tenantLabels.bachelor}</option><option value="student">{tenantLabels.student}</option><option value="job_holder">{tenantLabels.job_holder}</option></select></label>
            <label className="field">{copy.bedrooms}<select value={bedrooms} onChange={(event) => { cancelActiveSearch(); setBedrooms(event.target.value); }}><option value="">{copy.any}</option><option value="1">{formatNumber(1, locale)}+</option><option value="2">{formatNumber(2, locale)}+</option><option value="3">{formatNumber(3, locale)}+</option><option value="4">{formatNumber(4, locale)}+</option></select></label>
            <label className="field">{copy.radius}<select value={radiusKm} onChange={(event) => { cancelActiveSearch(); setRadiusKm(event.target.value); }}>{RADIUS_OPTIONS.map((value) => <option value={value} key={value}>{formatNumber(Number(value), locale)} {distanceUnit}</option>)}</select></label>
            <label className="field">{copy.sortResults}<select value={sortOption} onChange={(event) => { const nextSort = event.target.value as SortOption; setSortOption(nextSort); void runSearch(center, nextSort); }}><option value="recommended">{copy.recommended}</option><option value="distance">{copy.distanceNearest}</option><option value="rent-asc">{copy.rentLowHigh}</option><option value="rent-desc">{copy.rentHighLow}</option></select></label>
          </div>
          <p className="form-hint">{copy.supportedAreaHint}</p>
          {softPreference && <div className="tenant-profile-preference"><CircleCheck size={15} aria-hidden="true" /><span><strong>{formatWorkflowText(copy.renterTypeActive, { type: tenantLabels[softPreference] })}</strong>{copy.renterTypeActiveHint}</span></div>}
          <div className="tenant-match-legend" aria-label={copy.renterFitMapColors}>
            <span className="tenant-legend-chip tenant-family"><Users size={12} aria-hidden="true" />{tenantLabels.family}</span>
            <span className="tenant-legend-chip tenant-bachelor"><User size={12} aria-hidden="true" />{tenantLabels.bachelor} / {tenantLabels.job_holder}</span>
            <span className="tenant-legend-chip tenant-student"><GraduationCap size={12} aria-hidden="true" />{tenantLabels.student}</span>
            <span className="tenant-legend-chip tenant-everyone"><CircleCheck size={12} aria-hidden="true" />{tenantLabels.everyone}</span>
          </div>
          <div className="renter-filter-actions">{liveTracking ? <button className="secondary-button renter-live-location-button" type="button" onClick={stopLiveLocation}>{copy.stopLiveLocation}</button> : <button className="secondary-button renter-live-location-button" type="button" onClick={startLiveLocation} disabled={locating}>{locating ? copy.findingYou : copy.myLiveLocation}</button>}<button className="primary-button" type="button" onClick={() => void runSearch()} disabled={busy}>{busy ? copy.searching : customAreaActive ? copy.searchArea : copy.searchMap}</button></div>
          <div className="custom-area-controls">
            <button className="text-button" type="button" onClick={clearFilters} disabled={busy}>{copy.clearFilters}</button>
            {!drawingCustomArea && customArea.length < 3 && <button className="secondary-button" type="button" onClick={startCustomArea}>{copy.drawCustomArea}</button>}
            {drawingCustomArea && <><button className="primary-button" type="button" onClick={finishCustomArea}>{formatWorkflowText(copy.finishArea, { count: formatNumber(customArea.length, locale) })}</button><button className="text-button" type="button" onClick={clearCustomArea}>{copy.cancel}</button></>}
            {customAreaActive && <><span><strong>{copy.customAreaActive}</strong>{resultCountText}</span><button className="text-button" type="button" onClick={clearCustomArea}>{copy.clearArea}</button></>}
          </div>
          {locationStatus && <div className="success-message compact-message" role="status" aria-live="polite">{locationStatus}</div>}
          <div className="save-search-row"><input value={searchName} onChange={(e) => setSearchName(e.target.value)} maxLength={80} placeholder={customAreaMode ? copy.clearCustomAreaToSave : copy.searchNamePlaceholder} disabled={customAreaMode} aria-describedby="save-search-help" /><button className="secondary-button" type="button" onClick={() => void saveSearch()} disabled={savingSearch || customAreaMode}>{savingSearch ? copy.saving : copy.saveRadiusSearch}</button></div>
          <p className="form-hint" id="save-search-help">{customAreaMode ? copy.customAreaSaveHelp : copy.radiusSaveHelp}</p>
          {message && <div className={message === copy.searchSaved ? "success-message compact-message" : "auth-message"} role="status" aria-live="polite">{message}</div>}
        </div>

        <div className="renter-results-header"><strong>{resultCountText}</strong><span>{customAreaActive ? formatWorkflowText(copy.insideCustomArea, { sort: sortDescription(sortOption, copy, preferredTenantType, tenantType) }) : sortDescription(sortOption, copy, preferredTenantType, tenantType)}</span></div>
        <RenterResultsList
          listings={visibleListings}
          busy={busy}
          customAreaActive={customAreaActive}
          selectedId={effectiveSelectedId}
          preference={softPreference}
          userId={userId}
          propertyHref={propertyHref}
          onSelect={handleSelectListing}
        />
      </aside>

      <section className="renter-map-panel">
        <LeafletMap listings={visibleListings} center={center} radiusKm={Number(radiusKm)} selectedId={effectiveSelectedId} onSelect={handleSelectListing} onCenterChange={handleMapCenterChange} userLocation={userLocation} liveTracking={liveTracking} customArea={customArea} drawingCustomArea={drawingCustomArea} onCustomAreaChange={handleCustomAreaChange} />
        {drawingCustomArea && <div className="custom-area-map-hint" role="status"><strong>{copy.drawSearchArea}</strong><span>{formatWorkflowText(copy.drawSearchAreaHint, { count: formatNumber(customArea.length, locale) })}</span></div>}
        {selectedListing && <article className={`mobile-map-sheet tenant-compatibility-${tenantCompatibility(selectedListing.tenant_types ?? [], softPreference)}`} aria-live="polite"><button className="mobile-map-sheet-close" type="button" onClick={() => setSelectedId(null)} aria-label={copy.closePropertyPreview}>×</button><div className="mobile-map-sheet-handle" aria-hidden="true" /><div className="mobile-map-sheet-content"><div className="mobile-map-sheet-image">{selectedListing.cover_url ? <Image src={selectedListing.cover_url} alt="" fill sizes="118px" /> : <span aria-hidden="true">⌂</span>}</div><div className="mobile-map-sheet-copy"><TenantBadge types={selectedListing.tenant_types ?? []} preference={softPreference} labels={tenantLabels} /><h2>{selectedListing.title || copy.rentalProperty}</h2><p>{selectedListing.address_text || copy.locationOnMap}</p>{tenantCompatibility(selectedListing.tenant_types ?? [], softPreference) === "mismatch" && <small className="tenant-preference-note is-mismatch">{copy.differentRenterPreference}</small>}<div className="mobile-map-sheet-meta"><strong>{selectedListing.rent_bdt ? formatCurrency(selectedListing.rent_bdt, locale) : copy.rentOnRequest}</strong><span>{selectedListing.bedrooms == null ? "—" : formatNumber(selectedListing.bedrooms, locale)} {copy.bed} · {selectedListing.bathrooms == null ? "—" : formatNumber(selectedListing.bathrooms, locale)} {copy.bath}</span></div></div></div><div className="mobile-map-sheet-actions"><SaveHomeButton propertyId={selectedListing.id} userId={userId} compact /><Link className="primary-button link-button" href={propertyHref(selectedListing.id)}>{copy.viewFullListing}</Link></div></article>}
      </section>
    </div>
  );
}
