import { BrandLogo } from "@/components/brand-logo";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";

import { ModerationWorkbenchNav } from "@/components/moderation-workbench-nav";
import { formatDate, formatNumber } from "@/i18n/format";
import { getLocale } from "@/i18n/get-locale";
import { formatModerationText, getModerationCopy } from "@/i18n/moderation-copy";
import { requireModerator } from "@/lib/auth";
import { getModerationQueueCounts } from "@/lib/moderation-queue-counts";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ReportQueuePage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const [, locale] = await Promise.all([requireModerator(), getLocale()]);
  const copy = getModerationCopy(locale);
  const params = await searchParams;
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const [{ data: reports }, counts] = await Promise.all([
    supabase.from("listing_reports").select("id, property_id, reason, details, created_at").eq("status", "open").order("created_at", { ascending: true }),
    getModerationQueueCounts(supabase),
  ]);
  const propertyIds = [...new Set((reports ?? []).map((report) => report.property_id))];
  const { data: properties } = propertyIds.length ? await supabase.from("properties").select("id, title, address_text, status").in("id", propertyIds) : { data: [] };
  const propertyById = new Map((properties ?? []).map((property) => [property.id, property]));
  const openLabel = formatModerationText(counts.reports === 1 ? copy.reports.openOne : copy.reports.openMany, { count: formatNumber(counts.reports, locale) });

  return (
    <main className="owner-shell moderation-shell moderation-reports-shell">
      <header className="owner-header moderation-header"><div><BrandLogo className="workspace-brand-logo" /><p className="eyebrow">{copy.common.trustSafety}</p><h1 className="owner-title">{copy.reports.title}</h1><p className="intro">{copy.reports.intro}</p></div></header>
      <ModerationWorkbenchNav current="reports" counts={counts} />
      {params.notice === "hide_listing" && <div className="success-message">{copy.reports.hidden}</div>}
      {(params.notice === "dismiss" || params.notice === "resolve") && <div className="success-message">{copy.reports.closed}</div>}
      <div className="moderation-queue-context"><strong>{openLabel}</strong><span>{copy.reports.oldest}</span></div>
      <section className="property-list-panel moderation-report-panel">
        {!reports?.length ? <div className="empty-state"><div className="empty-icon">✓</div><h2>{copy.reports.clearTitle}</h2><p>{copy.reports.clearCopy}</p></div> : (
          <div className="property-list moderation-list">{reports.map((report) => { const property = propertyById.get(report.property_id); return (
            <Link className="property-row moderation-row moderation-report-row" href={`/moderation/reports/${report.id}`} key={report.id}>
              <div className="property-row-main"><strong>{property?.title || copy.common.reportedListing}</strong><span>{copy.reports.reasons[report.reason] || report.reason}{report.details ? ` · ${report.details}` : ""}</span></div>
              <div className="property-row-meta"><span className="status-pill status-rejected">{copy.reports.openStatus}</span><span>{formatDate(new Date(report.created_at), locale, { timeZone: "Asia/Dhaka", day: "numeric", month: "short", year: "numeric" })}</span></div>
            </Link>
          ); })}</div>
        )}
      </section>
    </main>
  );
}
