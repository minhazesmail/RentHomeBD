"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ListingReadiness } from "@/components/listing-readiness";
import { useLocale } from "@/i18n/use-locale";
import { formatWorkflowText, getWorkflowCopy, type WorkflowCopy } from "@/i18n/workflow-copy";
import { resolveLocationPreset } from "@/lib/location-presets";
import { createClient } from "@/lib/supabase/client";

const OwnerLocationPicker = dynamic(() => import("@/components/owner-location-picker").then((module) => module.OwnerLocationPicker), { ssr: false });

type Amenity = { slug: string; name: string };
type ExistingMedia = { id: string; storage_path: string; media_type: "photo" | "video"; sort_order?: number; preview_url?: string | null };
type ExistingProperty = {
  id: string;
  title: string | null;
  description: string | null;
  address_text: string | null;
  property_type: "apartment" | "house" | "room_share" | "sublet" | "hostel_seat" | null;
  rent_bdt: number | null;
  deposit_bdt: number;
  utilities_included: string[];
  size_sqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floor_number: number | null;
  total_floors: number | null;
  furnishing: "furnished" | "semi_furnished" | "unfurnished";
  gender_preference: "male" | "female" | "any";
  available_from: string | null;
  latitude: number | null;
  longitude: number | null;
  status: "draft" | "pending_review" | "available" | "pending_confirmation" | "rented" | "expired" | "rejected";
  moderation_notes: string | null;
  tenant_types: string[];
  amenities: string[];
  media: ExistingMedia[];
};

type Props = { userId: string; amenities: Amenity[]; property?: ExistingProperty; draftId?: string };
type OrderedMedia =
  | { key: string; kind: "existing"; media: ExistingMedia }
  | { key: string; kind: "new"; file: File };
type PersistedMediaItem = {
  id: string;
  storage_path: string;
  media_type: "photo" | "video";
  sort_order: number;
};
type UploadedMediaReceipt = Omit<PersistedMediaItem, "sort_order">;
type FormCopy = WorkflowCopy["owner"]["form"];

function optionalNumber(value: string) {
  if (!value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function fileExtension(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (extension) return extension;
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "video/mp4") return "mp4";
  if (file.type === "video/webm") return "webm";
  return "bin";
}

function storageFilename(path: string) { return path.split("/").pop() ?? path; }
function existingMediaKey(id: string) { return `existing:${id}`; }
function selectedFileKey(file: File) { return `new:${file.name}:${file.size}:${file.lastModified}`; }

async function stableMediaId(propertyId: string, file: File) {
  const fingerprint = `${propertyId}\0${file.name}\0${file.size}\0${file.lastModified}\0${file.type}`;
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(fingerprint)));
  const bytes = digest.slice(0, 16);
  // RFC 9562 UUIDv8 bits: deterministic application-defined payload + standard variant.
  bytes[6] = (bytes[6] & 0x0f) | 0x80;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function rawErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "";
}

function friendlyListingError(error: unknown, copy: FormCopy) {
  const raw = rawErrorMessage(error);
  const message = raw.toLowerCase();
  if (message.includes("property draft limit reached")) return copy.propertyDraftLimit;
  if (message.includes("removed media could not be cleaned up")) return copy.mediaCleanupError;
  if (message.includes("title of at least 5 characters") || message.includes("properties_title_length")) return copy.titleTooShort;
  if (message.includes("property type is required")) return copy.choosePropertyType;
  if (message.includes("monthly rent is required") || message.includes("properties_rent_positive")) return copy.validRent;
  if (message.includes("availability date is required")) return copy.availabilityRequired;
  if (message.includes("exact map coordinates are required")) return copy.exactCoordinatesRequired;
  if (message.includes("preferred tenant type")) return copy.chooseRenterType;
  if (message.includes("property photo")) return copy.photoRequired;
  if (message.includes("properties_deposit_nonnegative")) return copy.depositNonnegative;
  if (message.includes("properties_floor_within_building")) return copy.floorWithinBuilding;
  if (message.includes("properties_size_positive")) return copy.sizePositive;
  if (message.includes("start editing or relisting") || message.includes("listing must be editable")) return copy.beginEditFirst;
  if (message.includes("row-level security") || message.includes("permission denied")) return copy.permissionError;
  if (message.includes("violates check constraint")) return copy.valuesOutOfRange;
  if (raw) return copy.saveError;
  return copy.saveErrorFallback;
}

