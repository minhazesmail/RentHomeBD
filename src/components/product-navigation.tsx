"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Building2, Compass, MessageCircle, UserRound } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useLocale } from "@/i18n/use-locale";
import styles from "./product-navigation.module.css";

type ProductNavSection = "explore" | "saved" | "messages" | "properties" | "dashboard";

type ProductNavItem = {
  key: ProductNavSection;
  href: string;
  label: string;
  icon: typeof Compass;
};

function isContextualMobileRoute(pathname: string) {
  return /^\/messages\/[^/]+$/.test(pathname)
    || /^\/owner\/properties\/(?:new|[^/]+)$/.test(pathname)
    || /^\/homes\/[^/]+$/.test(pathname);
}

export function ProductNavigation({
  authenticated,
  canList = false,
  current,
}: {
  authenticated: boolean;
  canList?: boolean;
  current?: ProductNavSection;
}) {
  const pathname = usePathname();
  const { dictionary } = useLocale();
  const nav = dictionary.navigation;
  const showMobileTabs = !isContextualMobileRoute(pathname);
  const items: ProductNavItem[] = [
    { key: "explore", href: "/homes", label: nav.explore, icon: Compass },
    { key: "saved", href: "/saved", label: nav.saved, icon: Bookmark },
    { key: "messages", href: "/messages", label: nav.messages, icon: MessageCircle },
  ];

  if (canList) items.push({ key: "properties", href: "/owner", label: nav.properties, icon: Building2 });

  const AccountIcon = UserRound;
  const accountLabel = nav.account;
  const accountHref = authenticated ? "/dashboard" : "/login";
  const accountActive = current === "dashboard";

  return (
    <div className={styles.productNavShell} data-product-navigation data-mobile-tabs={showMobileTabs ? "true" : "false"}>
      <header className={styles.productNav}>
        <BrandLogo className={styles.productNavBrand} />
        <nav className={styles.productNavLinks} aria-label={nav.productNavigationAria}>
          {items.map((item) => {
            const Icon = item.icon;
            const active = current === item.key;
            return (
              <Link
                className={active ? styles.productNavLinkActive : styles.productNavLink}
                href={item.href}
                aria-current={active ? "page" : undefined}
                key={item.key}
              >
                <Icon size={15} strokeWidth={2.15} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className={styles.productNavAccount}>
          <LanguageSwitcher />
          <ThemeSwitcher compact />
          <Link
            className={accountActive ? styles.productNavAccountActive : styles.productNavAccountLink}
            href={accountHref}
            aria-current={accountActive ? "page" : undefined}
          >
            <AccountIcon size={15} strokeWidth={2.15} aria-hidden="true" />
            <span>{accountLabel}</span>
          </Link>
        </div>
      </header>

      {showMobileTabs && (
        <nav className={styles.mobileTabBar} aria-label={nav.productNavigationAria}>
          {items.map((item) => {
            const Icon = item.icon;
            const active = current === item.key;
            return (
              <Link
                className={active ? styles.mobileTabActive : styles.mobileTab}
                href={item.href}
                aria-current={active ? "page" : undefined}
                key={`mobile-${item.key}`}
              >
                <Icon size={20} strokeWidth={active ? 2.45 : 2.1} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <Link
            className={accountActive ? styles.mobileTabActive : styles.mobileTab}
            href={accountHref}
            aria-current={accountActive ? "page" : undefined}
          >
            <AccountIcon size={20} strokeWidth={accountActive ? 2.45 : 2.1} aria-hidden="true" />
            <span>{accountLabel}</span>
          </Link>
        </nav>
      )}
    </div>
  );
}
