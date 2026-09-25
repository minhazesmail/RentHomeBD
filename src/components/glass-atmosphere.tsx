"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import styles from "./glass-atmosphere.module.css";

/** One decorative canvas for every route. It only updates when the page scrolls. */
export function GlassAtmosphere() {
  const canvas = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let scrollTop = window.scrollY;
    let scrollRange = document.documentElement.scrollHeight - window.innerHeight;

    const paint = () => {
      frame = 0;
      const progress = preference.matches ? 0 : Math.min(1, Math.max(0, scrollTop / Math.max(1, scrollRange)));
      element.style.setProperty("--glass-drift-x", `${progress * 220}px`);
      element.style.setProperty("--glass-drift-y", `${progress * -280}px`);
      element.style.setProperty("--glass-turn", `${progress * 32}deg`);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(paint); };
    const onScroll = (event: Event) => {
      if (preference.matches) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.scrollHeight > target.clientHeight) {
        scrollTop = target.scrollTop;
        scrollRange = target.scrollHeight - target.clientHeight;
      } else {
        scrollTop = window.scrollY;
        scrollRange = document.documentElement.scrollHeight - window.innerHeight;
      }
      schedule();
    };
    const onResize = () => {
      scrollTop = window.scrollY;
      scrollRange = document.documentElement.scrollHeight - window.innerHeight;
      schedule();
    };
    paint();
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onResize, { passive: true });
    preference.addEventListener("change", schedule);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      preference.removeEventListener("change", schedule);
    };
  }, [pathname]);

  return <div ref={canvas} className={styles.canvas} aria-hidden="true" data-glass-atmosphere>
    <span className={styles.jade} />
    <span className={styles.amber} />
    <span className={styles.arc} />
  </div>;
}
