import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import styles from "./marketing-navigation.module.css";

const LIST_PROPERTY_HREF = "/login?intent=list-property&next=%2Fowner%2Fproperties%2Fnew";

type MarketingRoute = "about" | "contact" | "privacy" | "terms";

export function MarketingNavigation({
  variant = "information",
  current,
}: {
  variant?: "landing" | "information";
  current?: MarketingRoute;
}) {
  const landing = variant === "landing";

  return (
    <nav className={`${styles.nav} ${landing ? "landing-nav" : styles.infoNav}`} aria-label="Primary navigation">
      <BrandLogo />
      <div className={`${styles.center} ${landing ? "landing-nav-center" : ""}`}>
        <Link href="/homes">Find on map</Link>
        {landing && <a href="#how-heading">How it works</a>}
        <Link href="/about" aria-current={current === "about" ? "page" : undefined}>About</Link>
        {!landing && <Link href="/contact" aria-current={current === "contact" ? "page" : undefined}>Contact</Link>}
        {!landing && <Link href="/privacy" aria-current={current === "privacy" ? "page" : undefined}>Privacy</Link>}
        {!landing && <Link href="/terms" aria-current={current === "terms" ? "page" : undefined}>Terms</Link>}
      </div>
      <div className={`${styles.actions} ${landing ? "landing-nav-actions" : ""}`}>
        <Link className="text-link" href="/login">Sign in</Link>
        <Link className="primary-button link-button" href={LIST_PROPERTY_HREF}>List a property</Link>
      </div>
    </nav>
  );
}
