import Link from "next/link";
import { ClipboardCheck, Flag, ShieldCheck } from "lucide-react";

import type { ModerationQueueCounts } from "@/lib/moderation-queue-counts";

type ModerationArea = "listings" | "reports" | "accounts";

const items = [
  { key: "listings" as const, href: "/moderation", label: "Listing reviews", icon: ClipboardCheck },
  { key: "reports" as const, href: "/moderation/reports", label: "Reports", icon: Flag },
  { key: "accounts" as const, href: "/moderation/accounts", label: "Accounts", icon: ShieldCheck },
];

export function ModerationWorkbenchNav({ current, counts }: { current: ModerationArea; counts: ModerationQueueCounts }) {
  return (
    <nav className="moderation-workbench-nav" aria-label="Moderation workbench">
      <div className="moderation-workbench-nav-main">
        {items.map(({ key, href, label, icon: Icon }) => (
          <Link
            key={key}
            href={href}
            className={current === key ? "is-active" : undefined}
            aria-current={current === key ? "page" : undefined}
          >
            <Icon size={16} aria-hidden="true" />
            <span>{label}</span>
            <strong>{counts[key]}</strong>
          </Link>
        ))}
      </div>
      <Link className="moderation-workbench-dashboard" href="/dashboard">Dashboard</Link>
    </nav>
  );
}
