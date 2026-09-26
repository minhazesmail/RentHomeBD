"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowUpRight, MapPin, Search, X } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useLocale } from "@/i18n/use-locale";
import { localizeLocationLabel } from "@/i18n/presentation";
import { LOCATION_PRESETS, type LocationPreset } from "@/lib/location-presets";
import { createClient } from "@/lib/supabase/client";
import styles from "./landing-live-search.module.css";

type Rental = { id: string; title: string | null; address_text: string | null; rent_bdt: number | null };
type Result = { key: string; rows: Rental[]; error: boolean };
const RADIUS = 5;

export function LandingLiveSearch() {
  const { locale, dictionary, formatCurrency } = useLocale();
  const bn = locale === "bn";
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const supabase = useMemo(() => createClient() as unknown as SupabaseClient, []);
  const normalized = query.trim().toLocaleLowerCase().replace(/\s+/g, " ");
  const label = (area: LocationPreset) => localizeLocationLabel(area.label, dictionary);
  const suggestions = normalized.length < 2 ? [] : LOCATION_PRESETS.filter(area =>
    [area.label, label(area), ...(area.aliases ?? [])].some(value => value.toLocaleLowerCase().includes(normalized)),
  ).slice(0, 4);
  const area = suggestions[Math.max(0, active)];
  const areaLabel = area?.label ?? "";
  const key = `${areaLabel}:${normalized}:${retry}`;
  const current = result?.key === key ? result : null;
  const searching = Boolean(area && !current);
  const href = `/homes?${new URLSearchParams({ area: areaLabel, radius: String(RADIUS) })}`;

  useEffect(() => {
    if (!areaLabel || !open) return;
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(async () => {
      const selected = LOCATION_PRESETS.find(preset => preset.label === areaLabel)!;
      timeout = setTimeout(() => {
        controller.abort();
        setResult({ key, rows: [], error: true });
      }, 12000);
      try {
        const { data, error } = await supabase.rpc("search_available_properties", {
          center_lat: selected.latitude, center_long: selected.longitude, radius_km: RADIUS,
          renter_tenant_type: null, sort_mode: "distance",
        }).limit(3).abortSignal(controller.signal);
        if (!controller.signal.aborted) setResult({ key, rows: (data ?? []) as Rental[], error: Boolean(error) });
      } catch {
        if (!controller.signal.aborted) setResult({ key, rows: [], error: true });
      } finally {
        clearTimeout(timeout);
      }
    }, 300);
    return () => { clearTimeout(timer); clearTimeout(timeout); controller.abort(); };
  }, [areaLabel, key, open, supabase]);

  function choose(preset: LocationPreset) {
    setQuery(label(preset));
    setActive(-1);
    input.current?.focus();
  }

  return (
    <div className={styles.root} data-live-search onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <label className={styles.label} htmlFor={id}>{bn ? "এলাকা লিখুন, বাসা খুঁজুন" : "Your next home starts here"}</label>
      <div className={styles.inputRow}>
        <Search aria-hidden="true" size={19} />
        <input ref={input} id={id} type="search" role="combobox" autoComplete="off" maxLength={100}
          placeholder={bn ? "এলাকা বা বিশ্ববিদ্যালয় খুঁজুন…" : "Search an area or university…"}
          value={query} aria-expanded={open && suggestions.length > 0} aria-autocomplete="list"
          aria-controls={open && normalized.length >= 2 ? `${id}-options` : undefined} aria-describedby={`${id}-help`}
          aria-activedescendant={open && active >= 0 && suggestions[active] ? `${id}-option-${active}` : undefined}
          onFocus={() => setOpen(true)} onChange={event => { setQuery(event.target.value); setActive(-1); setOpen(true); }}
          onKeyDown={event => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === "Escape") { setOpen(false); setActive(-1); }
            if ((event.key === "ArrowDown" || event.key === "ArrowUp") && suggestions.length) {
              event.preventDefault(); setOpen(true);
              setActive(index => (index + (event.key === "ArrowDown" ? 1 : -1) + suggestions.length) % suggestions.length);
            }
            if (event.key === "Enter" && area) { event.preventDefault(); choose(area); setOpen(true); }
          }} />
        {query && <button type="button" className={styles.clear} aria-label={bn ? "খোঁজা মুছুন" : "Clear search"}
          onClick={() => { setQuery(""); setActive(-1); input.current?.focus(); }}><X size={17} aria-hidden="true" /></button>}
      </div>
      <p className={styles.help} id={`${id}-help`}>{bn ? "লিখলেই এলাকার পরামর্শ ও কাছের ভাড়ার বাসা দেখুন।" : "Area suggestions and nearby rentals, as you type."}</p>
      {open && normalized.length >= 2 && <div className={styles.panel}>
        <ul className={styles.suggestions} id={`${id}-options`} role="listbox" aria-label={bn ? "এলাকার পরামর্শ" : "Suggested areas"}>
          {suggestions.map((preset, index) => <li key={preset.label} id={`${id}-option-${index}`} role="option" aria-selected={active === index}
            onMouseDown={event => event.preventDefault()} onClick={() => choose(preset)}>
            <MapPin size={16} aria-hidden="true" /><span>{label(preset)}</span><ArrowUpRight size={15} aria-hidden="true" />
          </li>)}
        </ul>
        {!area && <p className={styles.message}>{bn ? "এই এলাকা পাওয়া যায়নি। ধানমন্ডি, বনানী বা উত্তরা লিখুন।" : "No supported area found. Try Dhanmondi, Banani or Uttara."}</p>}
        {area && <div className={styles.results}>
          <div className={styles.caption}>{bn ? `${label(area)}-এর কাছে · ৫ কিমি` : `Near ${label(area)} · 5 km`}</div>
          <p role="status" className={styles.message}>{searching ? (bn ? "বাসা খোঁজা হচ্ছে…" : "Finding nearby rentals…")
            : current?.error ? (bn ? "এখন বাসা দেখানো যাচ্ছে না। আবার চেষ্টা করুন।" : "Rentals couldn’t load. Please try again.")
            : current?.rows.length ? (bn ? "নিকটতম বাসাগুলো দেখানো হচ্ছে।" : "Showing the nearest available rentals.")
            : (bn ? "এই এলাকায় এখন কোনো ভাড়ার বাসা নেই।" : "No available rentals nearby right now.")}</p>
          {current?.error && <button type="button" className={styles.retry} onClick={() => setRetry(value => value + 1)}>{bn ? "আবার চেষ্টা করুন" : "Try again"}</button>}
          {!current?.error && current?.rows.map(rental => <Link className={styles.rental} key={rental.id} href={`/homes/${rental.id}`}>
            <span><strong>{rental.title || (bn ? "ভাড়ার বাসা" : "Rental home")}</strong><small>{rental.address_text}</small></span>
            <b>{rental.rent_bdt == null ? (bn ? "ভাড়া জানতে যোগাযোগ করুন" : "Rent on request") : formatCurrency(rental.rent_bdt)}<ArrowUpRight size={15} aria-hidden="true" /></b>
          </Link>)}
          <Link className={styles.mapLink} href={href}>{bn ? "ম্যাপে খুঁজুন ও ফিল্টার করুন" : "Explore and filter on the map"}<ArrowUpRight size={16} aria-hidden="true" /></Link>
        </div>}
      </div>}
    </div>
  );
}
