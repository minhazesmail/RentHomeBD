"use client";

import "@/app/landing.css";
import "@/app/landing-alignment.css";
import "@/app/landing-redesign.css";
import "@/app/landing-pointed-fixes.css";
import "@/app/landing-trust-contrast-fix.css";
import "@/app/landing-static-background.css";

export function LandingScrollAtmosphere() {
  // The landing atmosphere is intentionally static. Earlier versions observed
  // section intersections and swapped full-page background themes during scroll.
  // Keeping one fixed decorative layer removes all background motion while
  // preserving the page's visual texture and contrast.
  return <div className="landing-scroll-atmosphere" aria-hidden="true" />;
}