function listingStatusLabel(status: ExistingProperty["status"], locale: "en" | "bn") {
  if (locale === "bn") {
    const labels: Record<ExistingProperty["status"], string> = {
      draft: "ড্রাফট",
      pending_review: "রিভিউয়ের অপেক্ষায়",
      available: "উপলভ্য",
      pending_confirmation: "নিশ্চিতকরণের অপেক্ষায়",
      rented: "ভাড়া হয়ে গেছে",
      expired: "মেয়াদ শেষ",
      rejected: "প্রত্যাখ্যাত",
    };
    return labels[status];
  }
  return status.replaceAll("_", " ");
}

function SelectedMediaPreview({ file }: { file: File }) {
  const previewUrl = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl]);
  return file.type.startsWith("video/")
    ? <video className="listing-media-preview" src={previewUrl} muted controls preload="metadata" />
    : <img className="listing-media-preview" src={previewUrl} alt={file.name} />;
}

export function PropertyListingForm({ userId, amenities, property, draftId }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { locale, dictionary, formatNumber } = useLocale();
  const copy = getWorkflowCopy(locale).owner.form;
  const tenantOptions = [
    ["family", dictionary.common.tenant.family],
    ["bachelor", dictionary.common.tenant.bachelor],
    ["student", dictionary.common.tenant.student],
    ["job_holder", dictionary.common.tenant.jobHolder],
    ["everyone", dictionary.common.tenant.everyone],
  ] as const;
  const utilityOptions = [
    ["water", copy.water],
    ["gas", copy.gas],
    ["electricity", copy.electricity],
    ["internet", copy.internet],
    ["service_charge", copy.serviceCharge],
  ] as const;
  const locked = property ? !["draft", "pending_review", "rejected"].includes(property.status) : false;
  const [title, setTitle] = useState(property?.title ?? "");
  const [description, setDescription] = useState(property?.description ?? "");
  const [addressText, setAddressText] = useState(property?.address_text ?? "");
  const [propertyType, setPropertyType] = useState(property?.property_type ?? "");
  const [rent, setRent] = useState(property?.rent_bdt?.toString() ?? "");
  const [deposit, setDeposit] = useState(property?.deposit_bdt?.toString() ?? "0");
  const [size, setSize] = useState(property?.size_sqft?.toString() ?? "");
  const [bedrooms, setBedrooms] = useState(property?.bedrooms?.toString() ?? "");
  const [bathrooms, setBathrooms] = useState(property?.bathrooms?.toString() ?? "");
  const [floorNumber, setFloorNumber] = useState(property?.floor_number?.toString() ?? "");
  const [totalFloors, setTotalFloors] = useState(property?.total_floors?.toString() ?? "");
  const [furnishing, setFurnishing] = useState(property?.furnishing ?? "unfurnished");
  const [genderPreference, setGenderPreference] = useState(property?.gender_preference ?? "any");
  const [availableFrom, setAvailableFrom] = useState(property?.available_from ?? "");
  const [latitude, setLatitude] = useState(property?.latitude?.toString() ?? "");
  const [longitude, setLongitude] = useState(property?.longitude?.toString() ?? "");
  const [tenantTypes, setTenantTypes] = useState<string[]>(property?.tenant_types ?? []);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(property?.amenities ?? []);
  const [utilities, setUtilities] = useState<string[]>(property?.utilities_included ?? []);
  const [existingMedia, setExistingMedia] = useState(property?.media ?? []);
  const [removedMedia, setRemovedMedia] = useState<ExistingMedia[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [mediaOrder, setMediaOrder] = useState<string[]>(() => (property?.media ?? []).map((media) => existingMediaKey(media.id)));
  const [mapFocusPosition, setMapFocusPosition] = useState<[number, number] | null>(null);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const uploadedMediaByFileKey = useRef(new Map<string, UploadedMediaReceipt>());
  const pendingNewUploadCleanup = useRef(new Set<string>());

  const latNumber = optionalNumber(latitude);
  const lngNumber = optionalNumber(longitude);
  const matchedArea = useMemo(() => resolveLocationPreset(addressText), [addressText]);
  const orderedMedia = useMemo<OrderedMedia[]>(() => {
    const existingByKey = new Map(existingMedia.map((media) => [existingMediaKey(media.id), media]));
    const fileByKey = new Map(files.map((file) => [selectedFileKey(file), file]));
    const ordered: OrderedMedia[] = [];
    for (const key of mediaOrder) {
      const media = existingByKey.get(key);
      if (media) { ordered.push({ key, kind: "existing", media }); continue; }
      const file = fileByKey.get(key);
      if (file) ordered.push({ key, kind: "new", file });
    }
    return ordered;
  }, [existingMedia, files, mediaOrder]);
  const hasPhoto = orderedMedia.some((item) => item.kind === "existing" ? item.media.media_type === "photo" : item.file.type.startsWith("image/"));
  const coverKey = orderedMedia.find((item) => item.kind === "existing" ? item.media.media_type === "photo" : item.file.type.startsWith("image/"))?.key ?? null;

  function toggle(value: string, values: string[], setter: (next: string[]) => void) { setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]); }
  function setMapLocation(lat: number, lng: number) {
    setLatitude(lat.toFixed(6));
    setLongitude(lng.toFixed(6));
    setMapFocusPosition(null);
    setMessage(copy.exactPinUpdated);
  }

  function focusMapNearTypedArea() {
    if (!matchedArea) return;
    setMapFocusPosition([matchedArea.latitude, matchedArea.longitude]);
    setMessage(formatWorkflowText(copy.mapCenteredNear, { area: matchedArea.label }));
  }

  function addSelectedFiles(nextFiles: File[]) {
    if (!nextFiles.length) return;
    const currentKeys = new Set(files.map(selectedFileKey));
    const unique = nextFiles.filter((file) => !currentKeys.has(selectedFileKey(file)));
    if (existingMedia.length + files.length + unique.length > 10) {
      setMessage(formatWorkflowText(copy.maxMedia, { count: Math.max(0, 10 - existingMedia.length - files.length) }));
      return;
    }
    for (const file of unique) {
      const uploaded = uploadedMediaByFileKey.current.get(selectedFileKey(file));
      if (uploaded) pendingNewUploadCleanup.current.delete(uploaded.storage_path);
    }
    setFiles((items) => [...items, ...unique]);
    setMediaOrder((items) => [...items, ...unique.map(selectedFileKey)]);
    setMessage(unique.length < nextFiles.length ? copy.duplicatesSkipped : null);
  }

  function removeExistingMedia(media: ExistingMedia) {
    const key = existingMediaKey(media.id);
    setExistingMedia((items) => items.filter((item) => item.id !== media.id));
    setRemovedMedia((items) => [...items, media]);
    setMediaOrder((items) => items.filter((item) => item !== key));
  }

  function removeSelectedFile(file: File) {
    const key = selectedFileKey(file);
    const uploaded = uploadedMediaByFileKey.current.get(key);
    if (uploaded) pendingNewUploadCleanup.current.add(uploaded.storage_path);
    setFiles((items) => items.filter((item) => selectedFileKey(item) !== key));
    setMediaOrder((items) => items.filter((item) => item !== key));
  }

  function moveMedia(key: string, direction: -1 | 1) {
    setMediaOrder((items) => {
      const index = items.indexOf(key);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= items.length) return items;
      const next = [...items];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  function makeCover(key: string) {
    setMediaOrder((items) => [key, ...items.filter((item) => item !== key)]);
    setMessage(copy.coverSelected);
  }

  function validateNumericFields() {
    const numericFields = [
      [deposit, copy.invalidDeposit],
      [size, copy.invalidSize],
      [bedrooms, copy.invalidBedrooms],
      [bathrooms, copy.invalidBathrooms],
      [floorNumber, copy.invalidFloor],
      [totalFloors, copy.invalidTotalFloors],
    ] as const;
    for (const [value, errorMessage] of numericFields) if (value.trim() && optionalNumber(value) === null) return errorMessage;
    const depositNumber = optionalNumber(deposit);
    if (depositNumber !== null && depositNumber < 0) return copy.depositNonnegative;
    const sizeNumber = optionalNumber(size);
    if (sizeNumber !== null && sizeNumber <= 0) return copy.sizePositive;
    const bedroomsNumber = optionalNumber(bedrooms);
    if (bedroomsNumber !== null && bedroomsNumber < 0) return copy.bedroomsNonnegative;
    const bathroomsNumber = optionalNumber(bathrooms);
    if (bathroomsNumber !== null && bathroomsNumber < 0) return copy.bathroomsNonnegative;
    const floor = optionalNumber(floorNumber);
    if (floor !== null && floor < 0) return copy.floorNonnegative;
    const floors = optionalNumber(totalFloors);
    if (floors !== null && floors <= 0) return copy.totalFloorsPositive;
    if (floor !== null && floors !== null && floor > floors) return copy.floorWithinBuilding;
    return null;
  }

  function validateForReview() {
    const numericError = validateNumericFields();
    if (numericError) return numericError;
    if (title.trim().length < 5) return copy.titleTooShort;
    if (!propertyType) return copy.choosePropertyType;
    const rentNumber = optionalNumber(rent);
    if (rentNumber === null || rentNumber <= 0) return copy.validRent;
    if (!availableFrom) return copy.availabilityRequired;
    if (latitude.trim() && latNumber === null) return copy.invalidLatitude;
    if (longitude.trim() && lngNumber === null) return copy.invalidLongitude;
    if (latNumber === null || lngNumber === null) return copy.exactLocationReview;
    if (latNumber < -90 || latNumber > 90) return copy.latitudeRange;
    if (lngNumber < -180 || lngNumber > 180) return copy.longitudeRange;
    if (!tenantTypes.length) return copy.chooseRenterType;
    if (!hasPhoto) return copy.photoRequired;
    return null;
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) { setMessage(copy.locationUnsupported); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setMapLocation(coords.latitude, coords.longitude);
      setLocating(false);
      setMessage(copy.currentLocationAdded);
    }, () => {
      setLocating(false);
      setMessage(copy.locationPermissionUnavailable);
    }, { enableHighAccuracy: true, timeout: 12000 });
  }

  async function prepareMediaForAtomicSave(propertyId: string) {
    const mediaItems: PersistedMediaItem[] = [];

    for (let index = 0; index < orderedMedia.length; index += 1) {
      const item = orderedMedia[index];
      if (item.kind === "existing") {
        mediaItems.push({
          id: item.media.id,
          storage_path: item.media.storage_path,
          media_type: item.media.media_type,
          sort_order: index,
        });
        continue;
      }

      const file = item.file;
      if (file.size > 20 * 1024 * 1024) throw new Error(formatWorkflowText(copy.mediaTooLarge, { name: file.name }));
      const key = selectedFileKey(file);
      let receipt = uploadedMediaByFileKey.current.get(key);

      if (!receipt) {
        const id = await stableMediaId(propertyId, file);
        const storagePath = `${userId}/${propertyId}/${id}.${fileExtension(file)}`;
        const mediaType: "photo" | "video" = file.type.startsWith("video/") ? "video" : "photo";
        const upload = await supabase.storage.from("property-media").upload(storagePath, file, { cacheControl: "3600", upsert: false });

        if (upload.error) {
          // A lost upload response is ambiguous. Verify the deterministic path
          // before retrying bytes; if it exists, reconcile it into this save.
          const verification = await supabase.storage.from("property-media").createSignedUrl(storagePath, 60);
          if (verification.error) throw upload.error;
        }

        receipt = { id, storage_path: storagePath, media_type: mediaType };
        uploadedMediaByFileKey.current.set(key, receipt);
      }

      pendingNewUploadCleanup.current.delete(receipt.storage_path);
      mediaItems.push({ ...receipt, sort_order: index });
    }

    return mediaItems;
  }

  async function cleanupRemovedStorage() {
    const cleanupPaths = new Set<string>([
      ...removedMedia.map((media) => media.storage_path),
      ...pendingNewUploadCleanup.current,
    ]);
    if (!cleanupPaths.size) return;

    const result = await supabase.storage.from("property-media").remove(Array.from(cleanupPaths));
    if (result.error) throw new Error(copy.mediaCleanupError);

    for (const [key, receipt] of uploadedMediaByFileKey.current) {
      if (cleanupPaths.has(receipt.storage_path)) uploadedMediaByFileKey.current.delete(key);
    }
    pendingNewUploadCleanup.current.clear();
    setRemovedMedia([]);
  }

  async function beginEditing() {
    if (!property || !locked) return;
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.rpc("begin_property_edit" as never, { property_uuid: property.id } as never);
    if (error) {
      setMessage(property.status === "rented" || property.status === "expired" ? copy.relistError : copy.editError);
      setBusy(false);
      return;
    }
    router.refresh();
    setBusy(false);
  }

  async function save(submitForReview: boolean) {
    if (locked) return;
    const validationMessage = submitForReview ? validateForReview() : validateNumericFields();
    if (validationMessage) { setMessage(validationMessage); return; }

    const propertyId = property?.id ?? draftId;
    if (!propertyId) {
      setMessage(copy.stableDraftError);
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const ensured = await supabase.rpc("ensure_property_draft" as never, { property_uuid: propertyId } as never);
      if (ensured.error) throw ensured.error;

      const mediaItems = await prepareMediaForAtomicSave(propertyId);
      const payload = {
        title: title.trim() || null,
        description: description.trim() || null,
        address_text: addressText.trim() || null,
        property_type: propertyType || null,
        rent_bdt: optionalNumber(rent),
        deposit_bdt: optionalNumber(deposit) ?? 0,
        utilities_included: utilities,
        size_sqft: optionalNumber(size),
        bedrooms: optionalNumber(bedrooms),
        bathrooms: optionalNumber(bathrooms),
        floor_number: optionalNumber(floorNumber),
        total_floors: optionalNumber(totalFloors),
        furnishing,
        gender_preference: genderPreference,
        available_from: availableFrom || null,
        latitude: latNumber,
        longitude: lngNumber,
      };

      const saved = await supabase.rpc("save_property_draft" as never, {
        property_uuid: propertyId,
        property_payload: payload,
        tenant_types: tenantTypes,
        amenity_slugs: selectedAmenities,
        media_items: mediaItems,
      } as never);
      if (saved.error) throw saved.error;

      // Destructive Storage cleanup happens only after the database contains a
      // complete valid draft. Cleanup failure therefore never loses metadata or
      // creates a half-submitted listing; the user can safely retry the draft.
      await cleanupRemovedStorage();

      if (submitForReview) {
        const submission = await supabase.rpc("submit_property_for_review" as never, { property_uuid: propertyId } as never);
        if (submission.error) throw submission.error;
      }

      router.push(`/owner?notice=${submitForReview ? "submitted" : "saved"}`);
      router.refresh();
    } catch (error) {
      setMessage(friendlyListingError(error, copy));
      setBusy(false);
    }
  }

  const mediaCount = orderedMedia.length;
  const relistLabel = property?.status === "rented" || property?.status === "expired" ? copy.relistAsDraft : copy.startEditing;

  return (
    <form className="listing-form" onSubmit={(event) => { event.preventDefault(); void save(false); }}>
      {property?.moderation_notes && <div className="review-note"><strong>{copy.moderatorNote}</strong> {property.moderation_notes}</div>}
      {locked && property && <div className="review-note"><strong>{formatWorkflowText(copy.statusLocked, { status: listingStatusLabel(property.status, locale) })}</strong><p>{copy.lockedHint}</p><button className="secondary-button" type="button" disabled={busy} onClick={() => void beginEditing()}>{busy ? copy.preparing : relistLabel}</button></div>}

      {!locked && <ListingReadiness title={title} description={description} addressText={addressText} propertyType={propertyType} rent={rent} availableFrom={availableFrom} floorNumber={floorNumber} bedrooms={bedrooms} bathrooms={bathrooms} tenantTypes={tenantTypes} amenities={selectedAmenities} utilities={utilities} hasExactPin={latNumber !== null && lngNumber !== null} hasPhoto={hasPhoto} />}

      <section className="listing-section">
        <div className="section-heading"><span>1</span><div><h2>{copy.basicsTitle}</h2><p>{copy.basicsHint}</p></div></div>
        <div className="form-grid two-col">
          <label className="field full">{copy.listingTitle}<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={copy.listingTitlePlaceholder} maxLength={140} disabled={locked} /></label>
          <label className="field">{copy.propertyType}<select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} disabled={locked}><option value="">{copy.chooseType}</option><option value="apartment">{copy.apartment}</option><option value="house">{copy.house}</option><option value="room_share">{copy.roomShare}</option><option value="sublet">{copy.sublet}</option><option value="hostel_seat">{copy.hostelSeat}</option></select></label>
          <label className="field">{copy.availableFrom}<input type="date" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} disabled={locked} /></label>
          <label className="field">{copy.monthlyRent}<input inputMode="numeric" value={rent} onChange={(e) => setRent(e.target.value)} placeholder="25000" disabled={locked} /></label>
          <label className="field">{copy.securityDeposit}<input inputMode="numeric" value={deposit} onChange={(e) => setDeposit(e.target.value)} placeholder="0" disabled={locked} /></label>
          <label className="field full">{copy.description}<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} maxLength={5000} placeholder={copy.descriptionPlaceholder} disabled={locked} /></label>
        </div>
      </section>

      <section className="listing-section">
        <div className="section-heading"><span>2</span><div><h2>{copy.detailsTitle}</h2><p>{copy.detailsHint}</p></div></div>
        <div className="form-grid four-col">
          <label className="field">{copy.size}<input inputMode="numeric" value={size} onChange={(e) => setSize(e.target.value)} placeholder="1200" disabled={locked} /></label>
          <label className="field">{copy.bedrooms}<input inputMode="numeric" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} placeholder="3" disabled={locked} /></label>
          <label className="field">{copy.bathrooms}<input inputMode="numeric" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} placeholder="2" disabled={locked} /></label>
          <label className="field">{copy.floor}<input inputMode="numeric" value={floorNumber} onChange={(e) => setFloorNumber(e.target.value)} placeholder="4" disabled={locked} /></label>
          <label className="field">{copy.totalFloors}<input inputMode="numeric" value={totalFloors} onChange={(e) => setTotalFloors(e.target.value)} placeholder="8" disabled={locked} /></label>
          <label className="field">{copy.furnishing}<select value={furnishing} onChange={(e) => setFurnishing(e.target.value as typeof furnishing)} disabled={locked}><option value="unfurnished">{copy.unfurnished}</option><option value="semi_furnished">{copy.semiFurnished}</option><option value="furnished">{copy.furnished}</option></select></label>
          <label className="field">{copy.genderPreference}<select value={genderPreference} onChange={(e) => setGenderPreference(e.target.value as typeof genderPreference)} disabled={locked}><option value="any">{copy.any}</option><option value="male">{copy.male}</option><option value="female">{copy.female}</option></select></label>
        </div>
        <fieldset className="choice-group" disabled={locked}><legend>{copy.utilitiesIncluded}</legend><div className="choice-grid">{utilityOptions.map(([value, label]) => <label className="choice-chip" key={value}><input type="checkbox" checked={utilities.includes(value)} onChange={() => toggle(value, utilities, setUtilities)} />{label}</label>)}</div></fieldset>
        <fieldset className="choice-group" disabled={locked}><legend>{copy.amenities}</legend><div className="choice-grid">{amenities.map((amenity) => <label className="choice-chip" key={amenity.slug}><input type="checkbox" checked={selectedAmenities.includes(amenity.slug)} onChange={() => toggle(amenity.slug, selectedAmenities, setSelectedAmenities)} />{amenity.name}</label>)}</div></fieldset>
      </section>

      <section className="listing-section">
        <div className="section-heading"><span>3</span><div><h2>{copy.renterTypesTitle}</h2><p>{copy.renterTypesHint}</p></div></div>
        <fieldset className="choice-group" disabled={locked}><div className="choice-grid">{tenantOptions.map(([value, label]) => <label className="choice-chip" key={value}><input type="checkbox" checked={tenantTypes.includes(value)} onChange={() => toggle(value, tenantTypes, setTenantTypes)} />{label}</label>)}</div></fieldset>
      </section>

      <section className="listing-section listing-location-section">
        <div className="section-heading"><span>4</span><div><h2>{copy.exactLocationTitle}</h2><p>{copy.exactLocationHint}</p></div></div>
        <label className="field full">{copy.addressArea}<input value={addressText} onChange={(e) => { setAddressText(e.target.value); setMapFocusPosition(null); }} maxLength={500} placeholder={copy.addressPlaceholder} disabled={locked} /></label>
        {!locked && addressText.trim() && <div className="location-workflow-note">
          <strong>{matchedArea ? formatWorkflowText(copy.areaMatch, { area: matchedArea.label }) : copy.addressAsWritten}</strong>
          <span>{matchedArea ? copy.areaMatchHint : copy.unknownAreaHint}</span>
          {matchedArea && <button className="secondary-button" type="button" onClick={focusMapNearTypedArea}>{formatWorkflowText(copy.centerMapNear, { area: matchedArea.label })}</button>}
        </div>}
        <div className="location-workflow-note"><strong>{copy.pinAccuracy}</strong><span>{copy.pinAccuracyHint}</span></div>
        <div className="location-grid">
          <div className="location-fields">
            {!locked && <button className="secondary-button" type="button" onClick={useCurrentLocation} disabled={locating}>{locating ? copy.gettingLocation : copy.useCurrentLocation}</button>}
            <div className="coordinate-readout" data-pin-placed={latNumber !== null && lngNumber !== null ? "true" : "false"}><span>{copy.exactCoordinates}</span><strong>{latNumber !== null && lngNumber !== null ? `${latNumber.toFixed(6)}, ${lngNumber.toFixed(6)}` : copy.pinNotPlaced}</strong></div>
            <details className="coordinate-advanced"><summary>{copy.advancedCoordinates}</summary><div className="coordinate-fields"><label className="field">{copy.latitude}<input inputMode="decimal" value={latitude} onChange={(e) => { setLatitude(e.target.value); setMapFocusPosition(null); }} placeholder="23.7465" disabled={locked} /></label><label className="field">{copy.longitude}<input inputMode="decimal" value={longitude} onChange={(e) => { setLongitude(e.target.value); setMapFocusPosition(null); }} placeholder="90.3760" disabled={locked} /></label></div></details>
            <p className="form-hint">{copy.locationFormHint}</p>
          </div>
          <div className="map-preview interactive-map-preview"><OwnerLocationPicker latitude={latNumber} longitude={lngNumber} focusPosition={mapFocusPosition} disabled={locked} onChange={setMapLocation} /></div>
        </div>
      </section>

      <section className="listing-section">
        <div className="section-heading"><span>5</span><div><h2>{copy.mediaTitle}</h2><p>{copy.mediaHint}</p></div></div>
        {orderedMedia.length > 0 && <div className="media-grid listing-media-preview-grid">
          {orderedMedia.map((item, index) => {
            const isPhoto = item.kind === "existing" ? item.media.media_type === "photo" : item.file.type.startsWith("image/");
            const isCover = isPhoto && item.key === coverKey;
            return <div className={`media-card listing-media-card${item.kind === "new" ? " is-new" : ""}${isCover ? " is-cover" : ""}`} key={item.key}>
              <div className="media-placeholder listing-media-visual">
                {isCover && <span className="listing-cover-badge">{copy.coverPhoto}</span>}
                {item.kind === "existing" ? (
                  item.media.preview_url ? (item.media.media_type === "video" ? <video className="listing-media-preview" src={item.media.preview_url} muted controls preload="metadata" /> : <img className="listing-media-preview" src={item.media.preview_url} alt={copy.existingPhotoAlt} />) : <div className="listing-media-preview-fallback"><strong>{item.media.media_type === "photo" ? copy.photo : copy.video}</strong><small>{copy.previewUnavailable}</small></div>
                ) : <SelectedMediaPreview file={item.file} />}
              </div>
              <div className="listing-media-meta">
                <strong>{item.kind === "existing" ? (item.media.media_type === "photo" ? copy.existingPhoto : copy.existingVideo) : (item.file.type.startsWith("video/") ? copy.newVideo : copy.newPhoto)}</strong>
                <small>{item.kind === "existing" ? storageFilename(item.media.storage_path) : item.file.name}</small>
                {item.kind === "new" && <small>{formatNumber(item.file.size / (1024 * 1024), { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MB</small>}
                <small>{formatWorkflowText(copy.position, { position: formatNumber(index + 1), count: formatNumber(mediaCount) })}</small>
              </div>
              {!locked && <div className="listing-media-controls" aria-label={formatWorkflowText(copy.mediaPositionAria, { position: formatNumber(index + 1) })}>
                <button type="button" className="text-button" disabled={index === 0} onClick={() => moveMedia(item.key, -1)} aria-label={copy.moveEarlierAria}>{copy.earlier}</button>
                <button type="button" className="text-button" disabled={index === mediaCount - 1} onClick={() => moveMedia(item.key, 1)} aria-label={copy.moveLaterAria}>{copy.later}</button>
                {isPhoto && !isCover && <button type="button" className="text-button listing-cover-action" onClick={() => makeCover(item.key)}>{copy.makeCover}</button>}
              </div>}
              {!locked && <button type="button" className="text-button listing-media-remove" onClick={() => item.kind === "existing" ? removeExistingMedia(item.media) : removeSelectedFile(item.file)}>{copy.remove}</button>}
            </div>;
          })}
        </div>}
        {!locked && <label className="upload-drop">{copy.addFiles}<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" multiple onChange={(event) => { addSelectedFiles(Array.from(event.target.files ?? [])); event.currentTarget.value = ""; }} /><span>{files.length ? (files.length === 1 ? copy.filesReadyOne : formatWorkflowText(copy.filesReadyMany, { count: formatNumber(files.length) })) : copy.chooseMedia}</span></label>}
        <p className="form-hint" data-media-count={mediaCount}>{formatWorkflowText(copy.mediaCountHint, { count: formatNumber(mediaCount) })}</p>
      </section>

      {message && <div className="auth-message" role="status" aria-live="polite">{message}</div>}
      {!locked && <div className="listing-actions"><button className="secondary-button" type="submit" disabled={busy}>{busy ? copy.saving : copy.saveDraft}</button><button className="primary-button" type="button" disabled={busy} onClick={() => void save(true)}>{busy ? copy.working : copy.submitReview}</button></div>}
    </form>
  );
}
