"use client";

import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useLocale } from "@/i18n/use-locale";
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
  const { dictionary } = useLocale();
  const nav = dictionary.navigation;

  return (
    <nav
      className={`${styles.nav} ${landing ? `${styles.landing} landing-nav` : styles.infoNav}`}
      aria-label={nav.primaryNavigationAria}
      data-marketing-navigation
    >
      <BrandLogo />
      <div className={`${styles.center} ${landing ? "landing-nav-center" : ""}`}>
        <Link href="/homes">{nav.findOnMap}</Link>
        {landing && <a href="#how-heading">{nav.howItWorks}</a>}
        <Link href="/about" aria-current={current === "about" ? "page" : undefined}>{nav.about}</Link>
        {!landing && <Link href="/contact" aria-current={current === "contact" ? "page" : undefined}>{nav.contact}</Link>}
        {!landing && <Link href="/privacy" aria-current={current === "privacy" ? "page" : undefined}>{nav.privacy}</Link>}
        {!landing && <Link href="/terms" aria-current={current === "terms" ? "page" : undefined}>{nav.terms}</Link>}
      </div>
      <div className={`${styles.actions} ${landing ? "landing-nav-actions" : ""}`}>
        <LanguageSwitcher />
        <ThemeSwitcher compact />
        <Link className="text-link" href="/login">{nav.signIn}</Link>
        <Link className="primary-button link-button" href={LIST_PROPERTY_HREF}>{nav.listProperty}</Link>
      </div>
    </nav>
  );
}
