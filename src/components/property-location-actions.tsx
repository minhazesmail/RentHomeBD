import { ExternalLink, Navigation } from "lucide-react";

import styles from "./property-location-actions.module.css";

export function PropertyLocationActions({ latitude, longitude }: { latitude: number; longitude: number }) {
  const destination = `${latitude},${longitude}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
  const openMapUrl = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=18/${latitude}/${longitude}`;

  return (
    <div className={styles.wrapper} aria-label="Property map actions">
      <div className={styles.actions}>
        <a className={`primary-button link-button ${styles.action}`} href={directionsUrl} target="_blank" rel="noreferrer">
          <Navigation size={16} aria-hidden="true" />
          Get directions
        </a>
        <a className={`secondary-button link-button ${styles.action}`} href={openMapUrl} target="_blank" rel="noreferrer">
          <ExternalLink size={16} aria-hidden="true" />
          Open in OpenStreetMap
        </a>
      </div>
      <p className={styles.note}>These actions use the exact location pin supplied with this listing and open an external map service.</p>
    </div>
  );
}
