import Link from "next/link";
import { ClipboardCheck, Flag, ShieldCheck } from "lucide-react";

import { getLocale } from "@/i18n/get-locale";
import { getModerationCopy } from "@/i18n/moderation-copy";
import { formatNumber } from "@/i18n/format";
import type { ModerationQueueCounts } from "@/lib/moderation-queue-counts";

type ModerationArea = "listings" | "reports" | "accounts";

export async function ModerationWorkbenchNav({ current, counts }: { current: ModerationArea; counts: ModerationQueueCounts }) {
  const locale = await getLocale();
  const copy = getModerationCopy(locale);
  const items = [
    { key: "listings" as const, href: "/moderation", label: copy.nav.listings, icon: ClipboardCheck },
    { key: "reports" as const, href: "/moderation/reports", label: copy.nav.reports, icon: Flag },
    { key: "accounts" as const, href: "/moderation/accounts", label: copy.nav.accounts, icon: ShieldCheck },
  ];

  return (
    <nav className="moderation-workbench-nav" aria-label={copy.nav.aria}>
      <div className="moderation-workbench-nav-main">
        {items.map(({ key, href, label, icon: Icon }) => (
          <Link key={key} href={href} className={current === key ? "is-active" : undefined} aria-current={current === key ? "page" : undefined}>
            <Icon size={16} aria-hidden="true" />
            <span>{label}</span>
            <strong>{formatNumber(counts[key], locale)}</strong>
          </Link>
        ))}
      </div>
      <Link className="moderation-workbench-dashboard" href="/dashboard">{copy.nav.dashboard}</Link>
    </nav>
  );
}
