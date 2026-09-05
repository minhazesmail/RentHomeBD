import type { ReactNode } from "react";

import { BrandLogo } from "@/components/brand-logo";
import styles from "./recovery-state.module.css";

type RecoveryStateProps = {
  eyebrow: string;
  title: string;
  description: string;
  primaryAction: ReactNode;
  secondaryAction?: ReactNode;
  headingId?: string;
};

export function RecoveryState({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  headingId = "recovery-state-heading",
}: RecoveryStateProps) {
  return (
    <main className={styles.shell}>
      <section className={styles.card} aria-labelledby={headingId}>
        <div className={styles.content}>
          <BrandLogo className={styles.logo} />
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1 className={styles.title} id={headingId}>{title}</h1>
          <p className={styles.copy}>{description}</p>
          <div className={styles.actions}>
            <div className={styles.primary}>{primaryAction}</div>
            {secondaryAction ? <div className={styles.secondary}>{secondaryAction}</div> : null}
          </div>
        </div>
      </section>
    </main>
  );
}
