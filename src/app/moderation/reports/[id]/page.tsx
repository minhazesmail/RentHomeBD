import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { ModerationWorkbenchNav } from "@/components/moderation-workbench-nav";
import { ReportModerationActions } from "@/components/report-moderation-actions";
import { requireModerator } from "@/lib/auth";
import { getModerationQueueCounts } from "@/lib/moderation-queue-counts";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function label(value: string) { return value.replaceAll("_", " "); }

export default async function ReportReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const auth = await requireModerator();
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

  return (
    <main className="listing-shell moderation-shell moderation-report-detail-shell">
      <header className="listing-page-header moderation-header">
        <div>
          <Link className="brand-link compact-brand" href="/">NearBasha</Link>
          <p className="eyebrow">Trust & safety review</p>
          <h1 className="listing-page-title">{property.title || "Reported listing"}</h1>
          <p className="intro">Report from {reporter?.display_name || "a NearBasha user"} · {new Date(report.created_at).toLocaleString("en-BD")}</p>
        </div>
        <Link className="text-link" href="/moderation/reports">Back to reports</Link>
      </header>

      <ModerationWorkbenchNav current="reports" counts={counts} />

      {query.notice === "hide_listing" && <div className="success-message">Previous listing was hidden and its report closed.</div>}
      {(query.notice === "dismiss" || query.notice === "resolve") && <div className="success-message">Previous report was closed. Continue with this review.</div>}

      <section className="moderation-review-grid moderation-inspection-grid">
        <div className="listing-form moderation-inspection-stack">
          <section className="listing-section moderation-inspection-card moderation-report-card">
            <div className="section-heading"><span>1</span><div><h2>Report</h2><p>Review the renter&apos;s reason and supporting details.</p></div></div>
            <dl className="review-facts">
              <div><dt>Reason</dt><dd>{label(report.reason)}</dd></div>
              <div><dt>Reporter role</dt><dd>{reporter?.primary_role || "user"}</dd></div>
            </dl>
            <div className="review-description"><strong>Details</strong><p>{report.details || "No additional details were provided."}</p></div>
          </section>
          <section className="listing-section moderation-inspection-card">
            <div className="section-heading"><span>2</span><div><h2>Current listing</h2><p>Check the current public state before deciding.</p></div></div>
            <dl className="review-facts">
              <div><dt>Status</dt><dd>{label(property.status)}</dd></div>
              <div><dt>Type</dt><dd>{property.property_type ? label(property.property_type) : "—"}</dd></div>
              <div><dt>Rent</dt><dd>{property.rent_bdt ? `৳${property.rent_bdt.toLocaleString("en-BD")}` : "—"}</dd></div>
              <div><dt>Address</dt><dd>{property.address_text || "—"}</dd></div>
            </dl>
            <Link className="text-link" href={`/homes/${property.id}`}>Open public listing</Link>
          </section>
        </div>
        <aside className="moderation-sidebar moderation-decision-rail">
          <ReportModerationActions reportId={report.id} reviewerId={auth.userId} nextReportId={nextReportId} />
          <div className="moderation-review-progress" aria-label="Report queue navigation">
            {previousReportId ? <Link href={`/moderation/reports/${previousReportId}`}><ArrowLeft size={14} aria-hidden="true" /> Previous</Link> : <span className="is-disabled"><ArrowLeft size={14} aria-hidden="true" /> Previous</span>}
            <span>{queueIndex + 1} of {queueIds.length}</span>
            {nextReportId ? <Link href={`/moderation/reports/${nextReportId}`}>Next <ArrowRight size={14} aria-hidden="true" /></Link> : <span className="is-disabled">Next <ArrowRight size={14} aria-hidden="true" /></span>}
          </div>
        </aside>
      </section>
    </main>
  );
}
