"use client";

import { useId, useMemo, useState } from "react";
import { useLocale } from "@/i18n/use-locale";
import { localizeLocationLabel } from "@/i18n/presentation";
import { LOCATION_PRESETS, searchLocationPresets } from "@/lib/location-presets";

export function LocationPresetSelect({ value, onChange, disabled, label, placeholder }: {
  value: string; onChange: (value: string) => void; disabled: boolean; label: string; placeholder: string;
}) {
  const id = useId();
  const { locale, dictionary } = useLocale();
  const [query, setQuery] = useState("");
  const bn = locale === "bn";
  const matches = useMemo(() => query.trim() ? searchLocationPresets(query, LOCATION_PRESETS.length) : LOCATION_PRESETS, [query]);
  const groups = new Map<string, typeof LOCATION_PRESETS>();
  for (const location of matches) {
    const group = location.district ?? "";
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(location);
  }
  return <div className="field renter-toolbar-area">
    <label htmlFor={`${id}-area`}>{label}{" · "}<small id={`${id}-count`} role="status">{bn ? `${matches.length.toLocaleString("bn-BD")}টি এলাকা` : `${matches.length} areas`}</small></label>
    <input type="search" value={query} disabled={disabled} maxLength={100}
      aria-label={bn ? "এলাকার তালিকা ফিল্টার করুন" : "Filter areas"}
      placeholder={bn ? "জেলা বা উপজেলা লিখুন" : "Type a district or upazila"}
      onChange={event => setQuery(event.target.value)} aria-describedby={`${id}-count`} />
    <select id={`${id}-area`} value={value} onChange={event => onChange(event.target.value)} disabled={disabled}>
      <option value="">{placeholder}</option>
      {value && !matches.some(location => location.label === value) && <option value={value}>{localizeLocationLabel(value, dictionary)}</option>}
      {[...groups].map(([district, locations]) => <optgroup key={district}
        label={district ? localizeLocationLabel(district, dictionary) : bn ? "এলাকা ও ল্যান্ডমার্ক" : "Neighborhoods & landmarks"}>
        {locations.map(location => <option key={location.label} value={location.label}>{localizeLocationLabel(location.label, dictionary)}</option>)}
      </optgroup>)}
    </select>
  </div>;
}
