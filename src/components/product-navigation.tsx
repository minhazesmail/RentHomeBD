"use client";

import Link from "next/link";
import { Bookmark, Building2, Compass, LayoutDashboard, LogIn, MessageCircle } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useLocale } from "@/i18n/use-locale";
import styles from "./product-navigation.module.css";

type ProductNavSection = "explore" | "saved" | "messages" | "properties" | "dashboard";

type ProductNavItem = {
  key: ProductNavSection;
  href: string;
  label: string;
  icon: typeof Compass;
};

export function ProductNavigation({
  authenticated,
  canList = false,
  current,
}: {
  authenticated: boolean;
  canList?: boolean;
  current?: ProductNavSection;
}) {
  const { dictionary } = useLocale();
  const nav = dictionary.navigation;
  const items: ProductNavItem[] = [
    { key: "explore", href: "/homes", label: nav.explore, icon: Compass },
    { key: "saved", href: "/saved", label: nav.saved, icon: Bookmark },
    { key: "messages", href: "/messages", label: nav.messages, icon: MessageCircle },
  ];

  if (canList) items.push({ key: "properties", href: "/owner", label: nav.properties, icon: Building2 });

  const AccountIcon = authenticated ? LayoutDashboard : LogIn;

  return (
    <div className={styles.productNavShell} data-product-navigation>
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
          <Link
            className={current === "dashboard" ? styles.productNavAccountActive : styles.productNavAccountLink}
            href={authenticated ? "/dashboard" : "/login"}
            aria-current={current === "dashboard" ? "page" : undefined}
          >
            <AccountIcon size={15} strokeWidth={2.15} aria-hidden="true" />
            <span>{authenticated ? nav.dashboard : nav.signIn}</span>
          </Link>
        </div>
      </header>
    </div>
  );
}
