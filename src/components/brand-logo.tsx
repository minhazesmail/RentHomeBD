import Image from "next/image";
import Link from "next/link";

import styles from "./brand-logo.module.css";

export function BrandLogo({ className = "" }: { className?: string }) {
  const classes = ["brand-logo", styles.logo, className].filter(Boolean).join(" ");

  return (
    <Link className={classes} href="/" aria-label="NearBasha home">
      <span className={styles.glow} aria-hidden="true"><span className={styles.edge} /></span>
      <Image src="/nearbasha-logo.svg" alt="NearBasha" width={1560} height={310} priority />
    </Link>
  );
}
