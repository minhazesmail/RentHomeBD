"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import styles from "./saved-search-match-state.module.css";
import { getSavedDecisionCopy } from "@/i18n/saved-decision-copy";
import { useLocale } from "@/i18n/use-locale";
import { formatWorkflowText, getWorkflowCopy } from "@/i18n/workflow-copy";
import {
  DEFAULT_RENTER_SEARCH_RADIUS,
  MAX_RENTER_SEARCH_BEDROOMS,
  MAX_RENTER_SEARCH_RADIUS_KM,
  MAX_RENTER_SEARCH_RENT_BDT,
  MIN_RENTER_SEARCH_RADIUS_KM,
} from "@/lib/search-defaults";
import { createClient } from "@/lib/supabase/client";
import type { TenantType } from "@/lib/tenant-match";

type SearchTenantType = Exclude<TenantType, "everyone">;

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

type MatchState = { currentCount: number; newCount: number };

type Props = {
  search: SavedSearchRecord;
  userId: string;
  runHref: string;
  displayTitle: string;
  displayArea: string;
  displayFilters: string;
  matchState: MatchState | null;
};

const SEARCH_TENANT_TYPES: SearchTenantType[] = ["family", "bachelor", "student", "job_holder"];

function duplicateName(name: string, fallback: string, suffix: string) {
  const base = name.trim() || fallback;
  return `${base.slice(0, 80 - suffix.length)}${suffix}`;
}

function validSearchTenant(value: TenantType | "" | null | undefined): value is SearchTenantType {
  return Boolean(value && value !== "everyone" && SEARCH_TENANT_TYPES.includes(value as SearchTenantType));
}

