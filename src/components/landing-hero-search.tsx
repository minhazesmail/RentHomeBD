"use client";

import Link from "next/link";
import { ArrowRight, Banknote, BedDouble, MapPin, Search, ShieldCheck, SlidersHorizontal, Users } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { formatCurrency, formatNumber } from "@/i18n/format";
import { getLandingRedesignCopy } from "@/i18n/landing-redesign-copy";
import { interpolate, localizeLocationLabel } from "@/i18n/presentation";
import { useLocale } from "@/i18n/use-locale";
import { LOCATION_PRESETS } from "@/lib/location-presets";
import { DEFAULT_RENTER_SEARCH_RADIUS } from "@/lib/search-defaults";
import type { TenantType } from "@/lib/tenant-match";

type SearchTenantType = Exclude<TenantType, "everyone">;

type LandingHeroSearchProps = {
  children: ReactNode;
};

const BUDGET_PRESETS = [15_000, 25_000, 40_000, 60_000] as const;
const POPULAR_AREAS = ["Dhanmondi", "Banani", "Uttara", "BUET"] as const;

function buildHomesHref({
  area,
  tenant,
  maxRent,
  bedrooms,
}: {
  area: string;
  tenant: SearchTenantType | "";
  maxRent: string;
  bedrooms: string;
}) {
  const params = new URLSearchParams();
  if (area) params.set("area", area);
  if (tenant) params.set("tenant", tenant);
  if (maxRent) params.set("maxRent", maxRent);
  if (bedrooms) params.set("bedrooms", bedrooms);
  params.set("radius", DEFAULT_RENTER_SEARCH_RADIUS);
  return `/homes?${params.toString()}`;
}

