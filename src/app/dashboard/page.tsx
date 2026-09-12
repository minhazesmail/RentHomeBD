import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bookmark,
  Compass,
  FileCheck2,
  FileEdit,
  Home,
  MessageCircle,
  Search,
  ShieldCheck,
} from "lucide-react";

import { ActionButton, ActionLink } from "@/components/action";
import { ProductNavigation } from "@/components/product-navigation";
import { RenterPreferenceForm } from "@/components/renter-preference-form";
import { formatDashboardText, getDashboardCopy } from "@/i18n/dashboard-copy";
import { formatNumber } from "@/i18n/format";
import { getDictionary } from "@/i18n/get-dictionary";
import { getLocale } from "@/i18n/get-locale";
import { requireUser } from "@/lib/auth";
import { listingNeedsAttention } from "@/lib/listing-freshness";
import { serverNowMs } from "@/lib/server-clock";
import { createClient } from "@/lib/supabase/server";
import { normalizeTenantType, type TenantType } from "@/lib/tenant-match";

export const dynamic = "force-dynamic";

type SearchTenantType = Exclude<TenantType, "everyone">;
type InboxUnreadRow = { unread_count?: number | string | null };
type OwnerStatusRow = { status: string; expires_at: string | null };

/** Swallow query failures so a partial schema/RPC never blanks the whole dashboard. */
async function settledData<T>(promise: PromiseLike<{ data: T; error: unknown }>) {
  try {
    const { data, error } = await promise;
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

async function settledCount(promise: PromiseLike<{ count: number | null; error: unknown }>) {
  try {
    const { count, error } = await promise;
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [auth, locale] = await Promise.all([requireUser(), getLocale()]);
  const params = await searchParams;
  const dictionary = getDictionary(locale);
  const copy = getDashboardCopy(locale);
  const canList = auth.profile.primary_role === "owner" || auth.profile.primary_role === "agent";
  const isRenter = auth.profile.primary_role === "renter";
  const nowMs = serverNowMs();
  const supabase = await createClient();

  const [moderatorMembership, trustProfile, savedHomeCount, savedSearchCount, unreadInbox] = await Promise.all([
    settledData(supabase.from("moderators").select("user_id").eq("user_id", auth.userId).maybeSingle()),
    settledData(
      supabase
        .from("profiles")
        .select("phone_verified_at, role_verified_at, role_verified_role, preferred_tenant_type")
        .eq("id", auth.userId)
        .maybeSingle(),
    ),
    settledCount(supabase.from("saved_properties").select("property_id", { count: "exact", head: true }).eq("user_id", auth.userId)),
    settledCount(supabase.from("saved_searches").select("id", { count: "exact", head: true }).eq("user_id", auth.userId)),
    settledData(supabase.rpc("get_message_inbox", { search_text: null, unread_only: true })),
  ]);

  let ownerProperties: OwnerStatusRow[] = [];
  if (canList) {
    const data = await settledData(supabase.from("properties").select("status, expires_at").eq("owner_id", auth.userId));
    ownerProperties = (data ?? []) as OwnerStatusRow[];
  }

  const roleVerified = Boolean(
    trustProfile?.role_verified_at && trustProfile?.role_verified_role === auth.profile.primary_role,
  );
  const normalizedPreference = normalizeTenantType(trustProfile?.preferred_tenant_type);
  const preferredTenant: SearchTenantType | null = normalizedPreference && normalizedPreference !== "everyone" ? normalizedPreference : null;
  const phoneVerified = Boolean(trustProfile?.phone_verified_at);
  const unreadMessageCount = ((unreadInbox ?? []) as InboxUnreadRow[]).reduce((sum, row) => sum + Number(row.unread_count ?? 0), 0);
  const liveListingCount = ownerProperties.filter((row) => row.status === "available").length;
  const listingAttentionCount = ownerProperties.filter((row) => listingNeedsAttention(row, nowMs)).length;
  const reviewListingCount = ownerProperties.filter((row) => row.status === "pending_review").length;
  const draftListingCount = ownerProperties.filter((row) => row.status === "draft").length;
  const ownerNeedsTrustAttention = canList && (!phoneVerified || !roleVerified);
  const tenantLabels: Record<SearchTenantType, string> = {
    family: dictionary.common.tenant.family,
    bachelor: dictionary.common.tenant.bachelor,
    student: dictionary.common.tenant.student,
    job_holder: dictionary.common.tenant.jobHolder,
  };
  const preferredTenantLabel = preferredTenant ? tenantLabels[preferredTenant] : null;
  const localizedUnreadCount = formatNumber(unreadMessageCount, locale);
  const localizedSavedHomeCount = formatNumber(savedHomeCount, locale);
  const localizedSavedSearchCount = formatNumber(savedSearchCount, locale);
  const localizedAttentionCount = formatNumber(listingAttentionCount, locale);
  const localizedLiveCount = formatNumber(liveListingCount, locale);

  const renterNextAction = unreadMessageCount > 0
    ? {
        eyebrow: copy.renter.nextUnreadEyebrow,
        title: formatDashboardText(unreadMessageCount === 1 ? copy.renter.nextUnreadOne : copy.renter.nextUnreadMany, { count: localizedUnreadCount }),
        copy: copy.renter.nextUnreadCopy,
        href: "/messages?filter=unread",
        label: copy.renter.nextUnreadLabel,
        icon: MessageCircle,
      }
    : savedHomeCount > 0
      ? {
          eyebrow: copy.renter.nextHomesEyebrow,
          title: formatDashboardText(savedHomeCount === 1 ? copy.renter.nextHomesOne : copy.renter.nextHomesMany, { count: localizedSavedHomeCount }),
          copy: copy.renter.nextHomesCopy,
          href: "/saved",
          label: copy.renter.nextHomesLabel,
          icon: Bookmark,
        }
      : savedSearchCount > 0
        ? {
            eyebrow: copy.renter.nextSearchEyebrow,
            title: formatDashboardText(savedSearchCount === 1 ? copy.renter.nextSearchOne : copy.renter.nextSearchMany, { count: localizedSavedSearchCount }),
            copy: copy.renter.nextSearchCopy,
            href: "/saved",
            label: copy.renter.nextSearchLabel,
            icon: Search,
          }
        : {
            eyebrow: copy.renter.nextStartEyebrow,
            title: copy.renter.nextStartTitle,
            copy: copy.renter.nextStartCopy,
            href: "/homes",
            label: copy.renter.nextStartLabel,
            icon: Compass,
          };

  const ownerNextAction = listingAttentionCount > 0
    ? {
        eyebrow: copy.owner.nextAttentionEyebrow,
        title: formatDashboardText(listingAttentionCount === 1 ? copy.owner.nextAttentionOne : copy.owner.nextAttentionMany, { count: localizedAttentionCount }),
        copy: copy.owner.nextAttentionCopy,
        href: "/owner?status=attention",
        label: copy.owner.nextAttentionLabel,
        icon: AlertTriangle,
      }
    : unreadMessageCount > 0
      ? {
          eyebrow: copy.owner.nextUnreadEyebrow,
          title: formatDashboardText(unreadMessageCount === 1 ? copy.owner.nextUnreadOne : copy.owner.nextUnreadMany, { count: localizedUnreadCount }),
          copy: copy.owner.nextUnreadCopy,
          href: "/messages?filter=unread",
          label: copy.owner.nextUnreadLabel,
          icon: MessageCircle,
        }
      : ownerNeedsTrustAttention
        ? {
            eyebrow: copy.owner.nextTrustEyebrow,
            title: copy.owner.nextTrustTitle,
            copy: copy.owner.nextTrustCopy,
            href: "/account/phone",
            label: copy.owner.nextTrustLabel,
            icon: ShieldCheck,
          }
        : {
            eyebrow: copy.owner.nextReadyEyebrow,
            title: liveListingCount > 0
              ? formatDashboardText(liveListingCount === 1 ? copy.owner.nextReadyOne : copy.owner.nextReadyMany, { count: localizedLiveCount })
              : copy.owner.nextCreateTitle,
            copy: liveListingCount > 0 ? copy.owner.nextReadyCopy : copy.owner.nextCreateCopy,
            href: liveListingCount > 0 ? "/owner" : "/owner/properties/new",
            label: liveListingCount > 0 ? copy.owner.managePortfolio : copy.owner.createListing,
            icon: Home,
          };

  const NextIcon = isRenter ? renterNextAction.icon : ownerNextAction.icon;
  const nextAction = isRenter ? renterNextAction : ownerNextAction;
  const roleLabel = auth.profile.primary_role === "owner"
    ? copy.common.owner
    : auth.profile.primary_role === "agent"
      ? copy.common.agent
      : auth.profile.primary_role === "renter"
        ? copy.common.renter
        : copy.common.account;

  return (
    <main className={`shell dashboard-shell renter-dashboard-shell${!isRenter ? " owner-dashboard-shell" : ""}`}>
      <ProductNavigation authenticated canList={canList} current="dashboard" />
      <section className={`dashboard-card renter-dashboard-card${!isRenter ? " owner-dashboard-card" : ""}`}>
        <div className={`dashboard-header renter-dashboard-header${!isRenter ? " owner-dashboard-header" : ""}`}>
          <div>
            <p className="eyebrow">{isRenter ? copy.common.renterWorkspace : canList ? copy.common.ownerWorkspace : copy.common.accountDashboard}</p>
            <h1 className="dashboard-title">
              {auth.profile.display_name
                ? formatDashboardText(copy.common.welcomeNamed, { name: auth.profile.display_name })
                : copy.common.welcome}
            </h1>
            <p className="intro">{isRenter ? copy.common.renterIntro : canList ? copy.common.ownerIntro : copy.common.accountIntro}</p>
          </div>
        </div>

        {params.error === "owner-role-required" && <p className="auth-message">{copy.common.ownerRoleRequired}</p>}
        {params.error === "moderator-role-required" && <p className="auth-message">{copy.common.moderatorRoleRequired}</p>}

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
            <section className="renter-account-summary dashboard-metric-grid" aria-label={copy.renter.overviewAria}>
              <Link href="/saved" className="dashboard-metric-card">
                <span>{copy.common.savedHomes}</span><strong>{localizedSavedHomeCount}</strong><p>{copy.common.shortlistCompare}</p>
              </Link>
              <Link href="/saved" className="dashboard-metric-card">
                <span>{copy.common.savedSearches}</span><strong>{localizedSavedSearchCount}</strong><p>{copy.common.reopenAreas}</p>
              </Link>
              <Link href="/messages?filter=unread" className={`dashboard-metric-card${unreadMessageCount ? " attention" : ""}`}>
                <span>{copy.common.unreadMessages}</span><strong>{localizedUnreadCount}</strong><p>{unreadMessageCount ? copy.common.conversationWaiting : copy.common.inboxClear}</p>
              </Link>
              <a href="#renter-fit" className={`dashboard-metric-card${preferredTenant ? " complete" : " attention"}`}>
                <span>{copy.renter.renterType}</span>
                <strong>{preferredTenantLabel ?? copy.renter.defaultNotSet}</strong>
                <p>{preferredTenant ? copy.renter.defaultActive : copy.renter.choosePerSearch}</p>
              </a>
            </section>

            <section className="renter-dashboard-grid dashboard-secondary-grid">
              <div className="renter-journey-card" id="renter-fit">
                <div className="section-heading">
                  <span>✓</span>
                  <div><h2>{copy.renter.preferenceTitle}</h2><p>{preferredTenant ? copy.renter.preferenceActive : copy.renter.preferenceMissing}</p></div>
                </div>
                {preferredTenant ? (
                  <div className="renter-preference-compact">
                    <div><span>{copy.renter.currentDefault}</span><strong>{preferredTenantLabel}</strong></div>
                    <details>
                      <summary>{copy.renter.changeDefault}</summary>
                      <RenterPreferenceForm userId={auth.userId} initialPreference={preferredTenant} />
                    </details>
                  </div>
                ) : (
                  <RenterPreferenceForm userId={auth.userId} initialPreference={null} />
                )}
              </div>

              <div className="renter-journey-card dashboard-trust-card">
                <div className="renter-journey-copy">
                  <span className="renter-journey-kicker">{copy.common.accountTrust}</span>
                  <h2>{phoneVerified ? copy.common.phoneVerified : copy.common.phoneAvailable}</h2>
                  <p>{phoneVerified ? copy.common.phoneSignalActive : copy.common.phoneVerifyHint}</p>
                </div>
                <div className="renter-journey-actions">
                  <ActionLink variant="text" href="/account/phone">{phoneVerified ? copy.common.managePhone : copy.common.verifyPhone}</ActionLink>
                </div>
              </div>
            </section>
          </>
        )}

        {!isRenter && canList && (
          <section className="owner-dashboard-workspace owner-dashboard-workspace-redesign">
            <div className="owner-dashboard-action-grid owner-dashboard-metrics" aria-label={copy.owner.overviewAria}>
              <Link className={`owner-dashboard-action-card${listingAttentionCount ? " needs-attention" : ""}`} href="/owner?status=attention">
                <span><AlertTriangle size={18} aria-hidden="true" /></span>
                <div><small>{copy.owner.needAttention}</small><strong>{formatDashboardText(listingAttentionCount === 1 ? copy.owner.listingOne : copy.owner.listingMany, { count: localizedAttentionCount })}</strong><p>{copy.owner.reconfirmOrFeedback}</p></div>
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link className="owner-dashboard-action-card" href="/owner?status=available">
                <span><Home size={18} aria-hidden="true" /></span>
                <div><small>{copy.owner.liveNow}</small><strong>{formatDashboardText(liveListingCount === 1 ? copy.owner.listingOne : copy.owner.listingMany, { count: localizedLiveCount })}</strong><p>{copy.owner.discoverable}</p></div>
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link className="owner-dashboard-action-card" href="/owner?status=pending_review">
                <span><FileCheck2 size={18} aria-hidden="true" /></span>
                <div><small>{copy.owner.inModeration}</small><strong>{formatDashboardText(reviewListingCount === 1 ? copy.owner.listingOne : copy.owner.listingMany, { count: formatNumber(reviewListingCount, locale) })}</strong><p>{copy.owner.waitingReview}</p></div>
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link className="owner-dashboard-action-card" href="/owner?status=draft">
                <span><FileEdit size={18} aria-hidden="true" /></span>
                <div><small>{copy.owner.drafts}</small><strong>{formatDashboardText(draftListingCount === 1 ? copy.owner.listingOne : copy.owner.listingMany, { count: formatNumber(draftListingCount, locale) })}</strong><p>{copy.owner.continueReady}</p></div>
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link className={`owner-dashboard-action-card${unreadMessageCount ? " needs-attention" : ""}`} href="/messages?filter=unread">
                <span><MessageCircle size={18} aria-hidden="true" /></span>
                <div><small>{copy.common.unreadMessages}</small><strong>{localizedUnreadCount}</strong><p>{unreadMessageCount ? copy.owner.rentersWaiting : copy.common.inboxClear}</p></div>
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>

            <section className="owner-dashboard-status" aria-label={copy.owner.trustAria}>
              <article className={ownerNeedsTrustAttention ? "needs-attention" : "is-ready"}>
                <span className="owner-dashboard-status-icon"><ShieldCheck size={18} aria-hidden="true" /></span>
                <div>
                  <small>{copy.owner.trustSignals}</small>
                  <strong>{ownerNeedsTrustAttention ? copy.owner.setupIncomplete : copy.owner.phoneAndRoleVerified}</strong>
                  <p>
                    {phoneVerified ? copy.common.phoneVerified : copy.owner.phoneNotVerified} · {formatDashboardText(roleVerified ? copy.owner.roleVerified : copy.owner.roleAwaiting, { role: roleLabel })}.
                  </p>
                  {!phoneVerified && <ActionLink variant="text" href="/account/phone">{copy.common.verifyPhone}</ActionLink>}
                </div>
              </article>
            </section>
          </section>
        )}

        {!isRenter && !canList && (
          <section className="listing-section dashboard-trust-section">
            <div className="section-heading"><span>✓</span><div><h2>{copy.generic.trustTitle}</h2><p>{copy.generic.trustDescription}</p></div></div>
            <div className="property-tags"><span>{phoneVerified ? copy.common.phoneVerified : copy.generic.phoneNotVerified}</span></div>
            <div className="dashboard-actions dashboard-trust-actions">
              <ActionLink variant="secondary" href="/account/phone">{phoneVerified ? copy.generic.manageVerifiedPhone : copy.generic.verifyPhone}</ActionLink>
            </div>
          </section>
        )}

        <div className="dashboard-account-tools">
          <div className="dashboard-account-links">
            {!isRenter && !canList && <ActionLink href="/messages">{copy.common.messages}</ActionLink>}
            {!isRenter && <ActionLink variant="secondary" href="/saved">{copy.common.savedWorkspace}</ActionLink>}
            {moderatorMembership && <ActionLink variant="secondary" href="/moderation">{copy.common.moderationQueue}</ActionLink>}
            <ActionLink variant="text" href="/">{copy.common.backHome}</ActionLink>
          </div>
          <form action="/auth/signout" method="post">
            <ActionButton variant="secondary" type="submit">{copy.common.signOut}</ActionButton>
          </form>
        </div>
      </section>
    </main>
  );
}
