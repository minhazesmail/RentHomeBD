"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { ListingReadiness } from "@/components/listing-readiness";
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

type Props = { userId: string; amenities: Amenity[]; property?: ExistingProperty };
type OrderedMedia =
  | { key: string; kind: "existing"; media: ExistingMedia }
  | { key: string; kind: "new"; file: File };

const tenantOptions = [["family", "Family"], ["bachelor", "Bachelor"], ["student", "Student"], ["job_holder", "Job holder"], ["everyone", "Everyone"]] as const;
const utilityOptions = [["water", "Water"], ["gas", "Gas"], ["electricity", "Electricity"], ["internet", "Internet"], ["service_charge", "Service charge"]] as const;

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
function rawErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "";
}

function friendlyListingError(error: unknown) {
  const raw = rawErrorMessage(error);
  const message = raw.toLowerCase();
  if (message.includes("title of at least 5 characters") || message.includes("properties_title_length")) return "Add a listing title with at least 5 characters.";
  if (message.includes("property type is required")) return "Choose a property type before submitting for review.";
  if (message.includes("monthly rent is required") || message.includes("properties_rent_positive")) return "Enter a valid monthly rent greater than ৳0.";
  if (message.includes("availability date is required")) return "Choose the date when the property will be available.";
  if (message.includes("exact map coordinates are required")) return "Add the exact property location using the map coordinates.";
  if (message.includes("preferred tenant type")) return "Choose at least one preferred tenant type.";
  if (message.includes("property photo")) return "Upload at least one property photo before submitting for review.";
  if (message.includes("properties_deposit_nonnegative")) return "Security deposit cannot be negative.";
  if (message.includes("properties_floor_within_building")) return "Floor number cannot be higher than the building's total floors.";
  if (message.includes("properties_size_positive")) return "Property size must be greater than 0 sq ft.";
  if (message.includes("row-level security") || message.includes("permission denied")) return "You do not have permission to change this listing. Refresh the page and sign in again if needed.";
  if (message.includes("violates check constraint")) return "One or more listing values are outside the allowed range. Check the numbers and try again.";
  if (raw) return "We couldn't save this listing. Check the details and try again.";
  return "Could not save this listing. Please try again.";
}

function SelectedMediaPreview({ file }: { file: File }) {
  const previewUrl = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl]);
  return file.type.startsWith("video/")
    ? <video className="listing-media-preview" src={previewUrl} muted controls preload="metadata" />
    : <img className="listing-media-preview" src={previewUrl} alt={`Preview of ${file.name}`} />;
}

