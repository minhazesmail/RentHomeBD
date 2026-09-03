"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import { TENANT_PROFILE_LABELS, type TenantType } from "@/lib/tenant-match";

type SavedSearchRecord = {
  id: string;
  name: string;
  center_lat: number;
  center_long: number;
  radius_km: number | null;
  min_rent: number | null;
  max_rent: number | null;
  tenant_type: TenantType | null;
  min_bedrooms: number | null;
};

type Props = {
  search: SavedSearchRecord;
  userId: string;
  runHref: string;
  displayTitle: string;
  displayArea: string;
  displayFilters: string;
};

const MAX_RENT = 10_000_000;

function duplicateName(name: string) {
  const base = name.trim() || "Saved search";
  const suffix = " copy";
  return `${base.slice(0, 80 - suffix.length)}${suffix}`;
}

export function SavedSearchCard({ search, userId, runHref, displayTitle, displayArea, displayFilters }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient() as unknown as SupabaseClient, []);
  const [editing, setEditing] = useState(false);
  const [busyAction, setBusyAction] = useState<"save" | "duplicate" | "delete" | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [name, setName] = useState(search.name);
  const [radiusKm, setRadiusKm] = useState(search.radius_km == null ? "" : String(search.radius_km));
  const [minRent, setMinRent] = useState(search.min_rent == null ? "" : String(search.min_rent));
  const [maxRent, setMaxRent] = useState(search.max_rent == null ? "" : String(search.max_rent));
  const [tenantType, setTenantType] = useState<TenantType | "">(search.tenant_type ?? "");
  const [bedrooms, setBedrooms] = useState(search.min_bedrooms == null ? "" : String(search.min_bedrooms));

  function resetForm() {
    setName(search.name);
    setRadiusKm(search.radius_km == null ? "" : String(search.radius_km));
    setMinRent(search.min_rent == null ? "" : String(search.min_rent));
    setMaxRent(search.max_rent == null ? "" : String(search.max_rent));
    setTenantType(search.tenant_type ?? "");
    setBedrooms(search.min_bedrooms == null ? "" : String(search.min_bedrooms));
    setStatus(null);
  }

  function validate() {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length > 80) return "Use a search name between 1 and 80 characters.";

    const radius = radiusKm === "" ? null : Number(radiusKm);
    const minimum = minRent === "" ? null : Number(minRent);
    const maximum = maxRent === "" ? null : Number(maxRent);
    const bedroomCount = bedrooms === "" ? null : Number(bedrooms);

    if (radius !== null && (!Number.isFinite(radius) || radius < 0.5 || radius > 100)) return "Radius must be between 0.5 and 100 km.";
    if (minimum !== null && (!Number.isFinite(minimum) || minimum < 0 || minimum > MAX_RENT)) return "Minimum rent must be between ৳0 and ৳10,000,000.";
    if (maximum !== null && (!Number.isFinite(maximum) || maximum < 0 || maximum > MAX_RENT)) return "Maximum rent must be between ৳0 and ৳10,000,000.";
    if (minimum !== null && maximum !== null && minimum > maximum) return "Minimum rent cannot be higher than maximum rent.";
    if (bedroomCount !== null && (!Number.isInteger(bedroomCount) || bedroomCount < 0 || bedroomCount > 99)) return "Bedrooms must be a whole number between 0 and 99.";
    return null;
  }

  async function saveChanges() {
    const validationMessage = validate();
    if (validationMessage) { setStatus(validationMessage); return; }

    setBusyAction("save");
    setStatus(null);
    const { error } = await supabase
      .from("saved_searches")
      .update({
        name: name.trim(),
        radius_km: radiusKm === "" ? null : Number(radiusKm),
        min_rent: minRent === "" ? null : Number(minRent),
        max_rent: maxRent === "" ? null : Number(maxRent),
        tenant_type: tenantType || null,
        min_bedrooms: bedrooms === "" ? null : Number(bedrooms),
      })
      .eq("id", search.id)
      .eq("user_id", userId);

    if (error) {
      setStatus("We couldn't update this saved search. Check the values and try again.");
      setBusyAction(null);
      return;
    }

    setStatus("Saved search updated.");
    setEditing(false);
    setBusyAction(null);
    router.refresh();
  }

  async function duplicate() {
    setBusyAction("duplicate");
    setStatus(null);
    const { error } = await supabase.from("saved_searches").insert({
      user_id: userId,
      name: duplicateName(search.name),
      center_lat: search.center_lat,
      center_long: search.center_long,
      radius_km: search.radius_km,
      min_rent: search.min_rent,
      max_rent: search.max_rent,
      tenant_type: search.tenant_type,
      min_bedrooms: search.min_bedrooms,
    });

    if (error) {
      setStatus("We couldn't duplicate this saved search. Try again.");
      setBusyAction(null);
      return;
    }

    setStatus("Saved search duplicated.");
    setBusyAction(null);
    router.refresh();
  }

  async function remove() {
    if (!window.confirm(`Delete “${displayTitle}”?`)) return;
    setBusyAction("delete");
    setStatus(null);
    const { error } = await supabase.from("saved_searches").delete().eq("id", search.id).eq("user_id", userId);
    if (error) {
      setStatus("We couldn't delete this saved search. Try again.");
      setBusyAction(null);
      return;
    }
    router.refresh();
  }

  return (
    <div className={`saved-search-card${editing ? " is-editing" : ""}`}>
      <div className="saved-search-copy">
        <strong>{displayTitle}</strong>
        <span>{displayArea}</span>
        <small>{displayFilters}</small>
      </div>

      {editing ? (
        <form className="saved-search-edit-form" onSubmit={(event) => { event.preventDefault(); void saveChanges(); }}>
          <div className="saved-search-edit-grid">
            <label className="saved-search-edit-field saved-search-edit-name">
              <span>Search name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required />
            </label>
            <label className="saved-search-edit-field">
              <span>Radius (km)</span>
              <input type="number" min="0.5" max="100" step="0.5" value={radiusKm} onChange={(event) => setRadiusKm(event.target.value)} placeholder="Any" />
            </label>
            <label className="saved-search-edit-field">
              <span>Minimum rent</span>
              <input type="number" min="0" max={MAX_RENT} step="500" value={minRent} onChange={(event) => setMinRent(event.target.value)} placeholder="Any" />
            </label>
            <label className="saved-search-edit-field">
              <span>Maximum rent</span>
              <input type="number" min="0" max={MAX_RENT} step="500" value={maxRent} onChange={(event) => setMaxRent(event.target.value)} placeholder="Any" />
            </label>
            <label className="saved-search-edit-field">
              <span>Renter type</span>
              <select value={tenantType} onChange={(event) => setTenantType(event.target.value as TenantType | "")}>
                <option value="">Any renter type</option>
                {(Object.entries(TENANT_PROFILE_LABELS) as [TenantType, string][]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="saved-search-edit-field">
              <span>Minimum bedrooms</span>
              <input type="number" min="0" max="99" step="1" value={bedrooms} onChange={(event) => setBedrooms(event.target.value)} placeholder="Any" />
            </label>
          </div>
          <p className="form-hint">This keeps the saved map center in place. Run the search if you want to move the map to a different area.</p>
          <div className="saved-search-edit-actions">
            <button className="primary-button" type="submit" disabled={busyAction !== null}>{busyAction === "save" ? "Saving…" : "Save changes"}</button>
            <button className="text-button" type="button" onClick={() => { resetForm(); setEditing(false); }} disabled={busyAction !== null}>Cancel</button>
          </div>
          {status && <div className="saved-search-status" role="status" aria-live="polite">{status}</div>}
        </form>
      ) : (
        <div className="saved-search-controls">
          <div className="saved-search-actions">
            <Link className="primary-button link-button" href={runHref}>Run search</Link>
            <button className="secondary-button" type="button" onClick={() => { setStatus(null); setEditing(true); }} disabled={busyAction !== null}>Edit</button>
            <button className="text-button" type="button" onClick={() => void duplicate()} disabled={busyAction !== null}>{busyAction === "duplicate" ? "Duplicating…" : "Duplicate"}</button>
            <button className="text-button" type="button" onClick={() => void remove()} disabled={busyAction !== null}>{busyAction === "delete" ? "Deleting…" : "Delete"}</button>
          </div>
          {status && <div className="saved-search-status" role="status" aria-live="polite">{status}</div>}
        </div>
      )}
    </div>
  );
}
