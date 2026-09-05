import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AlertTriangle, ArrowRight, Bookmark, Compass, FileCheck2, FileEdit, Home, MessageCircle, Search, ShieldCheck } from "lucide-react";

import { ActionButton, ActionLink } from "@/components/action";
import { ProductNavigation } from "@/components/product-navigation";
import { RenterPreferenceForm } from "@/components/renter-preference-form";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";

const tenantLabels: Record<string, string> = {
  family: "Family",
  bachelor: "Bachelor",
  student: "Student",
  job_holder: "Job holder",
  everyone: "Everyone",
};

type InboxUnreadRow = { unread_count?: number | string | null };
type OwnerStatusRow = { status: string };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const auth = await requireUser();
  const params = await searchParams;
  const canList = auth.profile.primary_role === "owner" || auth.profile.primary_role === "agent";
  const isRenter = auth.profile.primary_role === "renter";
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const [
    { data: moderatorMembership },
    { data: trustProfile },
    { count: savedHomeCount },
    { count: savedSearchCount },
    { data: unreadInbox },
  ] = await Promise.all([
    supabase.from("moderators").select("user_id").eq("user_id", auth.userId).maybeSingle(),
    supabase.from("profiles").select("phone_verified_at, role_verified_at, role_verified_role, preferred_tenant_type").eq("id", auth.userId).maybeSingle(),
    supabase.from("saved_properties").select("property_id", { count: "exact", head: true }).eq("user_id", auth.userId),
    supabase.from("saved_searches").select("id", { count: "exact", head: true }).eq("user_id", auth.userId),
    supabase.rpc("get_message_inbox", { search_text: null, unread_only: true }),
  ]);

  let ownerProperties: OwnerStatusRow[] = [];
  if (canList) {
    const { data } = await supabase.from("properties").select("status").eq("owner_id", auth.userId);
    ownerProperties = (data ?? []) as OwnerStatusRow[];
  }

  const roleVerified = Boolean(
    trustProfile?.role_verified_at && trustProfile?.role_verified_role === auth.profile.primary_role,
  );
  const preferredTenant = trustProfile?.preferred_tenant_type as string | null | undefined;
  const phoneVerified = Boolean(trustProfile?.phone_verified_at);
  const unreadMessageCount = ((unreadInbox ?? []) as InboxUnreadRow[]).reduce((sum, row) => sum + Number(row.unread_count ?? 0), 0);
  const liveListingCount = ownerProperties.filter((row) => row.status === "available").length;
  const listingAttentionCount = ownerProperties.filter((row) => row.status === "pending_confirmation" || row.status === "rejected").length;
  const reviewListingCount = ownerProperties.filter((row) => row.status === "pending_review").length;
  const draftListingCount = ownerProperties.filter((row) => row.status === "draft").length;
  const ownerNeedsTrustAttention = canList && (!phoneVerified || !roleVerified);

  const renterNextAction = unreadMessageCount > 0
    ? {
        eyebrow: "Conversation waiting",
        title: `${unreadMessageCount} unread message${unreadMessageCount === 1 ? "" : "s"} need your attention.`,
        copy: "Continue the rental conversations that are already moving forward.",
        href: "/messages?filter=unread",
        label: "Open unread messages",
        icon: MessageCircle,
      }
    : (savedHomeCount ?? 0) > 0
      ? {
          eyebrow: "Shortlist ready",
          title: `Compare your ${savedHomeCount} saved home${savedHomeCount === 1 ? "" : "s"}.`,
          copy: "Return to your shortlist before starting another search.",
          href: "/saved",
          label: "Review saved homes",
          icon: Bookmark,
        }
      : (savedSearchCount ?? 0) > 0
        ? {
            eyebrow: "Search ready to reopen",
            title: `You have ${savedSearchCount} saved search${savedSearchCount === 1 ? "" : "es"}.`,
            copy: "Reopen a saved map area and see what is currently available there.",
            href: "/saved",
            label: "Open saved searches",
            icon: Search,
          }
        : {
            eyebrow: "Start here",
            title: "Explore homes around the places that matter to you.",
            copy: "Use the live Dhaka map, renter-fit signals, and exact location filters to build your shortlist.",
            href: "/homes",
            label: "Explore live map",
            icon: Compass,
          };

  const ownerNextAction = listingAttentionCount > 0
    ? {
        eyebrow: "Listings need action",
        title: `${listingAttentionCount} propert${listingAttentionCount === 1 ? "y needs" : "ies need"} your attention.`,
        copy: "Reconfirm availability or address moderator feedback so renters can see accurate listings.",
        href: "/owner?status=attention",
        label: "Review properties",
        icon: AlertTriangle,
      }
    : unreadMessageCount > 0
      ? {
          eyebrow: "Renters are waiting",
          title: `${unreadMessageCount} unread message${unreadMessageCount === 1 ? "" : "s"} in your inbox.`,
          copy: "Respond while the renter is actively considering the property.",
          href: "/messages?filter=unread",
          label: "Open unread messages",
          icon: MessageCircle,
        }
      : ownerNeedsTrustAttention
        ? {
            eyebrow: "Trust setup",
            title: "Complete your account trust signals.",
            copy: "Phone and role verification make your status clearer when renters review a listing.",
            href: "/account/phone",
            label: "Review trust setup",
            icon: ShieldCheck,
          }
        : {
            eyebrow: "Portfolio ready",
            title: liveListingCount > 0 ? `${liveListingCount} live propert${liveListingCount === 1 ? "y is" : "ies are"} discoverable.` : "Create the next property renters can discover.",
            copy: liveListingCount > 0 ? "Keep listings fresh and monitor conversations as renters discover them." : "Build a guided listing, add the exact map pin, and submit it for moderation.",
            href: liveListingCount > 0 ? "/owner" : "/owner/properties/new",
            label: liveListingCount > 0 ? "Manage portfolio" : "Create a listing",
            icon: Home,
          };

  const NextIcon = isRenter ? renterNextAction.icon : ownerNextAction.icon;
  const nextAction = isRenter ? renterNextAction : ownerNextAction;

  return (
    <main className={`shell dashboard-shell renter-dashboard-shell${!isRenter ? " owner-dashboard-shell" : ""}`}>
      <ProductNavigation authenticated canList={canList} current="dashboard" />
      <section className={`dashboard-card renter-dashboard-card${!isRenter ? " owner-dashboard-card" : ""}`}>
        <div className={`dashboard-header renter-dashboard-header${!isRenter ? " owner-dashboard-header" : ""}`}>
          <div>
            <p className="eyebrow">{isRenter ? "Renter workspace" : canList ? "Owner workspace" : "Account dashboard"}</p>
            <h1 className="dashboard-title">Welcome{auth.profile.display_name ? `, ${auth.profile.display_name}` : ""}.</h1>
            <p className="intro">{isRenter ? "Your next useful rental action is surfaced first." : canList ? "See what needs attention across listings, messages, and trust." : "Your account tools are ready."}</p>
          </div>
        </div>

        {params.error === "owner-role-required" && <p className="auth-message">Property management is available to owner and agent accounts.</p>}
        {params.error === "moderator-role-required" && <p className="auth-message">Moderation access is limited to explicitly assigned reviewer accounts.</p>}

        {(isRenter || canList) && (
          <section className={`dashboard-next-action${!isRenter ? " owner-next-action" : ""}`} aria-labelledby="dashboard-next-heading">
            <div className="dashboard-next-icon"><NextIcon size={23} aria-hidden="true" /></div>
            <div className="dashboard-next-copy">
              <span>{nextAction.eyebrow}</span>
              <h2 id="dashboard-next-heading">{nextAction.title}</h2>
              <p>{nextAction.copy}</p>
            </div>
            <ActionLink href={nextAction.href}>{nextAction.label}<ArrowRight size={15} aria-hidden="true" /></ActionLink>
          </section>
        )}

        {isRenter && (
          <>
            <section className="renter-account-summary dashboard-metric-grid" aria-label="Rental search overview">
              <Link href="/saved" className="dashboard-metric-card"><span>Saved homes</span><strong>{savedHomeCount ?? 0}</strong><p>Shortlist and compare.</p></Link>
              <Link href="/saved" className="dashboard-metric-card"><span>Saved searches</span><strong>{savedSearchCount ?? 0}</strong><p>Reopen map areas.</p></Link>
              <Link href="/messages?filter=unread" className={`dashboard-metric-card${unreadMessageCount ? " attention" : ""}`}><span>Unread messages</span><strong>{unreadMessageCount}</strong><p>{unreadMessageCount ? "Conversation waiting." : "Inbox is clear."}</p></Link>
              <a href="#renter-fit" className={`dashboard-metric-card${preferredTenant ? " complete" : " attention"}`}><span>Renter fit</span><strong>{preferredTenant ? tenantLabels[preferredTenant] ?? preferredTenant.replaceAll("_", " ") : "Optional"}</strong><p>{preferredTenant ? "Used for ranking." : "Add for better ranking."}</p></a>
            </section>

            <section className="renter-dashboard-grid dashboard-secondary-grid">
              <div className="renter-journey-card" id="renter-fit">
                <div className="section-heading"><span>✓</span><div><h2>Renter fit preference</h2><p>{preferredTenant ? "Your current preference is active across map ranking." : "Add a renter type once to personalize compatible-home ranking."}</p></div></div>
                {preferredTenant ? (
                  <div className="renter-preference-compact">
                    <div><span>Current preference</span><strong>{tenantLabels[preferredTenant] ?? preferredTenant.replaceAll("_", " ")}</strong></div>
                    <details><summary>Change preference</summary><RenterPreferenceForm userId={auth.userId} initialPreference={preferredTenant} /></details>
                  </div>
                ) : <RenterPreferenceForm userId={auth.userId} initialPreference={null} />}
              </div>

              <div className="renter-journey-card dashboard-trust-card">
                <div className="renter-journey-copy">
                  <span className="renter-journey-kicker">Account trust</span>
                  <h2>{phoneVerified ? "Phone verified" : "Phone verification available"}</h2>
                  <p>{phoneVerified ? "Your phone trust signal is active." : "Verify when you want the phone-verified trust signal or protected contact sharing requires it."}</p>
                </div>
                <div className="renter-journey-actions"><ActionLink variant="text" href="/account/phone">{phoneVerified ? "Manage phone →" : "Verify phone →"}</ActionLink></div>
              </div>
            </section>
          </>
        )}

        {!isRenter && canList && (
          <section className="owner-dashboard-workspace owner-dashboard-workspace-redesign">
            <div className="owner-dashboard-action-grid owner-dashboard-metrics" aria-label="Owner portfolio overview">
              <Link className={`owner-dashboard-action-card${listingAttentionCount ? " needs-attention" : ""}`} href="/owner?status=attention"><span><AlertTriangle size={18} /></span><div><small>Need attention</small><strong>{listingAttentionCount} listings</strong><p>Reconfirm or address feedback.</p></div><ArrowRight size={17} /></Link>
              <Link className="owner-dashboard-action-card" href="/owner?status=available"><span><Home size={18} /></span><div><small>Live now</small><strong>{liveListingCount} listings</strong><p>Discoverable in renter search.</p></div><ArrowRight size={17} /></Link>
              <Link className="owner-dashboard-action-card" href="/owner?status=pending_review"><span><FileCheck2 size={18} /></span><div><small>In moderation</small><strong>{reviewListingCount} listings</strong><p>Waiting for review.</p></div><ArrowRight size={17} /></Link>
              <Link className="owner-dashboard-action-card" href="/owner?status=draft"><span><FileEdit size={18} /></span><div><small>Drafts</small><strong>{draftListingCount} listings</strong><p>Continue when ready.</p></div><ArrowRight size={17} /></Link>
              <Link className={`owner-dashboard-action-card${unreadMessageCount ? " needs-attention" : ""}`} href="/messages?filter=unread"><span><MessageCircle size={18} /></span><div><small>Unread messages</small><strong>{unreadMessageCount}</strong><p>{unreadMessageCount ? "Renters are waiting." : "Inbox is clear."}</p></div><ArrowRight size={17} /></Link>
            </div>

            <section className="owner-dashboard-status" aria-label="Owner trust status">
              <article className={ownerNeedsTrustAttention ? "needs-attention" : "is-ready"}>
                <span className="owner-dashboard-status-icon"><ShieldCheck size={18} /></span>
                <div>
                  <small>Trust signals</small>
                  <strong>{ownerNeedsTrustAttention ? "Setup incomplete" : "Phone and role verified"}</strong>
                  <p>{phoneVerified ? "Phone verified" : "Phone not verified"} · {roleVerified ? `${auth.profile.primary_role} role verified` : `${auth.profile.primary_role} role awaiting verification`}.</p>
                  {!phoneVerified && <ActionLink variant="text" href="/account/phone">Verify phone →</ActionLink>}
                </div>
              </article>
            </section>
          </section>
        )}

        {!isRenter && !canList && (
          <section className="listing-section dashboard-trust-section">
            <div className="section-heading"><span>✓</span><div><h2>Trust status</h2><p>Account verification signals.</p></div></div>
            <div className="property-tags"><span>{phoneVerified ? "Phone verified" : "Phone not verified"}</span></div>
            <div className="dashboard-actions dashboard-trust-actions"><ActionLink variant="secondary" href="/account/phone">{phoneVerified ? "Manage verified phone" : "Verify phone"}</ActionLink></div>
          </section>
        )}

        <div className="dashboard-account-tools">
          <div className="dashboard-account-links">
            {!isRenter && !canList && <ActionLink href="/messages">Messages</ActionLink>}
            {!isRenter && <ActionLink variant="secondary" href="/saved">Saved homes & searches</ActionLink>}
            {moderatorMembership && <ActionLink variant="secondary" href="/moderation">Open moderation queue</ActionLink>}
            <ActionLink variant="text" href="/">Back to home</ActionLink>
          </div>
          <form action="/auth/signout" method="post"><ActionButton variant="secondary" type="submit">Sign out</ActionButton></form>
        </div>
      </section>
    </main>
  );
}