export function LandingHeroSearch({ children }: LandingHeroSearchProps) {
  const { locale, dictionary } = useLocale();
  const copy = getLandingRedesignCopy(locale).hero;
  const [area, setArea] = useState("");
  const [tenant, setTenant] = useState<SearchTenantType | "">("");
  const [budgetChoice, setBudgetChoice] = useState("");
  const [customBudget, setCustomBudget] = useState("");
  const [bedrooms, setBedrooms] = useState("");

  const maxRent = budgetChoice === "custom" ? customBudget.trim() : budgetChoice;
  const mapReady = Boolean(area && tenant);
  const mapHref = useMemo(
    () => buildHomesHref({ area, tenant, maxRent, bedrooms }),
    [area, bedrooms, maxRent, tenant],
  );

  const tenantOptions: { value: SearchTenantType; label: string }[] = [
    { value: "family", label: dictionary.common.tenant.family },
    { value: "bachelor", label: dictionary.common.tenant.bachelor },
    { value: "student", label: dictionary.common.tenant.student },
    { value: "job_holder", label: dictionary.common.tenant.jobHolder },
  ];

  const popularLabels: Record<(typeof POPULAR_AREAS)[number], string> = {
    Dhanmondi: dictionary.common.locations.dhanmondi,
    Banani: dictionary.common.locations.banani,
    Uttara: dictionary.common.locations.uttara,
    BUET: dictionary.common.locations.nearBuet,
  };

  return (
    <section className="landing-hero landing-hero-reference" data-scroll-theme="hero">
      <div className="landing-copy">
        <div className="landing-live-kicker"><span aria-hidden="true" />{copy.kicker}</div>
        <h1>{copy.title}</h1>
        <p className="intro">{copy.description}</p>

        <form className="landing-search-console" action="/homes" method="get" role="search">
          <div className="landing-search-console-heading">
            <div><span>{copy.searchKicker}</span><strong>{copy.searchTitle}</strong></div>
            <ShieldCheck aria-label={copy.moderatedListings} />
          </div>

          <div className="landing-search-console-fields">
            <label className="landing-search-console-field landing-search-console-area">
              <MapPin aria-hidden="true" />
              <span>{copy.areaLabel}</span>
              <select
                name="area"
                value={area}
                onChange={(event) => setArea(event.target.value)}
                required
                aria-describedby="landing-search-help"
              >
                <option value="" disabled>{copy.chooseLocation}</option>
                {LOCATION_PRESETS.map((location) => (
                  <option key={location.label} value={location.label}>{localizeLocationLabel(location.label, dictionary)}</option>
                ))}
              </select>
            </label>

            <label className="landing-search-console-field landing-search-console-tenant">
              <Users aria-hidden="true" />
              <span>{copy.tenantLabel}</span>
              <select
                name="tenant"
                value={tenant}
                onChange={(event) => setTenant(event.target.value as SearchTenantType | "")}
                required
                aria-describedby="landing-search-help"
              >
                <option value="" disabled>{copy.chooseTenant}</option>
                {tenantOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>

            <label className="landing-search-console-field landing-search-console-budget">
              <Banknote aria-hidden="true" />
              <span>{copy.budgetLabel}</span>
              <select value={budgetChoice} onChange={(event) => setBudgetChoice(event.target.value)}>
                <option value="">{copy.anyBudget}</option>
                {BUDGET_PRESETS.map((amount) => (
                  <option value={String(amount)} key={amount}>{copy.upTo} {formatCurrency(amount, locale)}</option>
                ))}
                <option value="custom">{copy.customBudget}</option>
              </select>
            </label>

            <button className="landing-search-submit" type="submit">
              <Search aria-hidden="true" />
              <span>{copy.findHomes}</span>
              <ArrowRight aria-hidden="true" />
            </button>

            {budgetChoice === "custom" && (
              <label className="landing-search-console-field landing-search-budget-custom">
                <Banknote aria-hidden="true" />
                <span>{copy.customBudgetLabel}</span>
                <input
                  type="number"
                  value={customBudget}
                  onChange={(event) => setCustomBudget(event.target.value)}
                  min="1000"
                  max="10000000"
                  step="500"
                  inputMode="numeric"
                  placeholder={copy.customBudgetPlaceholder}
                  required
                />
              </label>
            )}
          </div>

          {maxRent && <input type="hidden" name="maxRent" value={maxRent} />}
          <input type="hidden" name="radius" value={DEFAULT_RENTER_SEARCH_RADIUS} />

          <details className="landing-search-more">
            <summary><SlidersHorizontal aria-hidden="true" /><span>{copy.moreFilters}</span></summary>
            <div className="landing-search-more-panel">
              <label className="landing-search-console-field landing-search-bedroom-field">
                <BedDouble aria-hidden="true" />
                <span>{copy.bedroomsLabel}</span>
                <select name="bedrooms" value={bedrooms} onChange={(event) => setBedrooms(event.target.value)}>
                  <option value="">{copy.anySize}</option>
                  <option value="1">{copy.bedroomOne}</option>
                  {[2, 3].map((count) => (
                    <option value={String(count)} key={count}>
                      {interpolate(copy.bedroomMany, { count: formatNumber(count, locale, { useGrouping: false }) })}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </details>

          <p className="landing-search-help" id="landing-search-help">{copy.searchHelp}</p>
        </form>

        <div className="landing-popular-searches">
          <div className="landing-popular-heading"><span>{copy.popular}</span><small>{copy.popularHint}</small></div>
          <div className="landing-popular-actions">
            {POPULAR_AREAS.map((popularArea) => (
              <button
                type="button"
                key={popularArea}
                className={area === popularArea ? "is-selected" : undefined}
                aria-pressed={area === popularArea}
                onClick={() => setArea(popularArea)}
              >
                {popularLabels[popularArea]}
              </button>
            ))}
          </div>
        </div>

        <div className="landing-confidence-row" aria-label={copy.safeguardsAria}>
          <div><strong>{copy.exactPinsTitle}</strong><span>{copy.exactPinsDescription}</span></div>
          <div><strong>{copy.renterFitTitle}</strong><span>{copy.renterFitDescription}</span></div>
          <div><strong>{copy.freshnessTitle}</strong><span>{copy.freshnessDescription}</span></div>
        </div>
      </div>

      <div className="landing-visual">
        <div className="landing-map-caption">
          <span className="landing-map-caption-dot" aria-hidden="true" />
          <div><strong>{copy.mapTitle}</strong><small>{copy.mapDescription}</small></div>
          {mapReady ? (
            <Link href={mapHref}>{copy.exploreArea} <ArrowRight aria-hidden="true" /></Link>
          ) : (
            <span className="landing-map-caption-disabled" aria-disabled="true" title={copy.exploreAreaUnavailable}>
              {copy.exploreArea} <ArrowRight aria-hidden="true" />
            </span>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}
