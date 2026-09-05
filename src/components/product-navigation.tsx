import Link from "next/link";
import { Bookmark, Building2, Compass, LayoutDashboard, LogIn, MessageCircle } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
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
  const items: ProductNavItem[] = [
    { key: "explore", href: "/homes", label: "Explore", icon: Compass },
    { key: "saved", href: "/saved", label: "Saved", icon: Bookmark },
    { key: "messages", href: "/messages", label: "Messages", icon: MessageCircle },
  ];

  if (canList) items.push({ key: "properties", href: "/owner", label: "Properties", icon: Building2 });

  const AccountIcon = authenticated ? LayoutDashboard : LogIn;

  return (
    <div className={styles.productNavShell} data-product-navigation>
      <header className={styles.productNav}>
        <BrandLogo className={styles.productNavBrand} />
        <nav className={styles.productNavLinks} aria-label="NearBasha product navigation">
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
          <Link
            className={current === "dashboard" ? styles.productNavAccountActive : styles.productNavAccountLink}
            href={authenticated ? "/dashboard" : "/login"}
            aria-current={current === "dashboard" ? "page" : undefined}
          >
            <AccountIcon size={15} strokeWidth={2.15} aria-hidden="true" />
            <span>{authenticated ? "Dashboard" : "Sign in"}</span>
          </Link>
        </div>
      </header>
    </div>
  );
}
