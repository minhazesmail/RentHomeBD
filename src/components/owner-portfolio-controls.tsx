"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

import { formatOwnerPortfolioText, getOwnerPortfolioCopy } from "@/i18n/owner-portfolio-copy";
import { useLocale } from "@/i18n/use-locale";
import styles from "./owner-portfolio-controls.module.css";

type Props = { query: string; status: string; sort: string; visibleCount: number; totalCount: number };

function ownerHref({ query = "", status = "all", sort = "updated-desc" }: { query?: string; status?: string; sort?: string }) {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (status !== "all") params.set("status", status);
  if (sort !== "updated-desc") params.set("sort", sort);
  const search = params.toString();
  return search ? `/owner?${search}` : "/owner";
}

export function OwnerPortfolioControls({ query, status, sort, visibleCount, totalCount }: Props) {
  const router = useRouter();
  const { locale, formatNumber } = useLocale();
  const copy = getOwnerPortfolioCopy(locale).controls;
  const statusTabs = [
    { value: "all", label: copy.all },
    { value: "attention", label: copy.needsAction },
    { value: "available", label: copy.live },
    { value: "pending_confirmation", label: copy.needsConfirmation },
    { value: "rejected", label: copy.needsChanges },
    { value: "pending_review", label: copy.inReview },
    { value: "draft", label: copy.drafts },
    { value: "rented", label: copy.rented },
    { value: "expired", label: copy.expired },
  ] as const;

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextQuery = String(formData.get("q") ?? "").slice(0, 120);
    router.push(ownerHref({ query: nextQuery, status, sort }));
  }

  return (
    <div className={styles.workspaceControls}>
      <div className={styles.workspaceTopline}>
        <form className={styles.searchForm} onSubmit={submitSearch} role="search">
          <label className="sr-only" htmlFor="owner-portfolio-search">{copy.searchLabel}</label>
          <span className={styles.searchShell}>
            <Search size={16} aria-hidden="true" />
            <input key={query} id="owner-portfolio-search" name="q" type="search" defaultValue={query} placeholder={copy.searchPlaceholder} maxLength={120} />
          </span>
          <button className={styles.searchButton} type="submit">{copy.search}</button>
        </form>

        <label className={styles.sortControl}>
          <span>{copy.sort}</span>
          <select value={sort} onChange={(event) => router.push(ownerHref({ query, status, sort: event.target.value }))}>
            <option value="updated-desc">{copy.recentlyUpdated}</option>
            <option value="updated-asc">{copy.oldestUpdated}</option>
            <option value="rent-high">{copy.rentHigh}</option>
            <option value="rent-low">{copy.rentLow}</option>
            <option value="title">{copy.title}</option>
          </select>
        </label>
      </div>

      <div className={styles.workspaceBottomline}>
        <nav className={styles.statusTabs} aria-label={copy.filtersAria}>
          {statusTabs.map((tab) => (
            <Link key={tab.value} className={status === tab.value ? styles.statusActive : styles.statusTab} href={ownerHref({ query, status: tab.value, sort })} aria-current={status === tab.value ? "page" : undefined}>{tab.label}</Link>
          ))}
        </nav>
        <div className={styles.resultSummary} aria-live="polite">
          <span>{formatOwnerPortfolioText(copy.showing, { visible: formatNumber(visibleCount), total: formatNumber(totalCount) })}</span>
          {(query || status !== "all" || sort !== "updated-desc") && <Link href="/owner"><X size={14} aria-hidden="true" /> {copy.clear}</Link>}
        </div>
      </div>
    </div>
  );
}
