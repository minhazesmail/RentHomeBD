"use client";

import { AlertTriangle, LoaderCircle, LocateOff, MapOff, SearchX } from "lucide-react";

import styles from "./search-recovery-state.module.css";

export type SearchRecoveryVariant = "empty" | "error" | "location" | "map" | "slow";

type SearchRecoveryAction = {
  label: string;
  onClick: () => void;
};

type SearchRecoveryStateProps = {
  variant: SearchRecoveryVariant;
  title: string;
  description: string;
  primaryAction?: SearchRecoveryAction;
  secondaryAction?: SearchRecoveryAction;
  compact?: boolean;
};

const icons = {
  empty: SearchX,
  error: AlertTriangle,
  location: LocateOff,
  map: MapOff,
  slow: LoaderCircle,
} as const;

export function SearchRecoveryState({
  variant,
  title,
  description,
  primaryAction,
  secondaryAction,
  compact = false,
}: SearchRecoveryStateProps) {
  const Icon = icons[variant];
  const alert = variant === "error" || variant === "map";

  return (
    <section
      className={`${styles.state} ${styles[variant]}${compact ? ` ${styles.compact}` : ""}`}
      data-search-recovery={variant}
      role={alert ? "alert" : "status"}
      aria-live={alert ? "assertive" : "polite"}
    >
      <span className={styles.icon}><Icon aria-hidden="true" /></span>
      <div className={styles.copy}>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      {(primaryAction || secondaryAction) && (
        <div className={styles.actions}>
          {secondaryAction && <button type="button" className={styles.secondary} onClick={secondaryAction.onClick}>{secondaryAction.label}</button>}
          {primaryAction && <button type="button" className={styles.primary} onClick={primaryAction.onClick}>{primaryAction.label}</button>}
        </div>
      )}
    </section>
  );
}
