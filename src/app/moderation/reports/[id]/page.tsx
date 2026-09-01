import "../../../premium-ui.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { ReportModerationActions } from "@/components/report-moderation-actions";
import { requireModerator } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function label(value: string) { return value.replaceAll("_", " "); }

export default async function ReportReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requireModerator();
  const { id } = await params;
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const { data: report } = await supabase.from("listing_reports").select("id, property_id, reporter_id, reason, details, status, created_at").eq("id", id).maybeSingle();
  if (!report || report.status !== "open") notFound();

  const [{ data: property }, { data: reporter }] = await Promise.all([
    supabase.from("properties").select("id, owner_id, title, address_text, property_type, rent_bdt, status, published_at, expires_at").eq("id", report.property_id).maybeSingle(),
    supabase.from("profiles").select("display_name, primary_role").eq("id", report.reporter_id).maybeSingle(),
  ]);
  if (!property) notFound();

  return (
    <main className="listing-shell">
      <header className="listing-page-header">
        <div><Link className="brand-link compact-brand" href="/">NearBasha</Link><p className="eyebrow">Trust & safety review</p><h1 className="listing-page-title">{property.title || "Reported listing"}</h1><p className="intro">Report from {reporter?.display_name || "a NearBasha user"} · {new Date(report.created_at).toLocaleString("en-BD")}</p></div>
        <Link className="text-link" href="/moderation/reports">Back to reports</Link>
      </header>

      <section className="moderation-review-grid">
        <div className="listing-form">
          <section className="listing-section"><div className="section-heading"><span>1</span><div><h2>Report</h2><p>Review the renter&apos;s reason and supporting details.</p></div></div><dl className="review-facts"><div><dt>Reason</dt><dd>{label(report.reason)}</dd></div><div><dt>Reporter role</dt><dd>{reporter?.primary_role || "user"}</dd></div></dl><div className="review-description"><strong>Details</strong><p>{report.details || "No additional details were provided."}</p></div></section>
          <section className="listing-section"><div className="section-heading"><span>2</span><div><h2>Current listing</h2><p>Check the current public state before deciding.</p></div></div><dl className="review-facts"><div><dt>Status</dt><dd>{label(property.status)}</dd></div><div><dt>Type</dt><dd>{property.property_type ? label(property.property_type) : "—"}</dd></div><div><dt>Rent</dt><dd>{property.rent_bdt ? `৳${property.rent_bdt.toLocaleString("en-BD")}` : "—"}</dd></div><div><dt>Address</dt><dd>{property.address_text || "—"}</dd></div></dl><Link className="text-link" href={`/homes/${property.id}`}>Open public listing</Link></section>
        </div>
        <aside className="moderation-sidebar"><ReportModerationActions reportId={report.id} reviewerId={auth.userId} /></aside>
      </section>
    </main>
  );
}
