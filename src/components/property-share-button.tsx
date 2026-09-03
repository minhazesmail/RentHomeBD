"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

import styles from "./property-share-button.module.css";

export function PropertyShareButton({ title }: { title: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  async function shareProperty() {
    const url = `${window.location.origin}${window.location.pathname}`;
    const shareData = { title, text: `Take a look at ${title} on NearBasha.`, url };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        setStatus("idle");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 2200);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className={styles.wrapper}>
      <button className={`secondary-button ${styles.button}`} type="button" onClick={shareProperty}>
        {status === "copied" ? <Check size={16} aria-hidden="true" /> : <Share2 size={16} aria-hidden="true" />}
        {status === "copied" ? "Link copied" : "Share"}
      </button>
      <span className={styles.status} role="status" aria-live="polite">
        {status === "error" ? "Could not copy the link. Copy this page URL from your browser instead." : ""}
      </span>
    </div>
  );
}
