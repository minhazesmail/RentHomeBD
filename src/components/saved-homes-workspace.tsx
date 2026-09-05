"use client";

import { Check, GitCompareArrows, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { SaveHomeButton } from "@/components/save-home-button";
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

function rentLabel(value: number | null) {
  return value == null ? "Rent on request" : `৳${value.toLocaleString("en-BD")}/mo`;
}

function valueLabel(value: number | null, suffix = "") {
  return value == null ? "—" : `${value.toLocaleString("en-BD")}${suffix}`;
}

export function SavedHomesWorkspace({ userId, homes, unavailablePropertyIds }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);

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
              <div><strong>Build a shortlist you can compare</strong><span>Select 2–4 homes to compare the details that matter before you contact anyone.</span></div>
            </div>
            <span>{selectedIds.length}/{MAX_COMPARE} selected</span>
          </div>

          <div className={styles.grid}>
            {homes.map((home) => {
              const selected = selectedIds.includes(home.id);
              const compareDisabled = !selected && selectedIds.length >= MAX_COMPARE;
              return (
                <article className={`${styles.card}${selected ? ` ${styles.selected}` : ""}`} key={home.id}>
                  <label className={styles.compareControl}>
                    <input type="checkbox" checked={selected} disabled={compareDisabled} onChange={() => toggleCompare(home.id)} />
                    <span><Check aria-hidden="true" />Compare</span>
                  </label>

                  <Link className={styles.cardLink} href={`/homes/${home.id}`}>
                    <div className={styles.media} aria-hidden={!home.coverUrl}>
                      {home.coverUrl ? <img src={home.coverUrl} alt="" loading="lazy" /> : <span>No photo yet</span>}
                    </div>
                    <div className={styles.copy}>
                      <div className={styles.heading}>
                        <strong>{home.title}</strong>
                        <span>{home.address}</span>
                      </div>
                      <div className={styles.price}>{rentLabel(home.rentBdt)}</div>
                      <div className={styles.metadata} aria-label="Home comparison details">
                        <span><b>{home.bedrooms ?? "—"}</b> bed</span>
                        <span><b>{home.bathrooms ?? "—"}</b> bath</span>
                        <span><b>{home.sizeSqft ? home.sizeSqft.toLocaleString("en-BD") : "—"}</b> sq ft</span>
                      </div>
                      <div className={styles.fit}>{home.renterFit.length ? home.renterFit.join(" · ") : "Renter fit not specified"}</div>
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
                <div><span>Shortlist comparison</span><h3 id="saved-comparison-heading">See the trade-offs side by side.</h3></div>
                <button type="button" className="text-button" onClick={() => setComparisonOpen(false)}>Close comparison</button>
              </div>
              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Detail</th>
                      {selectedHomes.map((home) => (
                        <th scope="col" key={home.id}>
                          <div className={styles.tableHomeTitle}>
                            <Link href={`/homes/${home.id}`}>{home.title}</Link>
                            <button type="button" onClick={() => toggleCompare(home.id)} aria-label={`Remove ${home.title} from comparison`}><X aria-hidden="true" /></button>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr><th scope="row">Monthly rent</th>{selectedHomes.map((home) => <td key={home.id}>{rentLabel(home.rentBdt)}</td>)}</tr>
                    <tr><th scope="row">Location</th>{selectedHomes.map((home) => <td key={home.id}>{home.address}</td>)}</tr>
                    <tr><th scope="row">Bedrooms</th>{selectedHomes.map((home) => <td key={home.id}>{valueLabel(home.bedrooms)}</td>)}</tr>
                    <tr><th scope="row">Bathrooms</th>{selectedHomes.map((home) => <td key={home.id}>{valueLabel(home.bathrooms)}</td>)}</tr>
                    <tr><th scope="row">Size</th>{selectedHomes.map((home) => <td key={home.id}>{valueLabel(home.sizeSqft, " sq ft")}</td>)}</tr>
                    <tr><th scope="row">Property type</th>{selectedHomes.map((home) => <td key={home.id}>{home.propertyType}</td>)}</tr>
                    <tr><th scope="row">Furnishing</th>{selectedHomes.map((home) => <td key={home.id}>{home.furnishing}</td>)}</tr>
                    <tr><th scope="row">Renter fit</th>{selectedHomes.map((home) => <td key={home.id}>{home.renterFit.length ? home.renterFit.join(", ") : "Not specified"}</td>)}</tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {selectedIds.length > 0 && (
            <div className={styles.tray} role="status" aria-live="polite">
              <div>
                <GitCompareArrows aria-hidden="true" />
                <strong>{selectedIds.length} home{selectedIds.length === 1 ? "" : "s"} selected</strong>
                <span>{selectedIds.length < 2 ? "Select one more home to compare." : `Compare up to ${MAX_COMPARE} homes.`}</span>
              </div>
              <div className={styles.trayActions}>
                <button className="text-button" type="button" onClick={clearComparison}>Clear</button>
                <button className="primary-button" type="button" disabled={selectedIds.length < 2} onClick={() => { setComparisonOpen(true); document.getElementById("saved-comparison-heading")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>Compare {selectedIds.length}</button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className={styles.empty}>
          <strong>Your shortlist is ready when you are.</strong>
          <span>Save homes from the live map or a property page, then return here to compare them side by side.</span>
          <Link className="primary-button link-button" href="/homes">Find homes on the map</Link>
        </div>
      )}

      {unavailablePropertyIds.length > 0 && (
        <details className={styles.unavailableShelf}>
          <summary><span>Unavailable</span><strong>{unavailablePropertyIds.length} saved home{unavailablePropertyIds.length === 1 ? "" : "s"}</strong><small>No longer visible to renters</small></summary>
          <div className={styles.unavailableGrid}>
            {unavailablePropertyIds.map((propertyId) => (
              <div key={propertyId}>
                <div><strong>No longer available</strong><span>Keep it archived here or remove it from your saved list.</span></div>
                <SaveHomeButton propertyId={propertyId} userId={userId} initialSaved />
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
