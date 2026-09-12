import { BrandLogo } from "@/components/brand-logo";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";

import { ModerationWorkbenchNav } from "@/components/moderation-workbench-nav";
import { formatCurrency, formatNumber } from "@/i18n/format";
import { getLocale } from "@/i18n/get-locale";
import { formatModerationText, getModerationCopy } from "@/i18n/moderation-copy";
import { requireModerator } from "@/lib/auth";
import { getModerationQueueCounts } from "@/lib/moderation-queue-counts";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ModerationQueuePage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const [, locale] = await Promise.all([requireModerator(), getLocale()]);
  const copy = getModerationCopy(locale);
  const params = await searchParams;
  const typedSupabase = await createClient();
  const supabase = typedSupabase as unknown as SupabaseClient;
  const [{ data: listings }, counts] = await Promise.all([
    typedSupabase.from("properties").select("id, title, address_text, property_type, rent_bdt, updated_at").eq("status", "pending_review").order("updated_at", { ascending: true }),
    getModerationQueueCounts(supabase),
  ]);

  const waiting = formatModerationText(counts.listings === 1 ? copy.listings.waitingOne : copy.listings.waitingMany, { count: formatNumber(counts.listings, locale) });

  return (
    <main className="owner-shell moderation-shell moderation-queue-shell">
      <header className="owner-header moderation-header"><div><BrandLogo className="workspace-brand-logo" /><p className="eyebrow">{copy.common.moderation}</p><h1 className="owner-title">{copy.listings.title}</h1><p className="intro">{copy.listings.intro}</p></div></header>
      <ModerationWorkbenchNav current="listings" counts={counts} />
      {params.notice === "approved" && <div className="success-message">{copy.listings.approved}</div>}
      {params.notice === "rejected" && <div className="success-message">{copy.listings.rejected}</div>}
      <div className="moderation-queue-context"><strong>{waiting}</strong><span>{copy.listings.oldest}</span></div>
      <section className="property-list-panel moderation-queue-panel">
        {!listings?.length ? <div className="empty-state"><div className="empty-icon">✓</div><h2>{copy.listings.clearTitle}</h2><p>{copy.listings.clearCopy}</p></div> : (
          <div className="property-list moderation-list">{listings.map((listing) => (
            <Link className="property-row moderation-row" href={`/moderation/${listing.id}`} key={listing.id}>
              <div className="property-row-main"><strong>{listing.title || copy.common.untitled}</strong><span>{listing.address_text || copy.common.noAddress} · {listing.property_type?.replaceAll("_", " ") || copy.common.typeMissing}</span></div>
              <div className="property-row-meta"><span className="status-pill status-pending_review">{copy.listings.needsReview}</span><span>{listing.rent_bdt ? `${formatCurrency(listing.rent_bdt, locale)}${copy.listings.perMonth}` : copy.listings.rentMissing}</span></div>
            </Link>
          ))}</div>
        )}
      </section>
    </main>
  );
}
