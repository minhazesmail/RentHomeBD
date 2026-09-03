import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import styles from "./product-navigation.module.css";

type ProductNavSection = "explore" | "saved" | "messages" | "properties" | "dashboard";

export function ProductNavigation({
  authenticated,
  canList = false,
  current,
}: {
  authenticated: boolean;
  canList?: boolean;
  current?: ProductNavSection;
}) {
  const items: Array<{ key: ProductNavSection; href: string; label: string }> = [
    { key: "explore", href: "/homes", label: "Explore" },
    { key: "saved", href: "/saved", label: "Saved" },
    { key: "messages", href: "/messages", label: "Messages" },
  ];

  if (canList) items.push({ key: "properties", href: "/owner", label: "Properties" });

  return (
    <header className={styles.productNav}>
      <BrandLogo className={styles.productNavBrand} />
      <nav className={styles.productNavLinks} aria-label="NearBasha product navigation">
        {items.map((item) => (
          <Link
            className={current === item.key ? styles.productNavLinkActive : styles.productNavLink}
            href={item.href}
            aria-current={current === item.key ? "page" : undefined}
            key={item.key}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className={styles.productNavAccount}>
        <Link
          className={current === "dashboard" ? styles.productNavAccountActive : styles.productNavAccountLink}
          href={authenticated ? "/dashboard" : "/login"}
          aria-current={current === "dashboard" ? "page" : undefined}
        >
          {authenticated ? "Dashboard" : "Sign in"}
        </Link>
      </div>
    </header>
  );
}