export function PropertyListingForm({ userId, amenities, property }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
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
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const latNumber = optionalNumber(latitude);
  const lngNumber = optionalNumber(longitude);
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
    setMessage("Exact pin updated. Place it on the building entrance or gate before submitting.");
  }

  function addSelectedFiles(nextFiles: File[]) {
    if (!nextFiles.length) return;
    const currentKeys = new Set(files.map(selectedFileKey));
    const unique = nextFiles.filter((file) => !currentKeys.has(selectedFileKey(file)));
    if (existingMedia.length + files.length + unique.length > 10) {
      setMessage(`A listing can have up to 10 media files. You can add ${Math.max(0, 10 - existingMedia.length - files.length)} more.`);
      return;
    }
    setFiles((items) => [...items, ...unique]);
    setMediaOrder((items) => [...items, ...unique.map(selectedFileKey)]);
    setMessage(unique.length < nextFiles.length ? "Duplicate selections were skipped. Your existing selected files were kept." : null);
  }

  function removeExistingMedia(media: ExistingMedia) {
    const key = existingMediaKey(media.id);
    setExistingMedia((items) => items.filter((item) => item.id !== media.id));
    setRemovedMedia((items) => [...items, media]);
    setMediaOrder((items) => items.filter((item) => item !== key));
  }

  function removeSelectedFile(file: File) {
    const key = selectedFileKey(file);
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
    setMessage("Cover photo selected. Save the listing to publish this media order.");
  }

  function validateNumericFields() {
    const numericFields = [[deposit, "Security deposit must be a valid number."], [size, "Property size must be a valid number."], [bedrooms, "Bedrooms must be a valid number."], [bathrooms, "Bathrooms must be a valid number."], [floorNumber, "Floor number must be a valid number."], [totalFloors, "Total floors must be a valid number."]] as const;
    for (const [value, errorMessage] of numericFields) if (value.trim() && optionalNumber(value) === null) return errorMessage;
    const depositNumber = optionalNumber(deposit);
    if (depositNumber !== null && depositNumber < 0) return "Security deposit cannot be negative.";
    const sizeNumber = optionalNumber(size);
    if (sizeNumber !== null && sizeNumber <= 0) return "Property size must be greater than 0 sq ft.";
    const bedroomsNumber = optionalNumber(bedrooms);
    if (bedroomsNumber !== null && bedroomsNumber < 0) return "Bedrooms cannot be negative.";
    const bathroomsNumber = optionalNumber(bathrooms);
    if (bathroomsNumber !== null && bathroomsNumber < 0) return "Bathrooms cannot be negative.";
    const floor = optionalNumber(floorNumber);
    if (floor !== null && floor < 0) return "Floor number cannot be negative.";
    const floors = optionalNumber(totalFloors);
    if (floors !== null && floors <= 0) return "Total floors must be greater than 0.";
    if (floor !== null && floors !== null && floor > floors) return "Floor number cannot be higher than the building's total floors.";
    return null;
  }

  function validateForReview() {
    const numericError = validateNumericFields();
    if (numericError) return numericError;
    if (title.trim().length < 5) return "Add a listing title with at least 5 characters.";
    if (!propertyType) return "Choose a property type before submitting for review.";
    const rentNumber = optionalNumber(rent);
    if (rentNumber === null || rentNumber <= 0) return "Enter a valid monthly rent greater than ৳0.";
    if (!availableFrom) return "Choose the date when the property will be available.";
    if (latitude.trim() && latNumber === null) return "Latitude must be a valid number.";
    if (longitude.trim() && lngNumber === null) return "Longitude must be a valid number.";
    if (latNumber === null || lngNumber === null) return "Add the exact property location before submitting for review.";
    if (latNumber < -90 || latNumber > 90) return "Latitude must be between -90 and 90.";
    if (lngNumber < -180 || lngNumber > 180) return "Longitude must be between -180 and 180.";
    if (!tenantTypes.length) return "Choose at least one preferred tenant type.";
    if (!hasPhoto) return "Upload at least one property photo before submitting for review.";
    return null;
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) { setMessage("This browser does not support location access. Place the pin manually on the map."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setMapLocation(coords.latitude, coords.longitude);
      setLocating(false);
      setMessage("Current location added. Drag the pin to the exact building entrance if needed.");
    }, () => {
      setLocating(false);
      setMessage("Location permission was not available. Click the map to place the property pin manually.");
    }, { enableHighAccuracy: true, timeout: 12000 });
  }

  async function syncRelations(propertyId: string) {
    const tenantDelete = await supabase.from("property_tenant_types").delete().eq("property_id", propertyId);
    if (tenantDelete.error) throw tenantDelete.error;
    if (tenantTypes.length) {
      const tenantInsert = await supabase.from("property_tenant_types").insert(tenantTypes.map((tenant_type) => ({ property_id: propertyId, tenant_type })) as never);
      if (tenantInsert.error) throw tenantInsert.error;
    }
    const amenityDelete = await supabase.from("property_amenities").delete().eq("property_id", propertyId);
    if (amenityDelete.error) throw amenityDelete.error;
    if (selectedAmenities.length) {
      const amenityInsert = await supabase.from("property_amenities").insert(selectedAmenities.map((amenity_slug) => ({ property_id: propertyId, amenity_slug })) as never);
      if (amenityInsert.error) throw amenityInsert.error;
    }
  }

  async function removeDeletedMedia() {
    for (const media of removedMedia) {
      const storageResult = await supabase.storage.from("property-media").remove([media.storage_path]);
      if (storageResult.error) throw storageResult.error;
      const metadataResult = await supabase.from("property_media").delete().eq("id", media.id);
      if (metadataResult.error) throw metadataResult.error;
    }
  }

  async function stageExistingMediaOrder() {
    for (let index = 0; index < orderedMedia.length; index += 1) {
      const item = orderedMedia[index];
      if (item.kind !== "existing") continue;
      const staged = await supabase.from("property_media").update({ sort_order: 100 + index } as never).eq("id", item.media.id);
      if (staged.error) throw staged.error;
    }
  }

  async function uploadNewMedia(propertyId: string) {
    for (let index = 0; index < orderedMedia.length; index += 1) {
      const item = orderedMedia[index];
      if (item.kind !== "new") continue;
      const file = item.file;
      if (file.size > 20 * 1024 * 1024) throw new Error(`${file.name} is larger than 20 MB.`);
      const id = crypto.randomUUID();
      const path = `${userId}/${propertyId}/${id}.${fileExtension(file)}`;
      const upload = await supabase.storage.from("property-media").upload(path, file, { cacheControl: "3600", upsert: false });
      if (upload.error) throw upload.error;
      const mediaType = file.type.startsWith("video/") ? "video" : "photo";
      const metadata = await supabase.from("property_media").insert({ property_id: propertyId, storage_path: path, media_type: mediaType, sort_order: index } as never);
      if (metadata.error) { await supabase.storage.from("property-media").remove([path]); throw metadata.error; }
    }
  }

  async function finalizeExistingMediaOrder() {
    for (let index = 0; index < orderedMedia.length; index += 1) {
      const item = orderedMedia[index];
      if (item.kind !== "existing") continue;
      const result = await supabase.from("property_media").update({ sort_order: index } as never).eq("id", item.media.id);
      if (result.error) throw result.error;
    }
  }

  async function save(submitForReview: boolean) {
    if (locked) return;
    const validationMessage = submitForReview ? validateForReview() : validateNumericFields();
    if (validationMessage) { setMessage(validationMessage); return; }
    setBusy(true); setMessage(null);
    try {
      const payload = { title: title.trim() || null, description: description.trim() || null, address_text: addressText.trim() || null, property_type: propertyType || null, rent_bdt: optionalNumber(rent), deposit_bdt: optionalNumber(deposit) ?? 0, utilities_included: utilities, size_sqft: optionalNumber(size), bedrooms: optionalNumber(bedrooms), bathrooms: optionalNumber(bathrooms), floor_number: optionalNumber(floorNumber), total_floors: optionalNumber(totalFloors), furnishing, gender_preference: genderPreference, available_from: availableFrom || null, latitude: latNumber, longitude: lngNumber };
      let propertyId = property?.id;
      if (propertyId && property) {
        const currentStatus = property.status === "pending_review" ? "draft" : property.status;
        const result = await supabase.from("properties").update({ ...payload, status: currentStatus } as never).eq("id", propertyId).eq("owner_id", userId);
        if (result.error) throw result.error;
      } else {
        const result = await supabase.from("properties").insert({ owner_id: userId, status: "draft", ...payload } as never).select("id").single();
        if (result.error) throw result.error;
        propertyId = result.data.id;
      }
      await syncRelations(propertyId);
      await removeDeletedMedia();
      await stageExistingMediaOrder();
      await uploadNewMedia(propertyId);
      await finalizeExistingMediaOrder();
      if (submitForReview) {
        const submission = await supabase.from("properties").update({ status: "pending_review" } as never).eq("id", propertyId).eq("owner_id", userId);
        if (submission.error) throw submission.error;
      }
      router.push(`/owner?notice=${submitForReview ? "submitted" : "saved"}`);
      router.refresh();
    } catch (error) { setMessage(friendlyListingError(error)); setBusy(false); }
  }

  const mediaCount = orderedMedia.length;

  return (
    <form className="listing-form" onSubmit={(event) => { event.preventDefault(); void save(false); }}>
      {property?.moderation_notes && <div className="review-note"><strong>Moderator note:</strong> {property.moderation_notes}</div>}
      {locked && <div className="review-note">This listing is currently {property?.status.replaceAll("_", " ")}. Editing is locked at this stage.</div>}

      {!locked && <ListingReadiness title={title} description={description} addressText={addressText} propertyType={propertyType} rent={rent} availableFrom={availableFrom} floorNumber={floorNumber} bedrooms={bedrooms} bathrooms={bathrooms} tenantTypes={tenantTypes} amenities={selectedAmenities} utilities={utilities} hasExactPin={latNumber !== null && lngNumber !== null} hasPhoto={hasPhoto} />}

      <section className="listing-section">
        <div className="section-heading"><span>1</span><div><h2>Property basics</h2><p>Core details renters use to understand the home.</p></div></div>
        <div className="form-grid two-col">
          <label className="field full">Listing title<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="2-bedroom apartment near Dhanmondi Lake" maxLength={140} disabled={locked} /></label>
          <label className="field">Property type<select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} disabled={locked}><option value="">Choose type</option><option value="apartment">Apartment</option><option value="house">House</option><option value="room_share">Room share</option><option value="sublet">Sublet</option><option value="hostel_seat">Hostel seat</option></select></label>
          <label className="field">Available from<input type="date" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} disabled={locked} /></label>
          <label className="field">Monthly rent (৳)<input inputMode="numeric" value={rent} onChange={(e) => setRent(e.target.value)} placeholder="25000" disabled={locked} /></label>
          <label className="field">Security deposit (৳)<input inputMode="numeric" value={deposit} onChange={(e) => setDeposit(e.target.value)} placeholder="0" disabled={locked} /></label>
          <label className="field full">Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} maxLength={5000} placeholder="Describe rooms, building rules, nearby landmarks, and anything renters should know." disabled={locked} /></label>
        </div>
      </section>

      <section className="listing-section">
        <div className="section-heading"><span>2</span><div><h2>Home details</h2><p>Structured fields make listings easier to compare.</p></div></div>
        <div className="form-grid four-col">
          <label className="field">Size (sq ft)<input inputMode="numeric" value={size} onChange={(e) => setSize(e.target.value)} placeholder="1200" disabled={locked} /></label>
          <label className="field">Bedrooms<input inputMode="numeric" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} placeholder="3" disabled={locked} /></label>
          <label className="field">Bathrooms<input inputMode="numeric" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} placeholder="2" disabled={locked} /></label>
          <label className="field">Floor<input inputMode="numeric" value={floorNumber} onChange={(e) => setFloorNumber(e.target.value)} placeholder="4" disabled={locked} /></label>
          <label className="field">Total floors<input inputMode="numeric" value={totalFloors} onChange={(e) => setTotalFloors(e.target.value)} placeholder="8" disabled={locked} /></label>
          <label className="field">Furnishing<select value={furnishing} onChange={(e) => setFurnishing(e.target.value as typeof furnishing)} disabled={locked}><option value="unfurnished">Unfurnished</option><option value="semi_furnished">Semi furnished</option><option value="furnished">Furnished</option></select></label>
          <label className="field">Gender preference<select value={genderPreference} onChange={(e) => setGenderPreference(e.target.value as typeof genderPreference)} disabled={locked}><option value="any">Any</option><option value="male">Male</option><option value="female">Female</option></select></label>
        </div>
        <fieldset className="choice-group" disabled={locked}><legend>Utilities included</legend><div className="choice-grid">{utilityOptions.map(([value, label]) => <label className="choice-chip" key={value}><input type="checkbox" checked={utilities.includes(value)} onChange={() => toggle(value, utilities, setUtilities)} />{label}</label>)}</div></fieldset>
        <fieldset className="choice-group" disabled={locked}><legend>Amenities</legend><div className="choice-grid">{amenities.map((amenity) => <label className="choice-chip" key={amenity.slug}><input type="checkbox" checked={selectedAmenities.includes(amenity.slug)} onChange={() => toggle(amenity.slug, selectedAmenities, setSelectedAmenities)} />{amenity.name}</label>)}</div></fieldset>
      </section>

      <section className="listing-section">
        <div className="section-heading"><span>3</span><div><h2>Preferred tenants</h2><p>Choose at least one before submitting for review.</p></div></div>
        <fieldset className="choice-group" disabled={locked}><div className="choice-grid">{tenantOptions.map(([value, label]) => <label className="choice-chip" key={value}><input type="checkbox" checked={tenantTypes.includes(value)} onChange={() => toggle(value, tenantTypes, setTenantTypes)} />{label}</label>)}</div></fieldset>
      </section>

      <section className="listing-section listing-location-section">
        <div className="section-heading"><span>4</span><div><h2>Exact location</h2><p>Enter the address, then place the pin on the actual building entrance. Renters discover homes from this exact map point.</p></div></div>
        <label className="field full">Address / area<input value={addressText} onChange={(e) => setAddressText(e.target.value)} maxLength={500} placeholder="Road 8, Dhanmondi, Dhaka" disabled={locked} /></label>
        <div className="location-workflow-note"><strong>Pin accuracy matters</strong><span>Use the gate or main entrance—not a neighborhood center or nearby landmark.</span></div>
        <div className="location-grid">
          <div className="location-fields">
            {!locked && <button className="secondary-button" type="button" onClick={useCurrentLocation} disabled={locating}>{locating ? "Getting location…" : "◎ Use my current location"}</button>}
            <div className="coordinate-readout"><span>Exact coordinates</span><strong>{latNumber !== null && lngNumber !== null ? `${latNumber.toFixed(6)}, ${lngNumber.toFixed(6)}` : "Pin not placed yet"}</strong></div>
            <details className="coordinate-advanced"><summary>Advanced: enter coordinates manually</summary><div className="coordinate-fields"><label className="field">Latitude<input inputMode="decimal" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="23.7465" disabled={locked} /></label><label className="field">Longitude<input inputMode="decimal" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="90.3760" disabled={locked} /></label></div></details>
            <p className="form-hint">Click anywhere on the map to place the pin. Once placed, drag it for gate-level accuracy.</p>
          </div>
          <div className="map-preview interactive-map-preview"><OwnerLocationPicker latitude={latNumber} longitude={lngNumber} disabled={locked} onChange={setMapLocation} /></div>
        </div>
      </section>

      <section className="listing-section">
        <div className="section-heading"><span>5</span><div><h2>Photos & video</h2><p>At least one photo is required for review. Up to 10 files, 20 MB each. The first photo is the cover shown in search results.</p></div></div>
        {orderedMedia.length > 0 && <div className="media-grid listing-media-preview-grid">
          {orderedMedia.map((item, index) => {
            const isPhoto = item.kind === "existing" ? item.media.media_type === "photo" : item.file.type.startsWith("image/");
            const isCover = isPhoto && item.key === coverKey;
            return <div className={`media-card listing-media-card${item.kind === "new" ? " is-new" : ""}${isCover ? " is-cover" : ""}`} key={item.key}>
              <div className="media-placeholder listing-media-visual">
                {isCover && <span className="listing-cover-badge">Cover photo</span>}
                {item.kind === "existing" ? (
                  item.media.preview_url ? (item.media.media_type === "video" ? <video className="listing-media-preview" src={item.media.preview_url} muted controls preload="metadata" /> : <img className="listing-media-preview" src={item.media.preview_url} alt="Existing property photo" />) : <div className="listing-media-preview-fallback"><strong>{item.media.media_type === "photo" ? "Photo" : "Video"}</strong><small>Preview unavailable</small></div>
                ) : <SelectedMediaPreview file={item.file} />}
              </div>
              <div className="listing-media-meta">
                <strong>{item.kind === "existing" ? (item.media.media_type === "photo" ? "Existing photo" : "Existing video") : `New ${item.file.type.startsWith("video/") ? "video" : "photo"}`}</strong>
                <small>{item.kind === "existing" ? storageFilename(item.media.storage_path) : item.file.name}</small>
                {item.kind === "new" && <small>{(item.file.size / (1024 * 1024)).toFixed(1)} MB</small>}
                <small>Position {index + 1} of {mediaCount}</small>
              </div>
              {!locked && <div className="listing-media-controls" aria-label={`Media position ${index + 1}`}>
                <button type="button" className="text-button" disabled={index === 0} onClick={() => moveMedia(item.key, -1)} aria-label="Move media earlier">← Earlier</button>
                <button type="button" className="text-button" disabled={index === mediaCount - 1} onClick={() => moveMedia(item.key, 1)} aria-label="Move media later">Later →</button>
                {isPhoto && !isCover && <button type="button" className="text-button listing-cover-action" onClick={() => makeCover(item.key)}>Make cover</button>}
              </div>}
              {!locked && <button type="button" className="text-button listing-media-remove" onClick={() => item.kind === "existing" ? removeExistingMedia(item.media) : removeSelectedFile(item.file)}>Remove</button>}
            </div>;
          })}
        </div>}
        {!locked && <label className="upload-drop">Add files<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" multiple onChange={(event) => { addSelectedFiles(Array.from(event.target.files ?? [])); event.currentTarget.value = ""; }} /><span>{files.length ? `${files.length} new file${files.length === 1 ? "" : "s"} ready to upload · choose more to add` : "Choose JPG, PNG, WebP, MP4 or WebM"}</span></label>}
        <p className="form-hint">Current media count: {mediaCount}/10. Use Earlier/Later to set gallery order. Choose Make cover on any photo to move it to the first position.</p>
      </section>

      {message && <div className="auth-message" role="status" aria-live="polite">{message}</div>}
      {!locked && <div className="listing-actions"><button className="secondary-button" type="submit" disabled={busy}>{busy ? "Saving…" : "Save draft"}</button><button className="primary-button" type="button" disabled={busy} onClick={() => void save(true)}>{busy ? "Working…" : "Submit for review"}</button></div>}
    </form>
  );
}
