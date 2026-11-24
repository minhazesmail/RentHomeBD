"use client";

import { createContext, useContext, useEffect, useState, type ReactNode, type RefObject } from "react";
import { useLocale } from "@/i18n/use-locale";
import { getLandingRedesignCopy } from "@/i18n/landing-redesign-copy";
import { resolveExactLocationPreset } from "@/lib/location-presets";
import { DEFAULT_RENTER_SEARCH_RADIUS } from "@/lib/search-defaults";
import { buildHomesHref, isCustomBudgetReady, type SearchTenantType } from "@/lib/landing-search";

function useLandingSearchModel() {
  const { dictionary } = useLocale();
  const [areaQuery, setAreaQuery] = useState("");
  const [area, setArea] = useState("");
  const [tenant, setTenant] = useState<SearchTenantType | "">("");
  const [budgetChoice, setBudgetChoice] = useState("");
  const [customBudget, setCustomBudget] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [radius, setRadius] = useState(String(DEFAULT_RENTER_SEARCH_RADIUS));

  function changeArea(value: string) {
    setAreaQuery(value);
    setArea(resolveExactLocationPreset(value)?.label ?? "");
  }

  function chooseArea(label: string, displayLabel: string) {
    setArea(label);
    setAreaQuery(displayLabel);
  }

  const maxRent = budgetChoice === "custom" ? customBudget.trim() : budgetChoice;
  const customBudgetReady = isCustomBudgetReady(budgetChoice, customBudget);
  const mapReady = Boolean(area && tenant && customBudgetReady);
  const mapHref = buildHomesHref({ area, tenant, maxRent: customBudgetReady ? maxRent : "", bedrooms, radius });
  const tenantOptions: { value: SearchTenantType; label: string }[] = [
    { value: "family", label: dictionary.common.tenant.family },
    { value: "bachelor", label: dictionary.common.tenant.bachelor },
    { value: "student", label: dictionary.common.tenant.student },
    { value: "job_holder", label: dictionary.common.tenant.jobHolder },
  ];

  return { areaQuery, area, tenant, setTenant, budgetChoice, setBudgetChoice, customBudget, setCustomBudget,
    bedrooms, setBedrooms, radius, setRadius, changeArea, chooseArea, maxRent, customBudgetReady, mapReady, mapHref, tenantOptions };
}

const LandingSearchContext = createContext<ReturnType<typeof useLandingSearchModel> | null>(null);

export function LandingSearchProvider({ children }: { children: ReactNode }) {
  const model = useLandingSearchModel();
  return <LandingSearchContext.Provider value={model}>{children}</LandingSearchContext.Provider>;
}

export function useLandingSearch(areaInputRef: RefObject<HTMLInputElement | null>) {
  const model = useContext(LandingSearchContext);
  if (!model) throw new Error("LandingSearchProvider is required");
  const { locale } = useLocale();
  const { area, areaQuery } = model;
  const unsupportedArea = getLandingRedesignCopy(locale).hero.unsupportedArea;
  // Each responsive form owns its DOM element, but validity follows shared state.
  useEffect(() => {
    areaInputRef.current?.setCustomValidity(areaQuery.trim() && !area ? unsupportedArea : "");
  }, [area, areaQuery, areaInputRef, unsupportedArea]);
  return model;
}
