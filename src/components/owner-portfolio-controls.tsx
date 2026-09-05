"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

import styles from "./owner-portfolio-controls.module.css";

type Props = {
  query: string;
  status: string;
  sort: string;
  visibleCount: number;
  totalCount: number;
};

const statusTabs = [
  { value: "all", label: "All" },
  { value: "attention", label: "Needs action" },
  { value: "available", label: "Live" },
  { value: "pending_confirmation", label: "Needs confirmation" },
  { value: "rejected", label: "Needs changes" },
  { value: "pending_review", label: "In review" },
  { value: "draft", label: "Drafts" },
  { value: "rented", label: "Rented" },
  { value: "expired", label: "Expired" },
] as const;

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
          <label className="sr-only" htmlFor="owner-portfolio-search">Search properties</label>
          <span className={styles.searchShell}>
            <Search size={16} aria-hidden="true" />
            <input
              key={query}
              id="owner-portfolio-search"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Search title or location"
              maxLength={120}
            />
          </span>
          <button className={styles.searchButton} type="submit">Search</button>
        </form>

        <label className={styles.sortControl}>
          <span>Sort</span>
          <select
            value={sort}
            onChange={(event) => router.push(ownerHref({ query, status, sort: event.target.value }))}
          >
            <option value="updated-desc">Recently updated</option>
            <option value="updated-asc">Oldest updated</option>
            <option value="rent-high">Rent: high to low</option>
            <option value="rent-low">Rent: low to high</option>
            <option value="title">Title A–Z</option>
          </select>
        </label>
      </div>

      <div className={styles.workspaceBottomline}>
        <nav className={styles.statusTabs} aria-label="Filter property portfolio by status">
          {statusTabs.map((tab) => (
            <Link
              key={tab.value}
              className={status === tab.value ? styles.statusActive : styles.statusTab}
              href={ownerHref({ query, status: tab.value, sort })}
              aria-current={status === tab.value ? "page" : undefined}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
        <div className={styles.resultSummary} aria-live="polite">
          <span>Showing {visibleCount} of {totalCount}</span>
          {(query || status !== "all" || sort !== "updated-desc") && (
            <Link href="/owner"><X size={14} aria-hidden="true" /> Clear</Link>
          )}
        </div>
      </div>
    </div>
  );
}
