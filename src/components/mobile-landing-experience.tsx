"use client";

import Link from "next/link";
import { LandingMascot } from "./landing-mascot";
import { LandingLiveSearch } from "./landing-live-search";
import mascotStyles from "./landing-mascot.module.css";
import {
  ArrowRight,
  Banknote,
  BedDouble,
  Bookmark,
  Compass,
  Map,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { type FormEvent, useRef, useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { formatCurrency, formatNumber } from "@/i18n/format";
import { getLandingRedesignCopy } from "@/i18n/landing-redesign-copy";
import { localizeLocationLabel } from "@/i18n/presentation";
import { useLocale } from "@/i18n/use-locale";
import { LOCATION_PRESETS } from "@/lib/location-presets";
import { DEFAULT_RENTER_SEARCH_RADIUS } from "@/lib/search-defaults";
import type { TenantType } from "@/lib/tenant-match";
import styles from "./mobile-landing-experience.module.css";

type SearchTenantType = Exclude<TenantType, "everyone">;

const LIST_PROPERTY_HREF = "/login?intent=list-property&next=%2Fowner%2Fproperties%2Fnew";
const BUDGET_PRESETS = [15_000, 25_000, 40_000, 60_000] as const;
const MIN_CUSTOM_BUDGET = 1_000;
const MAX_CUSTOM_BUDGET = 10_000_000;
const CUSTOM_BUDGET_STEP = 500;
const RADIUS_OPTIONS = ["2", "5", "10", "15", "25"] as const;

function normalizeAreaValue(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildHomesHref({
  area,
  tenant,
  maxRent,
  bedrooms,
  radius,
}: {
  area: string;
  tenant: SearchTenantType | "";
  maxRent: string;
  bedrooms: string;
  radius: string;
}) {
  const params = new URLSearchParams();
  if (area) params.set("area", area);
  if (tenant) params.set("tenant", tenant);
  if (maxRent) params.set("maxRent", maxRent);
  if (bedrooms) params.set("bedrooms", bedrooms);
  if (radius) params.set("radius", radius);
  return `/homes?${params.toString()}`;
}

export function MobileLandingExperience() {
  const { locale, dictionary, setLocale } = useLocale();
  const copy = getLandingRedesignCopy(locale).hero;
  const areaInputRef = useRef<HTMLInputElement>(null);
  const tenantSelectRef = useRef<HTMLSelectElement>(null);

  const [areaQuery, setAreaQuery] = useState("");
  const [area, setArea] = useState("");
  const [tenant, setTenant] = useState<SearchTenantType | "">("");
  const [budgetChoice, setBudgetChoice] = useState("");
  const [customBudget, setCustomBudget] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [radius, setRadius] = useState(String(DEFAULT_RENTER_SEARCH_RADIUS));
  const [searchError, setSearchError] = useState("");

  const tenantOptions: { value: SearchTenantType; label: string }[] = [
    { value: "family", label: dictionary.common.tenant.family },
    { value: "bachelor", label: dictionary.common.tenant.bachelor },
    { value: "student", label: dictionary.common.tenant.student },
    { value: "job_holder", label: dictionary.common.tenant.jobHolder },
  ];

  const popularLocations = LOCATION_PRESETS.slice(0, 6);

  function findSupportedArea(value: string) {
    const query = normalizeAreaValue(value);
    if (!query) return undefined;

    return LOCATION_PRESETS.find((location) => {
      const candidates = [
        location.label,
        localizeLocationLabel(location.label, dictionary),
        ...(location.aliases ?? []),
      ];
      return candidates.some((candidate) => normalizeAreaValue(candidate) === query);
    });
  }

  function handleAreaChange(value: string, input: HTMLInputElement) {
    const match = findSupportedArea(value);
    setAreaQuery(value);
    setArea(match?.label ?? "");
    setSearchError("");
    input.setCustomValidity(value.trim() && !match ? copy.unsupportedArea : "");
  }

  function choosePopularArea(label: string) {
    const localized = localizeLocationLabel(label, dictionary);
    setArea(label);
    setAreaQuery(localized);
    setSearchError("");
    areaInputRef.current?.setCustomValidity("");
  }

  const maxRent = budgetChoice === "custom" ? customBudget.trim() : budgetChoice;
  const customBudgetNumber = Number(customBudget);
  const customBudgetReady = budgetChoice !== "custom" || (
    customBudget.trim().length > 0
    && Number.isFinite(customBudgetNumber)
    && customBudgetNumber >= MIN_CUSTOM_BUDGET
    && customBudgetNumber <= MAX_CUSTOM_BUDGET
    && (customBudgetNumber - MIN_CUSTOM_BUDGET) % CUSTOM_BUDGET_STEP === 0
  );
  const mapHref = buildHomesHref({ area, tenant, maxRent: customBudgetReady ? maxRent : "", bedrooms, radius });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const input = areaInputRef.current;
    const match = findSupportedArea(areaQuery);

    if (!areaQuery.trim() || !match) {
      event.preventDefault();
      if (input) {
        input.setCustomValidity(areaQuery.trim() ? copy.unsupportedArea : copy.chooseLocation);
        input.reportValidity();
        input.focus();
      }
      return;
    }

    if (!tenant) {
      event.preventDefault();
      setSearchError(copy.mobileTenantRequired);
      tenantSelectRef.current?.focus();
      return;
    }

    if (!customBudgetReady) {
      event.preventDefault();
      setSearchError(copy.mobileBudgetInvalid);
      document.querySelector<HTMLInputElement>("[data-mobile-custom-budget]")?.focus();
      return;
    }

    setSearchError("");
  }

  return (
    <div className={styles.root} data-mobile-concept-landing>
      <header className={styles.appBar}>
        <BrandLogo className={styles.logo} />
        <div className={styles.appBarActions}>
          <button
            className={styles.languageButton}
            type="button"
            onClick={() => setLocale(locale === "en" ? "bn" : "en")}
            aria-label={locale === "en" ? dictionary.common.switchToBangla : dictionary.common.switchToEnglish}
          >
            {locale === "en" ? "বাংলা" : "EN"}
          </button>
          <div className={styles.themeControl}><ThemeSwitcher compact /></div>
          <Link className={styles.listTopButton} href={LIST_PROPERTY_HREF} aria-label={dictionary.navigation.listProperty}>
            <Plus aria-hidden="true" />
            <span>{dictionary.navigation.listProperty}</span>
          </Link>
        </div>
      </header>

      <main className={styles.appMain}>
        <section className={styles.heroPanel} aria-labelledby="mobile-app-heading">
          <div className={styles.heroGlow} aria-hidden="true" />
          <div className={styles.heroBadge}><span aria-hidden="true" />{copy.kicker}</div>
          <div className={styles.heroText}>
            <h1 id="mobile-app-heading" className={mascotStyles.headline}>
              <span>{copy.mobileTitleLead}</span>
                <strong>{copy.mobileTitleAccent}</strong>
                <LandingMascot />
            </h1>
            <p>{copy.description}</p>
            <LandingLiveSearch />
          </div>
          <div className={styles.heroSignals} aria-label={copy.mobileSignalsAria}>
            <span><MapPin aria-hidden="true" />{copy.mobileDhakaFocused}</span>
            <span><ShieldCheck aria-hidden="true" />{copy.mobileTenantAware}</span>
          </div>
        </section>

        <form className={styles.searchCard} action="/homes" method="get" role="search" data-mobile-entry-search onSubmit={handleSubmit}>
          <div className={styles.searchHeader}>
            <div>
              <span>{copy.searchKicker}</span>
              <h2>{copy.searchTitle}</h2>
              <p>{copy.mobileSearchSubtitle}</p>
            </div>
            <div className={styles.verifiedBadge} title={copy.moderatedListings}><ShieldCheck aria-hidden="true" /></div>
          </div>

          <div className={styles.primaryFields}>
            <label className={styles.areaField} data-mobile-search-field="area">
              <MapPin aria-hidden="true" />
              <div>
                <span>{copy.areaLabel}</span>
                <input
                  ref={areaInputRef}
                  type="search"
                  value={areaQuery}
                  onChange={(event) => handleAreaChange(event.target.value, event.currentTarget)}
                  list="mobile-app-location-options"
                  placeholder={copy.mobileLocationPlaceholder}
                  autoComplete="off"
                  required
                  aria-describedby="mobile-search-help"
                />
              </div>
              <Search aria-hidden="true" />
              <datalist id="mobile-app-location-options">
                {LOCATION_PRESETS.map((location) => (
                  <option key={location.label} value={localizeLocationLabel(location.label, dictionary)} />
                ))}
              </datalist>
            </label>

            <label className={styles.primaryField} data-mobile-search-field="tenant">
              <span className={styles.fieldIcon}><Users aria-hidden="true" /></span>
              <span className={styles.fieldBody}>
                <span className={styles.fieldLabelRow}>
                  <span>{copy.tenantLabel}</span>
                  <small>{copy.requiredLabel}</small>
                </span>
                <select
                  ref={tenantSelectRef}
                  name="tenant"
                  value={tenant}
                  onChange={(event) => {
                    setTenant(event.target.value as SearchTenantType | "");
                    setSearchError("");
                  }}
                  required
                  aria-describedby="mobile-search-help"
                >
                  <option value="" disabled>{copy.chooseTenant}</option>
                  {tenantOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </span>
            </label>

            <label className={styles.primaryField} data-mobile-search-field="budget">
              <span className={styles.fieldIcon}><Banknote aria-hidden="true" /></span>
              <span className={styles.fieldBody}>
                <span className={styles.fieldLabelRow}>
                  <span>{copy.budgetLabel}</span>
                  <small>{copy.optionalLabel}</small>
                </span>
                <select value={budgetChoice} onChange={(event) => { setBudgetChoice(event.target.value); setSearchError(""); }}>
                  <option value="">{copy.anyBudget}</option>
                  {BUDGET_PRESETS.map((amount) => (
                    <option key={amount} value={String(amount)}>{copy.upTo} {formatCurrency(amount, locale)}</option>
                  ))}
                  <option value="custom">{copy.customBudget}</option>
                </select>
              </span>
            </label>

            {budgetChoice === "custom" && (
              <label className={styles.customBudgetField}>
                <span>{copy.customBudgetLabel}</span>
                <input
                  data-mobile-custom-budget
                  type="number"
                  value={customBudget}
                  onChange={(event) => { setCustomBudget(event.target.value); setSearchError(""); }}
                  min={MIN_CUSTOM_BUDGET}
                  max={MAX_CUSTOM_BUDGET}
                  step={CUSTOM_BUDGET_STEP}
                  inputMode="numeric"
                  placeholder={copy.customBudgetPlaceholder}
                  required
                />
              </label>
            )}
          </div>

          <input type="hidden" name="area" value={area} />
          {maxRent && customBudgetReady && <input type="hidden" name="maxRent" value={maxRent} />}

          <details className={styles.moreFilters} data-mobile-more-filters>
            <summary>
              <SlidersHorizontal aria-hidden="true" />
              <span>{copy.moreFilters}</span>
              <small>{copy.optionalLabel}</small>
            </summary>
            <div className={styles.morePanel}>
              <label>
                <BedDouble aria-hidden="true" />
                <span>
                  <small>{copy.bedroomsLabel}</small>
                  <select name="bedrooms" value={bedrooms} onChange={(event) => setBedrooms(event.target.value)}>
                    <option value="">{copy.anySize}</option>
                    <option value="1">{copy.bedroomOne}</option>
                    {[2, 3, 4].map((count) => (
                      <option key={count} value={String(count)}>
                        {formatNumber(count, locale, { useGrouping: false })}+ {copy.mobileBedroomShort}
                      </option>
                    ))}
                  </select>
                </span>
              </label>

              <label>
                <Map aria-hidden="true" />
                <span>
                  <small>{copy.radiusLabel}</small>
                  <select name="radius" value={radius} onChange={(event) => setRadius(event.target.value)}>
                    {RADIUS_OPTIONS.map((value) => (
                      <option key={value} value={value}>{formatNumber(Number(value), locale, { useGrouping: false })} {locale === "bn" ? "কিমি" : "km"}</option>
                    ))}
                  </select>
                </span>
              </label>
            </div>
          </details>

          <button className={styles.searchButton} type="submit">
            <Search aria-hidden="true" />
            <span>{copy.findHomes}</span>
            <ArrowRight aria-hidden="true" />
          </button>

          <p className={styles.searchHelp} id="mobile-search-help">{copy.searchHelp}</p>
          <p className={styles.searchError} role="status" aria-live="polite">{searchError}</p>
        </form>

        <section className={styles.popularSection} aria-labelledby="mobile-popular-heading">
          <div className={styles.sectionHeading}>
            <div><span>{copy.popular}</span><h2 id="mobile-popular-heading">{copy.popular}</h2></div>
            <small>{copy.popularHint}</small>
          </div>
          <div className={styles.locationScroller}>
            {popularLocations.map((location) => (
              <button
                type="button"
                key={location.label}
                data-mobile-popular-area={location.label}
                className={area === location.label ? styles.locationSelected : undefined}
                aria-pressed={area === location.label}
                onClick={() => choosePopularArea(location.label)}
              >
                <MapPin aria-hidden="true" />
                <span>{localizeLocationLabel(location.label, dictionary)}</span>
              </button>
            ))}
          </div>
        </section>

        <section className={styles.featureSection} aria-label={copy.safeguardsAria}>
          <div className={styles.sectionHeadingRow}>
            <div>
              <span>{copy.safeguardsAria}</span>
              <h2>{locale === "bn" ? "কম খুঁজুন, ভালোভাবে বাছুন" : "Less hunting. Better matches."}</h2>
            </div>
            <Sparkles aria-hidden="true" />
          </div>
          <div className={styles.featureGrid}>
            <article>
              <span><MapPin aria-hidden="true" /></span>
              <strong>{copy.exactPinsTitle}</strong>
              <p>{copy.exactPinsDescription}</p>
            </article>
            <article>
              <span><Users aria-hidden="true" /></span>
              <strong>{copy.renterFitTitle}</strong>
              <p>{copy.renterFitDescription}</p>
            </article>
            <article>
              <span><ShieldCheck aria-hidden="true" /></span>
              <strong>{copy.freshnessTitle}</strong>
              <p>{copy.freshnessDescription}</p>
            </article>
          </div>
        </section>

        <section className={styles.mapCta}>
          <div className={styles.mapCtaIcon}><Map aria-hidden="true" /></div>
          <div>
            <span>{copy.mapTitle}</span>
            <h2>{locale === "bn" ? "ম্যাপে পুরো এলাকা দেখুন" : "See the neighborhood, not just the listing."}</h2>
            <p>{copy.mapDescription}</p>
          </div>
          <Link href={mapHref} data-mobile-explore-map>
            {copy.exploreArea}<ArrowRight aria-hidden="true" />
          </Link>
        </section>
      </main>

      <nav className={styles.bottomNav} aria-label={dictionary.navigation.productNavigationAria} data-mobile-primary-tabs>
        <Link href="/homes" aria-current="page"><Compass aria-hidden="true" /><span>{dictionary.navigation.explore}</span></Link>
        <Link href="/saved"><Bookmark aria-hidden="true" /><span>{dictionary.navigation.saved}</span></Link>
        <Link href="/messages"><MessageCircle aria-hidden="true" /><span>{dictionary.navigation.messages}</span></Link>
        <Link href="/login"><UserRound aria-hidden="true" /><span>{dictionary.navigation.account}</span></Link>
      </nav>
    </div>
  );
}
