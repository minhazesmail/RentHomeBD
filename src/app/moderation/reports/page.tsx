import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireModerator } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const reasonLabels: Record<string, string> = {
  fake_listing: "Fake or misleading",
  wrong_location: "Wrong location",
  unavailable: "Already unavailable",
  scam_suspicion: "Possible scam",
  discrimination: "Discrimination",
  inappropriate_content: "Inappropriate content",
  duplicate: "Duplicate listing",
  other: "Other",
};

export default async function ReportQueuePage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  await requireModerator();
  const params = await searchParams;
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const { data: reports } = await supabase.from("listing_reports").select("id, property_id, reason, details, created_at").eq("status", "open").order("created_at", { ascending: true });

  const propertyIds = [...new Set((reports ?? []).map((report) => report.property_id))];
  const { data: properties } = propertyIds.length
    ? await supabase.from("properties").select("id, title, address_text, status").in("id", propertyIds)
    : { data: [] };
  const propertyById = new Map((properties ?? []).map((property) => [property.id, property]));

  return (
    <main className="owner-shell">
      <header className="owner-header">
        <div><Link className="brand-link compact-brand" href="/">RentHomeBD</Link><p className="eyebrow">Trust & safety</p><h1 className="owner-title">Listing reports</h1><p className="intro">Review renter-submitted safety and accuracy reports. Hiding a listing removes it from public search immediately.</p></div>
        <div className="owner-header-actions"><Link className="secondary-button link-button" href="/moderation">Listing reviews</Link><Link className="secondary-button link-button" href="/dashboard">Dashboard</Link></div>
      </header>

      {params.notice === "hide_listing" && <div className="success-message">Listing hidden and report closed.</div>}
      {(params.notice === "dismiss" || params.notice === "resolve") && <div className="success-message">Report closed and decision recorded.</div>}

      <section className="property-list-panel">
        {!reports?.length ? <div className="empty-state"><div className="empty-icon">✓</div><h2>No open reports</h2><p>The trust and safety queue is clear.</p></div> : (
          <div className="property-list">{reports.map((report) => {
            const property = propertyById.get(report.property_id);
            return <Link className="property-row" href={`/moderation/reports/${report.id}`} key={report.id}><div className="property-row-main"><strong>{property?.title || "Reported listing"}</strong><span>{reasonLabels[report.reason] || report.reason}{report.details ? ` · ${report.details}` : ""}</span></div><div className="property-row-meta"><span className="status-pill status-rejected">Open report</span><span>{new Date(report.created_at).toLocaleDateString("en-BD")}</span></div></Link>;
          })}</div>
        )}
      </section>
    </main>
  );
}
