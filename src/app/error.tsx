"use client";

import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import styles from "./recovery.module.css";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className={styles.recoveryShell}>
      <section className={styles.recoveryCard} aria-labelledby="recovery-heading">
        <div className={styles.recoveryContent}>
          <BrandLogo className={styles.recoveryLogo} />
          <p className={styles.recoveryEyebrow}>Something went off route</p>
          <h1 className={styles.recoveryTitle} id="recovery-heading">NearBasha could not load this page.</h1>
          <p className={styles.recoveryCopy}>Your account and saved data have not been changed by this screen. Try loading the page again, or return to the live map and continue from there.</p>
          <div className={styles.recoveryActions}>
            <button className={styles.recoveryPrimary} type="button" onClick={() => reset()}>Try again</button>
            <Link className={styles.recoverySecondary} href="/homes">Open live map</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
