import styles from "./glass-atmosphere.module.css";

// Static brand background on marketing pages only; no scroll or resize listeners.
export function GlassAtmosphere() {
  return <div className={styles.canvas} aria-hidden="true" data-glass-atmosphere>
    <span className={styles.jade} />
    <span className={styles.amber} />
    <span className={styles.arc} />
  </div>;
}
