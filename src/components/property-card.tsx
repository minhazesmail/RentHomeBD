"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./property-card.module.css";

type PropertyCardClasses = {
  link?: string;
  media?: string;
  body?: string;
};

type PropertyCardProps = {
  href: string;
  imageUrl?: string | null;
  imageAlt?: string;
  imageSizes?: string;
  fallback?: ReactNode;
  children: ReactNode;
  classes?: PropertyCardClasses;
  onMediaError?: () => void;
};

function joinClasses(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function PropertyCard({
  href,
  imageUrl,
  imageAlt = "",
  imageSizes = "(max-width: 900px) 38vw, 240px",
  fallback = "⌂",
  children,
  classes,
  onMediaError,
}: PropertyCardProps) {
  return (
    <Link className={joinClasses(styles.link, classes?.link)} href={href} data-property-card>
      <div className={joinClasses(styles.media, classes?.media)}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={imageAlt}
            width={480}
            height={320}
            sizes={imageSizes}
            onError={onMediaError}
          />
        ) : (
          <span className={styles.fallback} aria-hidden="true">{fallback}</span>
        )}
      </div>
      <div className={joinClasses(styles.body, classes?.body)}>
        {children}
      </div>
    </Link>
  );
}
