"use client";

import Image from "next/image";
import { Camera, ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import styles from "./property-media-gallery.module.css";

export type PropertyGalleryMedia = {
  id: string;
  media_type: "photo" | "video";
  sort_order: number;
  signed_url: string;
};

export function PropertyMediaGallery({ media, propertyTitle }: { media: PropertyGalleryMedia[]; propertyTitle: string }) {
  const orderedMedia = useMemo(() => [...media].sort((a, b) => a.sort_order - b.sort_order), [media]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const lightboxRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);
  const activeItem = activeIndex === null ? null : orderedMedia[activeIndex];

  function openGallery(index: number, trigger: HTMLButtonElement) {
    lastTriggerRef.current = trigger;
    setActiveIndex(index);
  }

  const closeGallery = useCallback(() => {
    setActiveIndex(null);
    window.setTimeout(() => lastTriggerRef.current?.focus(), 0);
  }, []);

  const showPrevious = useCallback(() => {
    setActiveIndex((current) => current === null ? null : (current - 1 + orderedMedia.length) % orderedMedia.length);
  }, [orderedMedia.length]);

  const showNext = useCallback(() => {
    setActiveIndex((current) => current === null ? null : (current + 1) % orderedMedia.length);
  }, [orderedMedia.length]);

  useEffect(() => {
    if (activeIndex === null) return;
    const previousOverflow = document.body.style.getPropertyValue("overflow");
    document.body.style.setProperty("overflow", "hidden");
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeGallery();
        return;
      }
      if (event.key === "ArrowLeft" && orderedMedia.length > 1) {
        event.preventDefault();
        showPrevious();
        return;
      }
      if (event.key === "ArrowRight" && orderedMedia.length > 1) {
        event.preventDefault();
        showNext();
        return;
      }
      if (event.key !== "Tab") return;

      const dialog = lightboxRef.current;
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])',
      )).filter((element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true");
      if (!focusable.length) {
        event.preventDefault();
        closeButtonRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;
      if (event.shiftKey && (activeElement === first || !dialog.contains(activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previousOverflow) document.body.style.setProperty("overflow", previousOverflow);
      else document.body.style.removeProperty("overflow");
    };
  }, [activeIndex, closeGallery, orderedMedia.length, showNext, showPrevious]);

  if (!orderedMedia.length) {
    return <section className={styles.empty} aria-label="Property media">No property photos or videos are available.</section>;
  }

  const previewItems = orderedMedia.slice(0, 5);
  const photoCount = orderedMedia.filter((item) => item.media_type === "photo").length;
  const videoCount = orderedMedia.filter((item) => item.media_type === "video").length;

  return (
    <>
      <section className={styles.gallery} aria-label="Property photos and videos">
        <div className={styles.grid}>
          {previewItems.map((item, index) => (
            <button
              className={`${styles.tile} ${index === 0 ? styles.primary : ""}`}
              type="button"
              key={item.id}
              onClick={(event) => openGallery(index, event.currentTarget)}
              aria-label={`Open ${item.media_type === "photo" ? "photo" : "video"} ${index + 1} of ${orderedMedia.length}`}
            >
              {item.media_type === "photo" ? (
                <Image
                  src={item.signed_url}
                  alt={`${propertyTitle} photo ${index + 1}`}
                  fill
                  sizes={index === 0 ? "(max-width: 900px) 100vw, 60vw" : "(max-width: 900px) 50vw, 20vw"}
                />
              ) : (
                <>
                  <video src={item.signed_url} muted preload="metadata" playsInline />
                  <span className={styles.playBadge}><Play size={18} fill="currentColor" aria-hidden="true" />Video</span>
                </>
              )}
            </button>
          ))}
        </div>
        <button className={styles.countButton} type="button" onClick={(event) => openGallery(0, event.currentTarget)}>
          <Camera size={15} aria-hidden="true" />
          <span>{photoCount} photo{photoCount === 1 ? "" : "s"}{videoCount ? ` · ${videoCount} video${videoCount === 1 ? "" : "s"}` : ""}</span>
        </button>
      </section>

      {activeItem && activeIndex !== null && (
        <div ref={lightboxRef} className={styles.lightbox} role="dialog" aria-modal="true" aria-label={`${propertyTitle} media viewer`} onMouseDown={(event) => { if (event.target === event.currentTarget) closeGallery(); }}>
          <div className={styles.lightboxHeader}>
            <span>{activeIndex + 1} / {orderedMedia.length} · {activeItem.media_type === "photo" ? "Photo" : "Video"}</span>
            <button ref={closeButtonRef} className={styles.iconButton} type="button" onClick={closeGallery} aria-label="Close media viewer"><X aria-hidden="true" /></button>
          </div>

          <div className={styles.stage}>
            {orderedMedia.length > 1 && <button className={`${styles.navButton} ${styles.previous}`} type="button" onClick={showPrevious} aria-label="Previous media"><ChevronLeft aria-hidden="true" /></button>}
            <div className={styles.activeMedia}>
              {activeItem.media_type === "photo" ? (
                <Image src={activeItem.signed_url} alt={`${propertyTitle} photo ${activeIndex + 1}`} fill sizes="100vw" priority />
              ) : (
                <video key={activeItem.id} src={activeItem.signed_url} controls autoPlay playsInline preload="metadata">Your browser does not support property video playback.</video>
              )}
            </div>
            {orderedMedia.length > 1 && <button className={`${styles.navButton} ${styles.next}`} type="button" onClick={showNext} aria-label="Next media"><ChevronRight aria-hidden="true" /></button>}
          </div>

          {orderedMedia.length > 1 && (
            <div className={styles.thumbnails} aria-label="Choose media">
              {orderedMedia.map((item, index) => (
                <button className={`${styles.thumbnail} ${index === activeIndex ? styles.activeThumbnail : ""}`} type="button" key={item.id} onClick={() => setActiveIndex(index)} aria-label={`Show ${item.media_type} ${index + 1}`} aria-current={index === activeIndex ? "true" : undefined}>
                  {item.media_type === "photo" ? <Image src={item.signed_url} alt="" fill sizes="96px" /> : <><video src={item.signed_url} muted preload="metadata" playsInline /><Play size={16} aria-hidden="true" /></>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
