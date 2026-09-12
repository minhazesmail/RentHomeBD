import { BrandLogo } from "@/components/brand-logo";
import type { SupabaseClient } from "@supabase/supabase-js";

import { ModerationWorkbenchNav } from "@/components/moderation-workbench-nav";
import { ProfileVerificationActions } from "@/components/profile-verification-actions";
import { formatDate, formatNumber } from "@/i18n/format";
import { getLocale } from "@/i18n/get-locale";
import { formatModerationText, getModerationCopy } from "@/i18n/moderation-copy";
import { requireModerator } from "@/lib/auth";
import { getModerationQueueCounts } from "@/lib/moderation-queue-counts";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type TrustProfile = { id: string; display_name: string | null; primary_role: "owner" | "agent"; phone_verified_at: string | null; role_verified_at: string | null; role_verified_role: "owner" | "agent" | null; created_at: string };

export default async function AccountVerificationPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const [auth, locale] = await Promise.all([requireModerator(), getLocale()]);
  const copy = getModerationCopy(locale);
  const params = await searchParams;
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const [{ data }, counts] = await Promise.all([
    supabase.from("profiles").select("id, display_name, primary_role, phone_verified_at, role_verified_at, role_verified_role, created_at").in("primary_role", ["owner", "agent"]).order("created_at", { ascending: true }),
    getModerationQueueCounts(supabase),
  ]);
  const profiles = ((data ?? []) as TrustProfile[]).sort((a, b) => {
    const aVerified = Boolean(a.role_verified_at && a.role_verified_role === a.primary_role);
    const bVerified = Boolean(b.role_verified_at && b.role_verified_role === b.primary_role);
    if (aVerified !== bVerified) return aVerified ? 1 : -1;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
  const missingBadgeLabel = formatModerationText(counts.accounts === 1 ? copy.accounts.withoutOne : copy.accounts.withoutMany, { count: formatNumber(counts.accounts, locale) });
  const totalLabel = formatModerationText(profiles.length === 1 ? copy.accounts.totalOne : copy.accounts.totalMany, { count: formatNumber(profiles.length, locale) });

  return (
    <main className="owner-shell moderation-shell moderation-accounts-shell">
      <header className="owner-header moderation-header"><div><BrandLogo className="workspace-brand-logo" /><p className="eyebrow">{copy.common.trustModeration}</p><h1 className="owner-title">{copy.accounts.title}</h1><p className="intro">{copy.accounts.intro}</p></div></header>
      <ModerationWorkbenchNav current="accounts" counts={counts} />
      {params.notice === "verified" && <div className="success-message">{copy.accounts.verifiedNotice}</div>}
      {params.notice === "revoked" && <div className="success-message">{copy.accounts.revokedNotice}</div>}
      <div className="moderation-queue-context"><strong>{missingBadgeLabel}</strong><span>{totalLabel}</span></div>
      <section className="property-list-panel moderation-account-panel">
        {!profiles.length ? <div className="empty-state"><div className="empty-icon">✓</div><h2>{copy.accounts.emptyTitle}</h2><p>{copy.accounts.emptyCopy}</p></div> : (
          <div className="verification-account-list moderation-account-list">{profiles.map((profile) => {
            const verified = Boolean(profile.role_verified_at && profile.role_verified_role === profile.primary_role);
            const role = profile.primary_role === "agent" ? copy.common.agent : copy.common.owner;
            return (
              <article className={`listing-section moderation-account-card${verified ? " is-verified" : ""}`} key={profile.id}>
                <div className="section-heading"><span>{verified ? "✓" : "?"}</span><div><h2>{profile.display_name || copy.common.unnamedAccount}</h2><p>{formatModerationText(copy.accounts.joined, { role, date: formatDate(new Date(profile.created_at), locale, { timeZone: "Asia/Dhaka", day: "numeric", month: "short", year: "numeric" }) })}</p></div></div>
                <div className="property-tags moderation-account-signals"><span>{profile.phone_verified_at ? copy.common.phoneVerified : copy.common.phoneNotVerified}</span><span>{verified ? formatModerationText(copy.common.roleVerified, { role }) : copy.accounts.noRoleBadge}</span></div>
                <p className="section-copy">{copy.accounts.reviewHint}</p>
                <p className="trust-disclaimer">{copy.common.legalDisclaimer}</p>
                <ProfileVerificationActions targetUserId={profile.id} reviewerId={auth.userId} verified={verified} />
              </article>
            );
          })}</div>
        )}
      </section>
    </main>
  );
}
