"use client";

import Image from "next/image";
import { Camera, ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useRenewingPublicMedia } from "@/hooks/use-renewing-public-media";
import { formatNumber } from "@/i18n/format";
import { formatPropertyDetailText, getPropertyDetailCopy } from "@/i18n/property-detail-copy";
import { useLocale } from "@/i18n/use-locale";
import { storagePathFromSignedUrl } from "@/lib/public-media";
import styles from "./property-media-gallery.module.css";

export type PropertyGalleryMedia = {
  id: string;
  media_type: "photo" | "video";
  sort_order: number;
  signed_url: string;
};

type LiveGalleryMedia = PropertyGalleryMedia & { storage_path: string | null };

export function PropertyMediaGallery({ media, propertyTitle }: { media: PropertyGalleryMedia[]; propertyTitle: string }) {
  const { locale } = useLocale();
  const copy = getPropertyDetailCopy(locale).media;
  const renewableItems = useMemo(() => media.flatMap((item) => {
    const path = storagePathFromSignedUrl(item.signed_url);
    return path ? [{ path, initialUrl: item.signed_url }] : [];
  }), [media]);
  const { urls, refresh } = useRenewingPublicMedia(renewableItems);
  const orderedMedia = useMemo<LiveGalleryMedia[]>(() => [...media]
    .map((item) => {
      const storagePath = storagePathFromSignedUrl(item.signed_url);
      return { ...item, storage_path: storagePath, signed_url: storagePath ? urls[storagePath] ?? item.signed_url : item.signed_url };
    })
    .sort((a, b) => a.sort_order - b.sort_order), [media, urls]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const lightboxRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);
  const errorRefreshRef = useRef(new Map<string, number>());
  const activeItem = activeIndex === null ? null : orderedMedia[activeIndex];

  function openGallery(index: number, trigger: HTMLButtonElement) {
    lastTriggerRef.current = trigger;
    setActiveIndex(index);
  }

  const recoverMedia = useCallback((item: LiveGalleryMedia) => {
    if (!item.storage_path) return;
    const now = Date.now();
    const lastAttempt = errorRefreshRef.current.get(item.storage_path) ?? 0;
    if (now - lastAttempt < 30_000) return;
    errorRefreshRef.current.set(item.storage_path, now);
    void refresh(item.storage_path);
  }, [refresh]);

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
      if (event.key === "Escape") { event.preventDefault(); closeGallery(); return; }
      if (event.key === "ArrowLeft" && orderedMedia.length > 1) { event.preventDefault(); showPrevious(); return; }
      if (event.key === "ArrowRight" && orderedMedia.length > 1) { event.preventDefault(); showNext(); return; }
      if (event.key !== "Tab") return;
      const dialog = lightboxRef.current;
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])',
      )).filter((element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true");
      if (!focusable.length) { event.preventDefault(); closeButtonRef.current?.focus(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;
      if (event.shiftKey && (activeElement === first || !dialog.contains(activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previousOverflow) document.body.style.setProperty("overflow", previousOverflow);
      else document.body.style.removeProperty("overflow");
    };
  }, [activeIndex, closeGallery, orderedMedia.length, showNext, showPrevious]);

  if (!orderedMedia.length) {
    return <section className={styles.empty} aria-label={copy.emptyAria}>{copy.empty}</section>;
  }

  const previewItems = orderedMedia.slice(0, 5);
  const photoCount = orderedMedia.filter((item) => item.media_type === "photo").length;
  const videoCount = orderedMedia.filter((item) => item.media_type === "video").length;
  const mediaCount = `${formatNumber(photoCount, locale)} ${photoCount === 1 ? copy.photo : copy.photos}${videoCount ? ` · ${formatNumber(videoCount, locale)} ${videoCount === 1 ? copy.video : copy.videos}` : ""}`;

  return (
    <>
      <section className={styles.gallery} aria-label={copy.regionAria}>
        <div className={styles.grid}>
          {previewItems.map((item, index) => {
            const current = formatNumber(index + 1, locale);
            const total = formatNumber(orderedMedia.length, locale);
            const typeLabel = item.media_type === "photo" ? copy.photo : copy.video;
            return (
              <button className={`${styles.tile} ${index === 0 ? styles.primary : ""}`} type="button" key={item.id} onClick={(event) => openGallery(index, event.currentTarget)} aria-label={formatPropertyDetailText(copy.openItem, { type: typeLabel, current, total })}>
                {item.media_type === "photo" ? (
                  <Image src={item.signed_url} alt={formatPropertyDetailText(copy.photoAlt, { title: propertyTitle, current })} fill sizes={index === 0 ? "(max-width: 900px) 100vw, 60vw" : "(max-width: 900px) 50vw, 20vw"} onError={() => recoverMedia(item)} />
                ) : (
                  <><video src={item.signed_url} muted preload="metadata" playsInline onError={() => recoverMedia(item)} /><span className={styles.playBadge}><Play size={18} fill="currentColor" aria-hidden="true" />{copy.videoBadge}</span></>
                )}
              </button>
            );
          })}
        </div>
        <button className={styles.countButton} type="button" onClick={(event) => openGallery(0, event.currentTarget)}><Camera size={15} aria-hidden="true" /><span>{mediaCount}</span></button>
      </section>

      {activeItem && activeIndex !== null && (
        <div ref={lightboxRef} className={styles.lightbox} role="dialog" aria-modal="true" aria-label={formatPropertyDetailText(copy.viewerAria, { title: propertyTitle })} onMouseDown={(event) => { if (event.target === event.currentTarget) closeGallery(); }}>
          <div className={styles.lightboxHeader}><span>{formatNumber(activeIndex + 1, locale)} / {formatNumber(orderedMedia.length, locale)} · {activeItem.media_type === "photo" ? copy.photoLabel : copy.videoLabel}</span><button ref={closeButtonRef} className={styles.iconButton} type="button" onClick={closeGallery} aria-label={copy.close}><X aria-hidden="true" /></button></div>
          <div className={styles.stage}>
            {orderedMedia.length > 1 && <button className={`${styles.navButton} ${styles.previous}`} type="button" onClick={showPrevious} aria-label={copy.previous}><ChevronLeft aria-hidden="true" /></button>}
            <div className={styles.activeMedia}>
              {activeItem.media_type === "photo" ? <Image src={activeItem.signed_url} alt={formatPropertyDetailText(copy.photoAlt, { title: propertyTitle, current: formatNumber(activeIndex + 1, locale) })} fill sizes="100vw" priority onError={() => recoverMedia(activeItem)} /> : <video key={activeItem.id} src={activeItem.signed_url} controls autoPlay playsInline preload="metadata" onError={() => recoverMedia(activeItem)}>{copy.unsupportedVideo}</video>}
            </div>
            {orderedMedia.length > 1 && <button className={`${styles.navButton} ${styles.next}`} type="button" onClick={showNext} aria-label={copy.next}><ChevronRight aria-hidden="true" /></button>}
          </div>
          {orderedMedia.length > 1 && (
            <div className={styles.thumbnails} aria-label={copy.chooseMedia}>
              {orderedMedia.map((item, index) => (
                <button className={`${styles.thumbnail} ${index === activeIndex ? styles.activeThumbnail : ""}`} type="button" key={item.id} onClick={() => setActiveIndex(index)} aria-label={formatPropertyDetailText(copy.showItem, { type: item.media_type === "photo" ? copy.photo : copy.video, current: formatNumber(index + 1, locale) })} aria-current={index === activeIndex ? "true" : undefined}>
                  {item.media_type === "photo" ? <Image src={item.signed_url} alt="" fill sizes="96px" onError={() => recoverMedia(item)} /> : <><video src={item.signed_url} muted preload="metadata" playsInline onError={() => recoverMedia(item)} /><Play size={16} aria-hidden="true" /></>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
