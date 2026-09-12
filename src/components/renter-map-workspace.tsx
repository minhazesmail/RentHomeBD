"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase, CircleCheck, GraduationCap, LocateFixed, MapPinned, Search, SlidersHorizontal, User, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { SaveHomeButton } from "@/components/save-home-button";
import type { MapListing, UserMapLocation } from "@/components/leaflet-map";
import { RenterResultsList } from "@/components/renter-results-list";
import { formatCurrency, formatNumber } from "@/i18n/format";
import { getMapWorkspaceRedesignCopy } from "@/i18n/map-workspace-redesign-copy";
import { localizeLocationLabel } from "@/i18n/presentation";
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
type SearchTenantType = Exclude<TenantType, "everyone">;
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
  listScroll?: string;
};

type AppliedQuery = {
  center: [number, number];
  radiusKm: string;
  minRent: string;
  maxRent: string;
  tenantType: SearchTenantType | "";
  bedrooms: string;
  sort: SortOption;
  areaLabel: string;
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

function initialTenant(value?: string): SearchTenantType | "" {
  return value === "family" || value === "bachelor" || value === "student" || value === "job_holder" ? value : "";
}

function initialScroll(value?: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : 0;
}

function sortDescription(sort: SortOption, copy: SearchCopy) {
  if (sort === "distance") return copy.nearestFirst;
  if (sort === "rent-asc") return copy.lowestRentFirst;
  if (sort === "rent-desc") return copy.highestRentFirst;
  return copy.closestFirst;
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

function sortedResults(listings: MapListing[], sort: SortOption) {
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

export function RenterMapWorkspace({ userId, initialSearch = {}, preferredTenantType }: { userId: string | null; initialSearch?: InitialSearch; preferredTenantType?: TenantType }) {
  const router = useRouter();
  const { locale, dictionary } = useLocale();
  const copy = getWorkflowCopy(locale).homes.search;
  const workspaceCopy = getMapWorkspaceRedesignCopy(locale);
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
  const initialTenantType = initialTenant(initialSearch.tenantType);
  const initialAreaLabel = initialLocationPreset ? localizeLocationLabel(initialLocationPreset, dictionary) : workspaceCopy.results.currentArea;

  const [listings, setListings] = useState<SearchMapListing[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialSearch.selectedId ?? null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [mapFocusId, setMapFocusId] = useState<string | null>(null);
  const [mapFocusVersion, setMapFocusVersion] = useState(0);
  const [center, setCenter] = useState<[number, number]>(initialCenter);
  const [locationPreset, setLocationPreset] = useState(initialLocationPreset);
  const [radiusKm, setRadiusKm] = useState(initialRadius(initialSearch.radiusKm));
  const [minRent, setMinRent] = useState(initialSearch.minRent ?? "");
  const [maxRent, setMaxRent] = useState(initialSearch.maxRent ?? "");
  const [tenantType, setTenantType] = useState<SearchTenantType | "">(initialTenantType);
  const [bedrooms, setBedrooms] = useState(initialSearch.bedrooms ?? "");
  const [sortOption, setSortOption] = useState<SortOption>(initialSort(initialSearch.sort));
  const [searchName, setSearchName] = useState("");
  const [busy, setBusy] = useState(Boolean(initialTenantType));
  const [savingSearch, setSavingSearch] = useState(false);
  const [locating, setLocating] = useState(false);
  const [liveTracking, setLiveTracking] = useState(false);
  const [userLocation, setUserLocation] = useState<UserMapLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [customArea, setCustomArea] = useState<[number, number][]>([]);
  const [drawingCustomArea, setDrawingCustomArea] = useState(false);
  const [mapDirty, setMapDirty] = useState(false);
  const [listScroll, setListScroll] = useState(initialScroll(initialSearch.listScroll));
  const [appliedQuery, setAppliedQuery] = useState<AppliedQuery>({
    center: initialCenter,
    radiusKm: initialRadius(initialSearch.radiusKm),
    minRent: initialSearch.minRent ?? "",
    maxRent: initialSearch.maxRent ?? "",
    tenantType: initialTenantType,
    bedrooms: initialSearch.bedrooms ?? "",
    sort: initialSort(initialSearch.sort),
    areaLabel: initialAreaLabel,
  });

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
  const restoredScrollRef = useRef(false);
  const resultsPaneRef = useRef<HTMLDivElement | null>(null);

  const activePreference: TenantType | undefined = tenantType || undefined;
  const customAreaMode = drawingCustomArea || customArea.length > 0;
  const customAreaActive = !drawingCustomArea && customArea.length >= 3;
  const orderedListings = useMemo(() => sortedResults(listings, sortOption), [listings, sortOption]);
  const visibleListings = orderedListings;
  const effectiveSelectedId = selectedId && visibleListings.some((listing) => listing.id === selectedId) ? selectedId : null;
  const selectedListing = useMemo(() => visibleListings.find((listing) => listing.id === effectiveSelectedId) ?? null, [effectiveSelectedId, visibleListings]);
  const totalMatches = listings[0]?.total_matches ?? listings.length;
  const resultsTruncated = Boolean(listings[0]?.results_truncated);
  const stableResultCountText = resultsTruncated
    ? formatWorkflowText(copy.showingHomes, { visible: formatNumber(visibleListings.length, locale), total: formatNumber(totalMatches, locale) })
    : formatWorkflowText(visibleListings.length === 1 ? copy.homeCountOne : copy.homeCountMany, { count: formatNumber(visibleListings.length, locale) });
  const resultCountText = busy && visibleListings.length === 0 ? copy.searching : stableResultCountText;
  const currentAreaLabel = locationPreset ? localizeLocationLabel(locationPreset, dictionary) : customAreaActive ? workspaceCopy.results.customArea : workspaceCopy.results.currentArea;
  const searchSummary = [
    currentAreaLabel,
    tenantType ? tenantLabels[tenantType] : workspaceCopy.toolbar.tenantRequired,
    maxRent ? formatCurrency(Number(maxRent), locale) : workspaceCopy.toolbar.budgetPlaceholder,
  ].join(" · ");

  const cancelActiveSearch = useCallback(() => {
    searchRequestIdRef.current += 1;
    searchAbortRef.current?.abort();
    searchAbortRef.current = null;
    setBusy(false);
    setMessage(null);
  }, [setBusy, setMessage]);

  const validateFilters = useCallback(() => {
    if (!tenantType) return workspaceCopy.toolbar.tenantRequired;
    const radius = Number(radiusKm);
    const minimum = minRent ? Number(minRent) : null;
    const maximum = maxRent ? Number(maxRent) : null;
    if (!Number.isFinite(radius) || radius < 0.5 || radius > 100) return copy.radiusValidation;
    if (minimum !== null && (!Number.isFinite(minimum) || minimum < 0 || minimum > MAX_RENT_FILTER)) return copy.minimumRentValidation;
    if (maximum !== null && (!Number.isFinite(maximum) || maximum < 0 || maximum > MAX_RENT_FILTER)) return copy.maximumRentValidation;
    if (minimum !== null && maximum !== null && minimum > maximum) return copy.rentOrderValidation;
    return null;
  }, [copy, maxRent, minRent, radiusKm, tenantType, workspaceCopy.toolbar.tenantRequired]);

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
      renter_tenant_type: tenantType,
      min_bedrooms: bedrooms ? Number(bedrooms) : null,
      sort_mode: requestedSort,
      preferred_tenant_type: null,
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
    setAppliedQuery({
      center: searchCenter,
      radiusKm,
      minRent,
      maxRent,
      tenantType,
      bedrooms,
      sort: requestedSort,
      areaLabel: areaPoints && areaPoints.length >= 3 ? workspaceCopy.results.customArea : currentAreaLabel,
    });
    setMapDirty(false);
    searchAbortRef.current = null;
    setBusy(false);
  }, [
    bedrooms,
    center,
    copy,
    currentAreaLabel,
    customArea,
    customAreaActive,
    maxRent,
    minRent,
    radiusKm,
    setAppliedQuery,
    setBusy,
    setListings,
    setMapDirty,
    setMessage,
    setSelectedId,
    sortOption,
    supabase,
    tenantType,
    validateFilters,
    workspaceCopy.results.customArea,
  ]);

  const handleCustomAreaChange = useCallback((points: [number, number][]) => {
    if (points.length > MAX_CUSTOM_AREA_VERTICES) {
      setMessage(formatWorkflowText(copy.customAreaMaxCorners, { max: MAX_CUSTOM_AREA_VERTICES }));
      return;
    }
    setCustomArea(points);
    if (!drawingCustomArea && points.length >= 3) setMapDirty(true);
  }, [copy, drawingCustomArea, setCustomArea, setMapDirty, setMessage]);

  useEffect(() => { runSearchRef.current = runSearch; }, [runSearch]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (initialTenantType) void runSearchRef.current(initialCenterRef.current);
      else setBusy(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialTenantType, setBusy]);
  useEffect(() => {
    if (tenantType || !preferredTenantType || preferredTenantType === "everyone") return;
    const timer = window.setTimeout(() => setTenantType(preferredTenantType), 0);
    return () => window.clearTimeout(timer);
  }, [preferredTenantType, setTenantType, tenantType]);
  useEffect(() => () => {
    searchRequestIdRef.current += 1;
    searchAbortRef.current?.abort();
  }, []);
  useEffect(() => () => {
    if (watchIdRef.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchIdRef.current);
  }, []);
  useEffect(() => {
    if (restoredScrollRef.current || busy || initialScroll(initialSearch.listScroll) === 0 || !resultsPaneRef.current) return;
    restoredScrollRef.current = true;
    resultsPaneRef.current.scrollTop = initialScroll(initialSearch.listScroll);
  }, [busy, initialSearch.listScroll, visibleListings.length]);

  const searchReturnPath = useCallback((selectionId: string) => {
    const params = new URLSearchParams({
      lat: center[0].toFixed(6),
      lng: center[1].toFixed(6),
      radius: appliedQuery.radiusKm,
      selected: selectionId,
      sort: appliedQuery.sort,
      listScroll: String(listScroll),
    });
    if (appliedQuery.minRent) params.set("minRent", appliedQuery.minRent);
    if (appliedQuery.maxRent) params.set("maxRent", appliedQuery.maxRent);
    if (appliedQuery.tenantType) params.set("tenant", appliedQuery.tenantType);
    if (appliedQuery.bedrooms) params.set("bedrooms", appliedQuery.bedrooms);
    return `/homes?${params.toString()}`;
  }, [appliedQuery, center, listScroll]);

  const propertyHref = useCallback((propertyId: string) => `/homes/${propertyId}?returnTo=${encodeURIComponent(searchReturnPath(propertyId))}`, [searchReturnPath]);

  const handleSelectListing = useCallback((propertyId: string) => {
    setSelectedId(propertyId);
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`[data-property-id="${CSS.escape(propertyId)}"]`)?.scrollIntoView({ block: "nearest" });
    });
  }, [setSelectedId]);

  const handleShowOnMap = useCallback((propertyId: string) => {
    setSelectedId(propertyId);
    setMapFocusId(propertyId);
    setMapFocusVersion((version) => version + 1);
  }, [setMapFocusId, setMapFocusVersion, setSelectedId]);

  function stopLiveLocation() {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    liveFixReceivedRef.current = false;
    setLiveTracking(false);
    setLocating(false);
    setLocationStatus(copy.livePaused);
  }

  function startLiveLocation() {
    if (!navigator.geolocation) { setMessage(copy.locationUnsupported); return; }
    cancelActiveSearch();
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
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
      setLocating(false);
      setLiveTracking(false);
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setMessage(error.code === error.PERMISSION_DENIED ? copy.permissionDenied : copy.locationTrackingError);
      setLocationStatus(null);
    }, { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 });
  }

  function choosePresetLocation(label: string) {
    cancelActiveSearch();
    setLocationPreset(label);
    const preset = LOCATION_PRESETS.find((location) => location.label === label);
    if (!preset) return;
    if (liveTracking) {
      stopLiveLocation();
      setLocationStatus(copy.pausedForArea);
    }
    setCustomArea([]);
    setDrawingCustomArea(false);
    setCenter([preset.latitude, preset.longitude]);
    setMapDirty(false);
  }

  function handleMapCenterChange(nextCenter: [number, number]) {
    if (liveTracking) {
      stopLiveLocation();
      setLocationStatus(copy.pausedForMapMove);
    }
    setLocationPreset("");
    setCenter(nextCenter);
    setMapDirty(true);
  }

  function clearFilters() {
    cancelActiveSearch();
    setMinRent("");
    setMaxRent("");
    setBedrooms("");
    setRadiusKm("15");
    setCustomArea([]);
    setDrawingCustomArea(false);
    setSelectedId(null);
    setMessage(copy.filtersCleared);
    if (tenantType) window.setTimeout(() => { void runSearchRef.current(center, sortOption, null); }, 0);
  }

  async function saveSearch() {
    if (customAreaMode) { setMessage(copy.customAreaTemporary); return; }
    if (!userId) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    if (!searchName.trim()) { setMessage(copy.nameSearch); return; }
    if (!appliedQuery.tenantType) { setMessage(workspaceCopy.toolbar.tenantRequired); return; }
    setSavingSearch(true);
    setMessage(null);
    const { error } = await supabase.from("saved_searches").insert({
      user_id: userId,
      name: searchName.trim(),
      center_lat: appliedQuery.center[0],
      center_long: appliedQuery.center[1],
      radius_km: Number(appliedQuery.radiusKm),
      min_rent: appliedQuery.minRent ? Number(appliedQuery.minRent) : null,
      max_rent: appliedQuery.maxRent ? Number(appliedQuery.maxRent) : null,
      tenant_type: appliedQuery.tenantType,
      min_bedrooms: appliedQuery.bedrooms ? Number(appliedQuery.bedrooms) : null,
    });
    if (error) setMessage(friendlySearchError(error, copy));
    else {
      setSearchName("");
      setMessage(copy.searchSaved);
    }
    setSavingSearch(false);
  }

  function startCustomArea() {
    cancelActiveSearch();
    stopLiveLocation();
    setLocationPreset("");
    setCustomArea([]);
    setDrawingCustomArea(true);
    setMapDirty(false);
    setMessage(copy.customAreaMode);
  }

  function finishCustomArea() {
    if (customArea.length < 3) { setMessage(copy.customAreaMinPoints); return; }
    if (customArea.length > MAX_CUSTOM_AREA_VERTICES) {
      setMessage(formatWorkflowText(copy.customAreaMaxCorners, { max: MAX_CUSTOM_AREA_VERTICES }));
      return;
    }
    setDrawingCustomArea(false);
    setSelectedId(null);
    void runSearch(center, sortOption, customArea);
  }

  function clearCustomArea() {
    setCustomArea([]);
    setDrawingCustomArea(false);
    setMapDirty(false);
    setSelectedId(null);
    if (tenantType) void runSearch(center, sortOption, null);
  }

  return (
    <div className="renter-search-shell">
      <div className="mobile-search-summary" aria-label={searchSummary}>
        <MapPinned size={16} aria-hidden="true" />
        <span>{searchSummary || workspaceCopy.mobile.summaryFallback}</span>
        <strong>{resultCountText}</strong>
      </div>

      <section className="renter-search-toolbar renter-filter-panel" aria-label={workspaceCopy.toolbar.aria} data-mobile-filter-title={workspaceCopy.mobile.filtersTitle}>
        <div className="renter-toolbar-heading">
          <div><span>{copy.eyebrow}</span><strong>{copy.title}</strong></div>
          <p>{copy.description}</p>
        </div>

        <div className="renter-primary-filters">
          <label className="field renter-toolbar-area">
            {workspaceCopy.toolbar.area}
            <select value={locationPreset} onChange={(event) => choosePresetLocation(event.target.value)} disabled={busy}>
              <option value="">{copy.chooseDhakaLocation}</option>
              {LOCATION_PRESETS.map((location) => <option key={location.label} value={location.label}>{localizeLocationLabel(location.label, dictionary)}</option>)}
            </select>
          </label>

          <label className="field renter-toolbar-tenant">
            {workspaceCopy.toolbar.tenant}
            <select value={tenantType} required onChange={(event) => { cancelActiveSearch(); setTenantType(event.target.value as SearchTenantType | ""); }}>
              <option value="" disabled>{workspaceCopy.toolbar.tenantRequired}</option>
              <option value="family">{tenantLabels.family}</option>
              <option value="bachelor">{tenantLabels.bachelor}</option>
              <option value="student">{tenantLabels.student}</option>
              <option value="job_holder">{tenantLabels.job_holder}</option>
            </select>
          </label>

          <label className="field renter-toolbar-budget">
            {workspaceCopy.toolbar.budget}
            <input inputMode="numeric" value={maxRent} onChange={(event) => { cancelActiveSearch(); setMaxRent(event.target.value.replace(/\D/g, "")); }} placeholder={workspaceCopy.toolbar.budgetPlaceholder} />
          </label>

          <label className="field renter-toolbar-bedrooms">
            {workspaceCopy.toolbar.bedrooms}
            <select value={bedrooms} onChange={(event) => { cancelActiveSearch(); setBedrooms(event.target.value); }}>
              <option value="">{copy.any}</option>
              {[1, 2, 3, 4].map((count) => <option value={String(count)} key={count}>{formatNumber(count, locale)}+</option>)}
            </select>
          </label>

          <details className="renter-more-filters">
            <summary><SlidersHorizontal size={15} aria-hidden="true" />{workspaceCopy.toolbar.moreFilters}</summary>
            <div className="renter-more-filter-grid">
              <label className="field">
                {workspaceCopy.toolbar.minimumRent}
                <input inputMode="numeric" value={minRent} onChange={(event) => { cancelActiveSearch(); setMinRent(event.target.value.replace(/\D/g, "")); }} placeholder="10000" />
              </label>
              <label className="field">
                {workspaceCopy.toolbar.radius}
                <select value={radiusKm} onChange={(event) => { cancelActiveSearch(); setRadiusKm(event.target.value); }}>
                  {RADIUS_OPTIONS.map((value) => <option value={value} key={value}>{formatNumber(Number(value), locale)} {distanceUnit}</option>)}
                </select>
              </label>
            </div>
          </details>

          <button className="secondary-button renter-toolbar-reset" type="button" onClick={clearFilters} title={workspaceCopy.toolbar.resetHint}>{workspaceCopy.toolbar.reset}</button>
          <button className="primary-button renter-toolbar-apply" type="button" onClick={() => void runSearch()} disabled={busy || !tenantType}>
            <Search size={16} aria-hidden="true" />
            <span>{busy ? copy.searching : workspaceCopy.toolbar.apply}</span>
          </button>
        </div>

        <div className="renter-toolbar-meta">
          <div className="tenant-match-legend" aria-label={copy.renterFitMapColors}>
            <span className="tenant-legend-chip tenant-family"><Users size={12} aria-hidden="true" />{tenantLabels.family}</span>
            <span className="tenant-legend-chip tenant-bachelor"><User size={12} aria-hidden="true" />{tenantLabels.bachelor} / {tenantLabels.job_holder}</span>
            <span className="tenant-legend-chip tenant-student"><GraduationCap size={12} aria-hidden="true" />{tenantLabels.student}</span>
            <span className="tenant-legend-chip tenant-everyone"><CircleCheck size={12} aria-hidden="true" />{tenantLabels.everyone}</span>
          </div>
          {locationStatus && <div className="renter-toolbar-status" role="status" aria-live="polite">{locationStatus}</div>}
          {message && <div className={message === copy.searchSaved ? "success-message compact-message" : "auth-message compact-message"} role="status" aria-live="polite">{message}</div>}
        </div>

        <div className="mobile-filter-footer">
          <button className="secondary-button" type="button" onClick={clearFilters}>{workspaceCopy.mobile.resetFilters}</button>
          <button className="primary-button" type="button" onClick={() => void runSearch()} disabled={busy || !tenantType}>{busy ? copy.searching : workspaceCopy.mobile.applyFilters}</button>
        </div>
      </section>

      <div className="renter-workspace">
        <aside className="renter-search-sidebar" aria-label={workspaceCopy.mobile.results}>
          <div className="renter-results-header">
            <div className="renter-results-context">
              <span>{appliedQuery.areaLabel}</span>
              <strong>{resultCountText}</strong>
              <small>{sortDescription(sortOption, copy)}</small>
            </div>
            <label className="renter-results-sort">
              <span>{workspaceCopy.results.sort}</span>
              <select value={sortOption} onChange={(event) => { const nextSort = event.target.value as SortOption; setSortOption(nextSort); if (tenantType) void runSearch(center, nextSort); }}>
                <option value="recommended">{copy.recommended}</option>
                <option value="distance">{copy.distanceNearest}</option>
                <option value="rent-asc">{copy.rentLowHigh}</option>
                <option value="rent-desc">{copy.rentHighLow}</option>
              </select>
            </label>
            <details className="save-search-popover">
              <summary>{workspaceCopy.results.saveSearch}</summary>
              <div>
                <strong>{workspaceCopy.results.saveSearchTitle}</strong>
                <input value={searchName} onChange={(event) => setSearchName(event.target.value)} maxLength={80} placeholder={customAreaMode ? copy.clearCustomAreaToSave : copy.searchNamePlaceholder} disabled={customAreaMode} />
                <button className="secondary-button" type="button" onClick={() => void saveSearch()} disabled={savingSearch || customAreaMode}>{savingSearch ? copy.saving : copy.saveRadiusSearch}</button>
                <small>{customAreaMode ? copy.customAreaSaveHelp : copy.radiusSaveHelp}</small>
              </div>
            </details>
          </div>

          <div
            className="renter-results-pane"
            ref={resultsPaneRef}
            aria-busy={busy}
            onScroll={(event) => setListScroll(Math.round(event.currentTarget.scrollTop))}
          >
            {busy && visibleListings.length > 0 && (
              <div className="renter-results-updating" role="status" aria-live="polite">
                <strong>{workspaceCopy.results.updating}</strong>
                <span>{workspaceCopy.results.updatingHint}</span>
              </div>
            )}
            <RenterResultsList
              listings={visibleListings}
              busy={busy}
              customAreaActive={customAreaActive}
              selectedId={effectiveSelectedId}
              preference={activePreference}
              userId={userId}
              propertyHref={propertyHref}
              onSelect={handleShowOnMap}
              onHighlight={setHighlightedId}
            />
          </div>
        </aside>

        <section className="renter-map-panel" aria-label={copy.title}>
          <LeafletMap
            listings={visibleListings}
            center={center}
            radiusKm={Number(appliedQuery.radiusKm)}
            selectedId={highlightedId ?? effectiveSelectedId}
            activeSelectedId={effectiveSelectedId}
            focusId={mapFocusId}
            focusVersion={mapFocusVersion}
            onSelect={handleSelectListing}
            onCenterChange={handleMapCenterChange}
            userLocation={userLocation}
            liveTracking={liveTracking}
            customArea={customArea}
            drawingCustomArea={drawingCustomArea}
            onCustomAreaChange={handleCustomAreaChange}
          />

          <div className="renter-map-actions" aria-label={copy.title}>
            {mapDirty && <button className="primary-button renter-search-this-area" type="button" onClick={() => void runSearch(center, sortOption, customAreaActive ? customArea : null)} disabled={busy || !tenantType}>{workspaceCopy.map.searchThisArea}</button>}
            {liveTracking ? (
              <button className="secondary-button" type="button" onClick={stopLiveLocation}>{workspaceCopy.map.stopLocation}</button>
            ) : (
              <button className="secondary-button" type="button" onClick={startLiveLocation} disabled={locating}><LocateFixed size={16} aria-hidden="true" />{locating ? copy.findingYou : workspaceCopy.map.myLocation}</button>
            )}
            {!drawingCustomArea && !customAreaActive && <button className="secondary-button" type="button" onClick={startCustomArea}>{workspaceCopy.map.drawArea}</button>}
            {drawingCustomArea && <button className="primary-button" type="button" onClick={finishCustomArea}>{workspaceCopy.map.finishArea} · {formatNumber(customArea.length, locale)}</button>}
            {(drawingCustomArea || customAreaActive) && <button className="secondary-button" type="button" onClick={clearCustomArea}>{workspaceCopy.map.clearArea}</button>}
          </div>

          {drawingCustomArea && <div className="custom-area-map-hint" role="status"><strong>{copy.drawSearchArea}</strong><span>{formatWorkflowText(copy.drawSearchAreaHint, { count: formatNumber(customArea.length, locale) })}</span></div>}

          {selectedListing && (
            <article className={`mobile-map-sheet tenant-compatibility-${tenantCompatibility(selectedListing.tenant_types ?? [], activePreference)}`} aria-live="polite">
              <button className="mobile-map-sheet-close" type="button" onClick={() => setSelectedId(null)} aria-label={copy.closePropertyPreview}>×</button>
              <div className="mobile-map-sheet-handle" aria-hidden="true" />
              <div className="mobile-map-sheet-content">
                <div className="mobile-map-sheet-image">{selectedListing.cover_url ? <Image src={selectedListing.cover_url} alt="" fill sizes="118px" /> : <span aria-hidden="true">⌂</span>}</div>
                <div className="mobile-map-sheet-copy">
                  <TenantBadge types={selectedListing.tenant_types ?? []} preference={activePreference} labels={tenantLabels} />
                  <h2>{selectedListing.title || copy.rentalProperty}</h2>
                  <p>{selectedListing.address_text || copy.locationOnMap}</p>
                  {tenantCompatibility(selectedListing.tenant_types ?? [], activePreference) === "mismatch" && <small className="tenant-preference-note is-mismatch">{copy.differentRenterPreference}</small>}
                  <div className="mobile-map-sheet-meta"><strong>{selectedListing.rent_bdt ? formatCurrency(selectedListing.rent_bdt, locale) : copy.rentOnRequest}</strong><span>{selectedListing.bedrooms == null ? "—" : formatNumber(selectedListing.bedrooms, locale)} {copy.bed} · {selectedListing.bathrooms == null ? "—" : formatNumber(selectedListing.bathrooms, locale)} {copy.bath}</span></div>
                </div>
              </div>
              <div className="mobile-map-sheet-actions"><SaveHomeButton propertyId={selectedListing.id} userId={userId} compact /><Link className="primary-button link-button" href={propertyHref(selectedListing.id)}>{copy.viewFullListing}</Link></div>
            </article>
          )}
        </section>
      </div>
    </div>
  );
}
