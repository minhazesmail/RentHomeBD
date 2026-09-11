"use client";

import { Check, GitCompareArrows, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { SaveHomeButton } from "@/components/save-home-button";
import { useLocale } from "@/i18n/use-locale";
import { formatWorkflowText, getWorkflowCopy } from "@/i18n/workflow-copy";
import styles from "./saved-homes-workspace.module.css";

export type SavedHome = {
  id: string;
  title: string;
  address: string;
  rentBdt: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sizeSqft: number | null;
  propertyType: string;
  furnishing: string;
  renterFit: string[];
  coverUrl: string | null;
};

type Props = {
  userId: string;
  homes: SavedHome[];
  unavailablePropertyIds: string[];
};

const MAX_COMPARE = 4;

export function SavedHomesWorkspace({ userId, homes, unavailablePropertyIds }: Props) {
  const { locale, formatCurrency, formatNumber } = useLocale();
  const copy = getWorkflowCopy(locale).saved.homes;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);

  const rentLabel = (value: number | null) => value == null ? copy.rentOnRequest : `${formatCurrency(value)}${copy.perMonth}`;
  const valueLabel = (value: number | null, suffix = "") => value == null ? "—" : `${formatNumber(value)}${suffix}`;

  const selectedHomes = useMemo(
    () => selectedIds.map((id) => homes.find((home) => home.id === id)).filter((home): home is SavedHome => Boolean(home)),
    [homes, selectedIds],
  );

  function toggleCompare(id: string) {
    setSelectedIds((current) => {
      if (current.includes(id)) {
        const next = current.filter((item) => item !== id);
        if (next.length < 2) setComparisonOpen(false);
        return next;
      }
      if (current.length >= MAX_COMPARE) return current;
      return [...current, id];
    });
  }

  function clearComparison() {
    setSelectedIds([]);
    setComparisonOpen(false);
  }

  return (
    <div className={`${styles.workspace}${selectedIds.length ? ` ${styles.hasSelection}` : ""}`}>
      {homes.length ? (
        <>
          <div className={styles.toolbar}>
            <div>
              <GitCompareArrows aria-hidden="true" />
              <div><strong>{copy.compareTitle}</strong><span>{copy.compareHint}</span></div>
            </div>
            <span>{formatWorkflowText(copy.selectedCount, { count: formatNumber(selectedIds.length), max: formatNumber(MAX_COMPARE) })}</span>
          </div>

          <div className={styles.grid}>
            {homes.map((home) => {
              const selected = selectedIds.includes(home.id);
              const compareDisabled = !selected && selectedIds.length >= MAX_COMPARE;
              return (
                <article className={`${styles.card}${selected ? ` ${styles.selected}` : ""}`} key={home.id}>
                  <label className={styles.compareControl}>
                    <input type="checkbox" checked={selected} disabled={compareDisabled} onChange={() => toggleCompare(home.id)} />
                    <span><Check aria-hidden="true" />{copy.compare}</span>
                  </label>

                  <Link className={styles.cardLink} href={`/homes/${home.id}`}>
                    <div className={styles.media} aria-hidden={!home.coverUrl}>
                      {home.coverUrl ? <img src={home.coverUrl} alt="" loading="lazy" /> : <span>{copy.noPhoto}</span>}
                    </div>
                    <div className={styles.copy}>
                      <div className={styles.heading}>
                        <strong>{home.title}</strong>
                        <span>{home.address}</span>
                      </div>
                      <div className={styles.price}>{rentLabel(home.rentBdt)}</div>
                      <div className={styles.metadata} aria-label={copy.detailsAria}>
                        <span><b>{home.bedrooms == null ? "—" : formatNumber(home.bedrooms)}</b> {copy.bed}</span>
                        <span><b>{home.bathrooms == null ? "—" : formatNumber(home.bathrooms)}</b> {copy.bath}</span>
                        <span><b>{home.sizeSqft ? formatNumber(home.sizeSqft) : "—"}</b> {copy.sqFt}</span>
                      </div>
                      <div className={styles.fit}>{home.renterFit.length ? home.renterFit.join(" · ") : copy.renterFitUnspecified}</div>
                    </div>
                  </Link>

                  <div className={styles.saveControl}>
                    <SaveHomeButton propertyId={home.id} userId={userId} initialSaved compact />
                  </div>
                </article>
              );
            })}
          </div>

          {comparisonOpen && selectedHomes.length >= 2 && (
            <section className={styles.comparison} aria-labelledby="saved-comparison-heading">
              <div className={styles.comparisonHeader}>
                <div><span>{copy.comparisonEyebrow}</span><h3 id="saved-comparison-heading">{copy.comparisonTitle}</h3></div>
                <button type="button" className="text-button" onClick={() => setComparisonOpen(false)}>{copy.closeComparison}</button>
              </div>
              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">{copy.detail}</th>
                      {selectedHomes.map((home) => (
                        <th scope="col" key={home.id}>
                          <div className={styles.tableHomeTitle}>
                            <Link href={`/homes/${home.id}`}>{home.title}</Link>
                            <button type="button" onClick={() => toggleCompare(home.id)} aria-label={formatWorkflowText(copy.removeFromComparison, { title: home.title })}><X aria-hidden="true" /></button>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr><th scope="row">{copy.monthlyRent}</th>{selectedHomes.map((home) => <td key={home.id}>{rentLabel(home.rentBdt)}</td>)}</tr>
                    <tr><th scope="row">{copy.location}</th>{selectedHomes.map((home) => <td key={home.id}>{home.address}</td>)}</tr>
                    <tr><th scope="row">{copy.bedrooms}</th>{selectedHomes.map((home) => <td key={home.id}>{valueLabel(home.bedrooms)}</td>)}</tr>
                    <tr><th scope="row">{copy.bathrooms}</th>{selectedHomes.map((home) => <td key={home.id}>{valueLabel(home.bathrooms)}</td>)}</tr>
                    <tr><th scope="row">{copy.size}</th>{selectedHomes.map((home) => <td key={home.id}>{valueLabel(home.sizeSqft, ` ${copy.sqFt}`)}</td>)}</tr>
                    <tr><th scope="row">{copy.propertyType}</th>{selectedHomes.map((home) => <td key={home.id}>{home.propertyType}</td>)}</tr>
                    <tr><th scope="row">{copy.furnishing}</th>{selectedHomes.map((home) => <td key={home.id}>{home.furnishing}</td>)}</tr>
                    <tr><th scope="row">{copy.renterFit}</th>{selectedHomes.map((home) => <td key={home.id}>{home.renterFit.length ? home.renterFit.join(", ") : copy.notSpecified}</td>)}</tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {selectedIds.length > 0 && (
            <div className={styles.tray} role="status" aria-live="polite">
              <div>
                <GitCompareArrows aria-hidden="true" />
                <strong>{formatWorkflowText(selectedIds.length === 1 ? copy.selectedHomeOne : copy.selectedHomeMany, { count: formatNumber(selectedIds.length) })}</strong>
                <span>{selectedIds.length < 2 ? copy.selectOneMore : formatWorkflowText(copy.compareUpTo, { max: formatNumber(MAX_COMPARE) })}</span>
              </div>
              <div className={styles.trayActions}>
                <button className="text-button" type="button" onClick={clearComparison}>{copy.clear}</button>
                <button className="primary-button" type="button" disabled={selectedIds.length < 2} onClick={() => { setComparisonOpen(true); document.getElementById("saved-comparison-heading")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>{formatWorkflowText(copy.compareCount, { count: formatNumber(selectedIds.length) })}</button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className={styles.empty}>
          <strong>{copy.emptyTitle}</strong>
          <span>{copy.emptyHint}</span>
          <Link className="primary-button link-button" href="/homes">{copy.findHomes}</Link>
        </div>
      )}

      {unavailablePropertyIds.length > 0 && (
        <details className={styles.unavailableShelf}>
          <summary><span>{copy.unavailable}</span><strong>{formatWorkflowText(unavailablePropertyIds.length === 1 ? copy.savedHomeOne : copy.savedHomeMany, { count: formatNumber(unavailablePropertyIds.length) })}</strong><small>{copy.noLongerVisible}</small></summary>
          <div className={styles.unavailableGrid}>
            {unavailablePropertyIds.map((propertyId) => (
              <div key={propertyId}>
                <div><strong>{copy.noLongerAvailable}</strong><span>{copy.archiveHint}</span></div>
                <SaveHomeButton propertyId={propertyId} userId={userId} initialSaved />
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
