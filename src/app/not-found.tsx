import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import styles from "./recovery.module.css";

export default function NotFound() {
  return (
    <main className={styles.recoveryShell}>
      <section className={styles.recoveryCard} aria-labelledby="not-found-heading">
        <div className={styles.recoveryContent}>
          <BrandLogo className={styles.recoveryLogo} />
          <p className={styles.recoveryEyebrow}>404 · Route not found</p>
          <h1 className={styles.recoveryTitle} id="not-found-heading">This place is not on the map.</h1>
          <p className={styles.recoveryCopy}>The page may have moved, the listing may no longer be available, or the address may be incorrect. You can return to the live Dhaka map or start again from NearBasha.</p>
          <div className={styles.recoveryActions}>
            <Link className={styles.recoveryPrimary} href="/homes">Open live map</Link>
            <Link className={styles.recoverySecondary} href="/">Back to home</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