export function SavedSearchCard({ search, userId, runHref, displayTitle, displayArea, displayFilters, matchState }: Props) {
  const router = useRouter();
  const { locale, dictionary, formatNumber } = useLocale();
  const copy = getWorkflowCopy(locale).saved.searchCard;
  const decisionCopy = getSavedDecisionCopy(locale);
  const tenantLabels: Record<SearchTenantType, string> = {
    family: dictionary.common.tenant.family,
    bachelor: dictionary.common.tenant.bachelor,
    student: dictionary.common.tenant.student,
    job_holder: dictionary.common.tenant.jobHolder,
  };
  const supabase = useMemo(() => createClient() as unknown as SupabaseClient, []);
  const [editing, setEditing] = useState(false);
  const [busyAction, setBusyAction] = useState<"save" | "duplicate" | "delete" | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [name, setName] = useState(search.name);
  const [radiusKm, setRadiusKm] = useState(search.radius_km == null ? DEFAULT_RENTER_SEARCH_RADIUS : String(search.radius_km));
  const [minRent, setMinRent] = useState(search.min_rent == null ? "" : String(search.min_rent));
  const [maxRent, setMaxRent] = useState(search.max_rent == null ? "" : String(search.max_rent));
  const [tenantType, setTenantType] = useState<SearchTenantType | "">(validSearchTenant(search.tenant_type) ? search.tenant_type : "");
  const [bedrooms, setBedrooms] = useState(search.min_bedrooms == null ? "" : String(search.min_bedrooms));
  const hasNewMatches = (matchState?.newCount ?? 0) > 0;
  const requiresTenantType = !validSearchTenant(search.tenant_type);

  function resetForm() {
    setName(search.name);
    setRadiusKm(search.radius_km == null ? DEFAULT_RENTER_SEARCH_RADIUS : String(search.radius_km));
    setMinRent(search.min_rent == null ? "" : String(search.min_rent));
    setMaxRent(search.max_rent == null ? "" : String(search.max_rent));
    setTenantType(validSearchTenant(search.tenant_type) ? search.tenant_type : "");
    setBedrooms(search.min_bedrooms == null ? "" : String(search.min_bedrooms));
    setStatus(null);
  }

  function validate() {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length > 80) return copy.nameValidation;
    if (!validSearchTenant(tenantType)) return decisionCopy.tenantValidation;

    const radius = radiusKm === "" ? null : Number(radiusKm);
    const minimum = minRent === "" ? null : Number(minRent);
    const maximum = maxRent === "" ? null : Number(maxRent);
    const bedroomCount = bedrooms === "" ? null : Number(bedrooms);

    if (radius === null || !Number.isFinite(radius) || radius < MIN_RENTER_SEARCH_RADIUS_KM || radius > MAX_RENTER_SEARCH_RADIUS_KM) return formatWorkflowText(copy.radiusValidation, { min: MIN_RENTER_SEARCH_RADIUS_KM, max: MAX_RENTER_SEARCH_RADIUS_KM });
    if (minimum !== null && (!Number.isFinite(minimum) || minimum < 0 || minimum > MAX_RENTER_SEARCH_RENT_BDT)) return copy.minimumRentValidation;
    if (maximum !== null && (!Number.isFinite(maximum) || maximum < 0 || maximum > MAX_RENTER_SEARCH_RENT_BDT)) return copy.maximumRentValidation;
    if (minimum !== null && maximum !== null && minimum > maximum) return copy.rentOrderValidation;
    if (bedroomCount !== null && (!Number.isInteger(bedroomCount) || bedroomCount < 0 || bedroomCount > MAX_RENTER_SEARCH_BEDROOMS)) return formatWorkflowText(copy.bedroomsValidation, { max: MAX_RENTER_SEARCH_BEDROOMS });
    return null;
  }

  async function saveChanges() {
    const validationMessage = validate();
    if (validationMessage) { setStatus(validationMessage); return; }
    setBusyAction("save"); setStatus(null);
    const { error } = await supabase.from("saved_searches").update({
      name: name.trim(), radius_km: Number(radiusKm), min_rent: minRent === "" ? null : Number(minRent),
      max_rent: maxRent === "" ? null : Number(maxRent), tenant_type: tenantType,
      min_bedrooms: bedrooms === "" ? null : Number(bedrooms),
    }).eq("id", search.id).eq("user_id", userId);
    if (error) { setStatus(copy.updateError); setBusyAction(null); return; }
    setStatus(copy.updated); setEditing(false); setBusyAction(null); router.refresh();
  }

  async function duplicate() {
    setBusyAction("duplicate"); setStatus(null);
    const { error } = await supabase.from("saved_searches").insert({
      user_id: userId, name: duplicateName(search.name, copy.savedSearch, copy.copySuffix), center_lat: search.center_lat,
      center_long: search.center_long, radius_km: search.radius_km, min_rent: search.min_rent, max_rent: search.max_rent,
      tenant_type: validSearchTenant(search.tenant_type) ? search.tenant_type : null, min_bedrooms: search.min_bedrooms,
    });
    if (error) { setStatus(error.message.toLowerCase().includes("saved search limit reached") ? copy.limitError : copy.duplicateError); setBusyAction(null); return; }
    setStatus(copy.duplicated); setBusyAction(null); router.refresh();
  }

  async function remove() {
    if (!window.confirm(formatWorkflowText(copy.deleteConfirm, { title: displayTitle }))) return;
    setBusyAction("delete"); setStatus(null);
    const { error } = await supabase.from("saved_searches").delete().eq("id", search.id).eq("user_id", userId);
    if (error) { setStatus(copy.deleteError); setBusyAction(null); return; }
    router.refresh();
  }

  const currentMatchText = matchState ? formatWorkflowText(matchState.currentCount === 1 ? copy.currentMatchOne : copy.currentMatchMany, { count: formatNumber(matchState.currentCount) }) : "";
  const newMatchText = matchState ? formatWorkflowText(copy.newSinceChange, { count: formatNumber(matchState.newCount) }) : "";

  return (
    <div className={`saved-search-card${editing ? " is-editing" : ""}${hasNewMatches ? " has-new-matches" : ""}`}>
      <div className="saved-search-copy">
        <strong>{displayTitle}</strong><span>{displayArea}</span><small>{displayFilters}</small>
        {requiresTenantType ? (
          <div className={styles.state} aria-label={decisionCopy.requiredTenant}>
            <span className={`${styles.pill} ${styles.newPill}`}>{decisionCopy.requiredTenant}</span>
            <span className={styles.muted}>{decisionCopy.requiredTenantHint}</span>
          </div>
        ) : matchState ? (
          <div className={styles.state} aria-label={copy.currentMatchesAria}>
            <span className={styles.pill}>{currentMatchText}</span>
            {matchState.newCount > 0 ? <span className={`${styles.pill} ${styles.newPill}`}>{newMatchText}</span> : <span className={styles.muted}>{copy.noNew}</span>}
          </div>
        ) : <span className={styles.muted}>{copy.unavailable}</span>}
      </div>

      {editing ? (
        <form className="saved-search-edit-form" onSubmit={(event) => { event.preventDefault(); void saveChanges(); }}>
          <div className="saved-search-edit-grid">
            <label className="saved-search-edit-field saved-search-edit-name"><span>{copy.searchName}</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required /></label>
            <label className="saved-search-edit-field"><span>{copy.radius}</span><input type="number" min={MIN_RENTER_SEARCH_RADIUS_KM} max={MAX_RENTER_SEARCH_RADIUS_KM} step="0.5" value={radiusKm} onChange={(event) => setRadiusKm(event.target.value)} placeholder={DEFAULT_RENTER_SEARCH_RADIUS} required /></label>
            <label className="saved-search-edit-field"><span>{copy.minimumRent}</span><input type="number" min="0" max={MAX_RENTER_SEARCH_RENT_BDT} step="500" value={minRent} onChange={(event) => setMinRent(event.target.value)} placeholder={copy.any} /></label>
            <label className="saved-search-edit-field"><span>{copy.maximumRent}</span><input type="number" min="0" max={MAX_RENTER_SEARCH_RENT_BDT} step="500" value={maxRent} onChange={(event) => setMaxRent(event.target.value)} placeholder={copy.any} /></label>
            <label className="saved-search-edit-field"><span>{copy.renterType}</span><select value={tenantType} onChange={(event) => setTenantType(event.target.value as SearchTenantType | "")} required><option value="" disabled>{decisionCopy.chooseTenant}</option>{SEARCH_TENANT_TYPES.map((value) => <option key={value} value={value}>{tenantLabels[value]}</option>)}</select></label>
            <label className="saved-search-edit-field"><span>{copy.minimumBedrooms}</span><input type="number" min="0" max={MAX_RENTER_SEARCH_BEDROOMS} step="1" value={bedrooms} onChange={(event) => setBedrooms(event.target.value)} placeholder={copy.any} /></label>
          </div>
          <p className="form-hint">{requiresTenantType ? decisionCopy.requiredTenantHint : copy.editHint}</p>
          <div className="saved-search-edit-actions"><button className="primary-button" type="submit" disabled={busyAction !== null}>{busyAction === "save" ? copy.saving : copy.saveChanges}</button><button className="text-button" type="button" onClick={() => { resetForm(); setEditing(false); }} disabled={busyAction !== null}>{copy.cancel}</button></div>
          {status && <div className="saved-search-status" role="status" aria-live="polite">{status}</div>}
        </form>
      ) : (
        <div className="saved-search-controls">
          <div className="saved-search-actions">
            {requiresTenantType ? (
              <button className="primary-button" type="button" onClick={() => { setStatus(null); setEditing(true); }}>{decisionCopy.editTenant}</button>
            ) : (
              <Link className="primary-button link-button" href={runHref}>{hasNewMatches ? formatWorkflowText(matchState!.newCount === 1 ? copy.viewNewMatchOne : copy.viewNewMatchMany, { count: formatNumber(matchState!.newCount) }) : copy.runSearch}</Link>
            )}
            <button className="secondary-button" type="button" onClick={() => { setStatus(null); setEditing(true); }} disabled={busyAction !== null}>{copy.edit}</button>
            <button className="text-button" type="button" onClick={() => void duplicate()} disabled={busyAction !== null}>{busyAction === "duplicate" ? copy.duplicating : copy.duplicate}</button>
            <button className="text-button" type="button" onClick={() => void remove()} disabled={busyAction !== null}>{busyAction === "delete" ? copy.deleting : copy.delete}</button>
          </div>
          {status && <div className="saved-search-status" role="status" aria-live="polite">{status}</div>}
        </div>
      )}
    </div>
  );
}
