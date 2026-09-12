import { ExternalLink, Navigation } from "lucide-react";

import type { Locale } from "@/i18n/config";
import { getPropertyDetailCopy } from "@/i18n/property-detail-copy";
import styles from "./property-location-actions.module.css";

export function PropertyLocationActions({ latitude, longitude, locale }: { latitude: number; longitude: number; locale: Locale }) {
  const copy = getPropertyDetailCopy(locale).location;
  const destination = `${latitude},${longitude}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
  const openMapUrl = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=18/${latitude}/${longitude}`;

  return (
    <div className={styles.wrapper} aria-label={copy.actionsAria}>
      <div className={styles.actions}>
        <a className={`primary-button link-button ${styles.action}`} href={directionsUrl} target="_blank" rel="noreferrer">
          <Navigation size={16} aria-hidden="true" />
          {copy.directions}
        </a>
        <a className={`secondary-button link-button ${styles.action}`} href={openMapUrl} target="_blank" rel="noreferrer">
          <ExternalLink size={16} aria-hidden="true" />
          {copy.openOsm}
        </a>
      </div>
      <p className={styles.note}>{copy.externalNote}</p>
    </div>
  );
}
