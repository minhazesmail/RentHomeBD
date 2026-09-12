import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { ModerationWorkbenchNav } from "@/components/moderation-workbench-nav";
import { ReportModerationActions } from "@/components/report-moderation-actions";
import { formatCurrency, formatDate, formatNumber } from "@/i18n/format";
import { getLocale } from "@/i18n/get-locale";
import { formatModerationText, getModerationCopy } from "@/i18n/moderation-copy";
import { requireModerator } from "@/lib/auth";
import { getModerationQueueCounts } from "@/lib/moderation-queue-counts";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function label(value: string) { return value.replaceAll("_", " "); }

export default async function ReportReviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ notice?: string }> }) {
  const [auth, locale] = await Promise.all([requireModerator(), getLocale()]);
  const copy = getModerationCopy(locale);
  const { id } = await params;
  const query = await searchParams;
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const { data: report } = await supabase.from("listing_reports").select("id, property_id, reporter_id, reason, details, status, created_at").eq("id", id).maybeSingle();
  if (!report || report.status !== "open") notFound();

  const [{ data: property }, { data: reporter }, { data: queueRows }, counts] = await Promise.all([
    supabase.from("properties").select("id, owner_id, title, address_text, property_type, rent_bdt, status, published_at, expires_at").eq("id", report.property_id).maybeSingle(),
    supabase.from("profiles").select("display_name, primary_role").eq("id", report.reporter_id).maybeSingle(),
    supabase.from("listing_reports").select("id").eq("status", "open").order("created_at", { ascending: true }),
    getModerationQueueCounts(supabase),
  ]);
  if (!property) notFound();

  const queueIds = (queueRows ?? []).map((row) => row.id as string);
  const queueIndex = queueIds.indexOf(id);
  const previousReportId = queueIndex > 0 ? queueIds[queueIndex - 1] : null;
  const nextReportId = queueIndex >= 0 && queueIndex < queueIds.length - 1 ? queueIds[queueIndex + 1] : null;
  const reportDate = formatDate(new Date(report.created_at), locale, { timeZone: "Asia/Dhaka", day: "numeric", month: "short", year: "numeric" });

  return (
    <main className="listing-shell moderation-shell moderation-report-detail-shell">
      <header className="listing-page-header moderation-header">
        <div><Link className="brand-link compact-brand" href="/">NearBasha</Link><p className="eyebrow">{copy.reportDetail.eyebrow}</p><h1 className="listing-page-title">{property.title || copy.common.reportedListing}</h1><p className="intro">{formatModerationText(copy.reportDetail.reportFrom, { name: reporter?.display_name || copy.common.nearbashaUser, date: reportDate })}</p></div>
        <Link className="text-link" href="/moderation/reports">{copy.reportDetail.back}</Link>
      </header>
      <ModerationWorkbenchNav current="reports" counts={counts} />
      {query.notice === "hide_listing" && <div className="success-message">{copy.reportDetail.hiddenNotice}</div>}
      {(query.notice === "dismiss" || query.notice === "resolve") && <div className="success-message">{copy.reportDetail.closedNotice}</div>}
      <section className="moderation-review-grid moderation-inspection-grid">
        <div className="listing-form moderation-inspection-stack">
          <section className="listing-section moderation-inspection-card moderation-report-card">
            <div className="section-heading"><span>1</span><div><h2>{copy.reportDetail.report}</h2><p>{copy.reportDetail.reportHint}</p></div></div>
            <dl className="review-facts"><div><dt>{copy.reportDetail.reason}</dt><dd>{copy.reports.reasons[report.reason] || label(report.reason)}</dd></div><div><dt>{copy.reportDetail.reporterRole}</dt><dd>{reporter?.primary_role || copy.common.user}</dd></div></dl>
            <div className="review-description"><strong>{copy.reportDetail.details}</strong><p>{report.details || copy.reportDetail.noDetails}</p></div>
          </section>
          <section className="listing-section moderation-inspection-card">
            <div className="section-heading"><span>2</span><div><h2>{copy.reportDetail.current}</h2><p>{copy.reportDetail.currentHint}</p></div></div>
            <dl className="review-facts"><div><dt>{copy.reportDetail.status}</dt><dd>{label(property.status)}</dd></div><div><dt>{copy.reportDetail.type}</dt><dd>{property.property_type ? label(property.property_type) : "—"}</dd></div><div><dt>{copy.reportDetail.rent}</dt><dd>{property.rent_bdt ? formatCurrency(property.rent_bdt, locale) : "—"}</dd></div><div><dt>{copy.reportDetail.address}</dt><dd>{property.address_text || "—"}</dd></div></dl>
            <Link className="text-link" href={`/homes/${property.id}`}>{copy.reportDetail.openPublic}</Link>
          </section>
        </div>
        <aside className="moderation-sidebar moderation-decision-rail">
          <ReportModerationActions reportId={report.id} reviewerId={auth.userId} nextReportId={nextReportId} />
          <div className="moderation-review-progress" aria-label={copy.reportDetail.queueAria}>
            {previousReportId ? <Link href={`/moderation/reports/${previousReportId}`}><ArrowLeft size={14} aria-hidden="true" /> {copy.common.previous}</Link> : <span className="is-disabled"><ArrowLeft size={14} aria-hidden="true" /> {copy.common.previous}</span>}
            <span>{formatModerationText(copy.common.of, { current: formatNumber(queueIndex + 1, locale), total: formatNumber(queueIds.length, locale) })}</span>
            {nextReportId ? <Link href={`/moderation/reports/${nextReportId}`}>{copy.common.next} <ArrowRight size={14} aria-hidden="true" /></Link> : <span className="is-disabled">{copy.common.next} <ArrowRight size={14} aria-hidden="true" /></span>}
          </div>
        </aside>
      </section>
    </main>
  );
}
