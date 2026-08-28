"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type Amenity = { slug: string; name: string };
type ExistingMedia = { id: string; storage_path: string; media_type: "photo" | "video" };
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

type Props = {
  userId: string;
  amenities: Amenity[];
  property?: ExistingProperty;
};

const tenantOptions = [
  ["family", "Family"],
  ["bachelor", "Bachelor"],
  ["student", "Student"],
  ["job_holder", "Job holder"],
  ["everyone", "Everyone"],
] as const;

const utilityOptions = [
  ["water", "Water"],
  ["gas", "Gas"],
  ["electricity", "Electricity"],
  ["internet", "Internet"],
  ["service_charge", "Service charge"],
] as const;

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

function storageFilename(path: string) {
  return path.split("/").pop() ?? path;
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
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const latNumber = optionalNumber(latitude);
  const lngNumber = optionalNumber(longitude);
  const mapUrl = latNumber !== null && lngNumber !== null
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${lngNumber - 0.008}%2C${latNumber - 0.005}%2C${lngNumber + 0.008}%2C${latNumber + 0.005}&layer=mapnik&marker=${latNumber}%2C${lngNumber}`
    : null;

  function toggle(value: string, values: string[], setter: (next: string[]) => void) {
    setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setMessage("This browser does not support location access. Enter latitude and longitude manually.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLatitude(coords.latitude.toFixed(6));
        setLongitude(coords.longitude.toFixed(6));
        setLocating(false);
        setMessage("Current location added. Check the map preview before saving.");
      },
      () => {
        setLocating(false);
        setMessage("Location permission was not available. Enter the coordinates manually.");
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  async function syncRelations(propertyId: string) {
    const tenantDelete = await supabase.from("property_tenant_types").delete().eq("property_id", propertyId);
    if (tenantDelete.error) throw tenantDelete.error;
    if (tenantTypes.length) {
      const tenantInsert = await supabase.from("property_tenant_types").insert(
        tenantTypes.map((tenant_type) => ({ property_id: propertyId, tenant_type })) as never
      );
      if (tenantInsert.error) throw tenantInsert.error;
    }

    const amenityDelete = await supabase.from("property_amenities").delete().eq("property_id", propertyId);
    if (amenityDelete.error) throw amenityDelete.error;
    if (selectedAmenities.length) {
      const amenityInsert = await supabase.from("property_amenities").insert(
        selectedAmenities.map((amenity_slug) => ({ property_id: propertyId, amenity_slug })) as never
      );
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

  async function uploadNewMedia(propertyId: string) {
    let sortOrder = existingMedia.length;
    for (const file of files) {
      if (file.size > 20 * 1024 * 1024) throw new Error(`${file.name} is larger than 20 MB.`);
      const id = crypto.randomUUID();
      const path = `${userId}/${propertyId}/${id}.${fileExtension(file)}`;
      const upload = await supabase.storage.from("property-media").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upload.error) throw upload.error;

      const mediaType = file.type.startsWith("video/") ? "video" : "photo";
      const metadata = await supabase.from("property_media").insert({
        property_id: propertyId,
        storage_path: path,
        media_type: mediaType,
        sort_order: sortOrder,
      } as never);
      if (metadata.error) {
        await supabase.storage.from("property-media").remove([path]);
        throw metadata.error;
      }
      sortOrder += 1;
    }
  }

  async function save(submitForReview: boolean) {
    if (locked) return;
    setBusy(true);
    setMessage(null);

    try {
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

      let propertyId = property?.id;
      if (propertyId && property) {
        const currentStatus = property.status === "pending_review" ? "draft" : property.status;
        const result = await supabase
          .from("properties")
          .update({ ...payload, status: currentStatus } as never)
          .eq("id", propertyId)
          .eq("owner_id", userId);
        if (result.error) throw result.error;
      } else {
        const result = await supabase
          .from("properties")
          .insert({ owner_id: userId, status: "draft", ...payload } as never)
          .select("id")
          .single();
        if (result.error) throw result.error;
        propertyId = result.data.id;
      }

      await syncRelations(propertyId);
      await removeDeletedMedia();
      await uploadNewMedia(propertyId);

      if (submitForReview) {
        const submission = await supabase
          .from("properties")
          .update({ status: "pending_review" } as never)
          .eq("id", propertyId)
          .eq("owner_id", userId);
        if (submission.error) throw submission.error;
      }

      router.push(`/owner?notice=${submitForReview ? "submitted" : "saved"}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save this listing. Please try again.");
      setBusy(false);
    }
  }

  const mediaCount = existingMedia.length + files.length;

  return (
    <form className="listing-form" onSubmit={(event) => { event.preventDefault(); void save(false); }}>
      {property?.moderation_notes && (
        <div className="review-note"><strong>Moderator note:</strong> {property.moderation_notes}</div>
      )}
      {locked && <div className="review-note">This listing is currently {property?.status.replaceAll("_", " ")}. Editing is locked at this stage.</div>}

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

      <section className="listing-section">
        <div className="section-heading"><span>4</span><div><h2>Exact location</h2><p>Add the address and confirm the exact pin. Longitude and latitude are stored as a PostGIS point.</p></div></div>
        <label className="field full">Address / area<input value={addressText} onChange={(e) => setAddressText(e.target.value)} maxLength={500} placeholder="Road 8, Dhanmondi, Dhaka" disabled={locked} /></label>
        <div className="location-grid">
          <div className="location-fields">
            <label className="field">Latitude<input inputMode="decimal" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="23.7465" disabled={locked} /></label>
            <label className="field">Longitude<input inputMode="decimal" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="90.3760" disabled={locked} /></label>
            {!locked && <button className="secondary-button" type="button" onClick={useCurrentLocation} disabled={locating}>{locating ? "Getting location…" : "Use my current location"}</button>}
            <p className="form-hint">Use the property entrance or building location, not an approximate neighborhood center.</p>
          </div>
          <div className="map-preview">{mapUrl ? <iframe title="Property map preview" src={mapUrl} loading="lazy" /> : <div className="map-empty"><span className="map-pin">●</span><strong>Map preview</strong><small>Enter coordinates to place the pin.</small></div>}</div>
        </div>
      </section>

      <section className="listing-section">
        <div className="section-heading"><span>5</span><div><h2>Photos & video</h2><p>At least one photo is required for review. Up to 10 files, 20 MB each.</p></div></div>
        {!!existingMedia.length && <div className="media-grid">{existingMedia.map((media) => <div className="media-card" key={media.id}><div className="media-placeholder"><strong>{media.media_type === "photo" ? "Photo" : "Video"}</strong><small>{storageFilename(media.storage_path)}</small></div><button type="button" className="text-button" disabled={locked} onClick={() => { setExistingMedia((items) => items.filter((item) => item.id !== media.id)); setRemovedMedia((items) => [...items, media]); }}>Remove</button></div>)}</div>}
        {!locked && <label className="upload-drop">Add files<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" multiple onChange={(event) => { const next = Array.from(event.target.files ?? []); if (existingMedia.length + next.length > 10) { setMessage("A listing can have up to 10 media files."); return; } setFiles(next); }} /><span>{files.length ? `${files.length} new file${files.length === 1 ? "" : "s"} selected` : "Choose JPG, PNG, WebP, MP4 or WebM"}</span></label>}
        <p className="form-hint">Current media count: {mediaCount}/10</p>
      </section>

      {message && <div className="auth-message">{message}</div>}

      {!locked && <div className="listing-actions"><button className="secondary-button" type="submit" disabled={busy}>{busy ? "Saving…" : "Save draft"}</button><button className="primary-button" type="button" disabled={busy} onClick={() => void save(true)}>{busy ? "Working…" : "Submit for review"}</button></div>}
    </form>
  );
}
