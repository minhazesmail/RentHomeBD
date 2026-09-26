"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./landing-mascot.module.css";

export function LandingMascot() {
  const [ready, setReady] = useState(false);
  return (
    <span className={styles.mascot} aria-hidden="true" data-landing-mascot>
      <Image className={`${styles.figure} ${ready ? styles.ready : ""}`} onLoad={() => setReady(true)} src="/panda-mascot.png" alt="" width={1280} height={1280} loading="eager" sizes="(max-width: 820px) 105px, (max-width: 1100px) 145px, 200px" />
    </span>
  );
}
