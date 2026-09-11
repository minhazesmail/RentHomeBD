import Link from "next/link";
import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { MessagesInboxPane } from "@/components/messages-inbox-pane";
import { ProductNavigation } from "@/components/product-navigation";
import { RealtimeMessageThread } from "@/components/realtime-message-thread";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const THREAD_PAGE_SIZE = 50;
const MESSAGE_MEDIA_TTL_SECONDS = 300;

type Conversation = {
  id: string;
  property_id: string;
  renter_id: string;
  owner_id: string;
  renter_display_name: string | null;
  owner_display_name: string | null;
  property_title: string | null;
  renter_last_read_at: string | null;
  owner_last_read_at: string | null;
};

type Message = { id: string; sender_id: string; body: string; created_at: string };
type PropertySummary = { rent_bdt: number | null; available_from: string | null };
type ThreadSearchParams = { q?: string | string[]; filter?: string | string[] };

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function propertyAvailability(value: string | null | undefined) {
  if (!value) return "Availability not listed";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Availability not listed";
  if (date.getTime() <= Date.now()) return "Available now";
  return `Available ${new Intl.DateTimeFormat("en-BD", { day: "numeric", month: "short", timeZone: "Asia/Dhaka" }).format(date)}`;
}

export default async function MessageThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<ThreadSearchParams>;
}) {
  const auth = await requireUser();
  const canList = auth.profile.primary_role === "owner" || auth.profile.primary_role === "agent";
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const query = (firstValue(resolvedSearchParams.q) || "").trim().slice(0, 120);
  const unreadOnly = firstValue(resolvedSearchParams.filter) === "unread";
  const supabase = (await createClient()) as unknown as SupabaseClient;

  const { data: conversationData } = await supabase
    .from("conversations")
    .select("id, property_id, renter_id, owner_id, renter_display_name, owner_display_name, property_title, renter_last_read_at, owner_last_read_at")
    .eq("id", id)
    .maybeSingle();

  const conversation = conversationData as Conversation | null;
  if (!conversation) notFound();

  const viewerIsRenter = auth.userId === conversation.renter_id;
  const readField = viewerIsRenter ? "renter_last_read_at" : "owner_last_read_at";
  const otherReadField = viewerIsRenter ? "owner_last_read_at" : "renter_last_read_at";
  const otherReadAt = viewerIsRenter ? conversation.owner_last_read_at : conversation.renter_last_read_at;
  const otherUserId = viewerIsRenter ? conversation.owner_id : conversation.renter_id;

  await supabase.from("conversations").update({ [readField]: new Date().toISOString() }).eq("id", conversation.id);

  const [{ data: messageRows }, { data: otherProfile }, { data: propertyMedia }, { data: propertySummaryRows }] = await Promise.all([
    supabase
      .from("messages")
      .select("id, sender_id, body, created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: false })
      .limit(THREAD_PAGE_SIZE + 1),
    supabase.from("profiles").select("phone_verified_at").eq("id", otherUserId).maybeSingle(),
    supabase
      .from("property_media")
      .select("storage_path")
      .eq("property_id", conversation.property_id)
      .eq("media_type", "photo")
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase.rpc("get_public_property_detail", { property_uuid: conversation.property_id }),
  ]);

  const newestFirst = (messageRows ?? []) as Message[];
  const hasOlderMessages = newestFirst.length > THREAD_PAGE_SIZE;
  const messages = newestFirst.slice(0, THREAD_PAGE_SIZE).reverse();
  const otherName = viewerIsRenter ? conversation.owner_display_name : conversation.renter_display_name;
  const otherRole = viewerIsRenter ? "Owner / agent" : "Renter";
  const phoneVerified = Boolean(otherProfile?.phone_verified_at);
  const initial = (otherName || "R").slice(0, 1).toUpperCase();
  const propertyTitle = conversation.property_title || "Rental property";
  const propertySummary = (propertySummaryRows?.[0] ?? null) as PropertySummary | null;
  const propertyRent = propertySummary?.rent_bdt ? `৳${Number(propertySummary.rent_bdt).toLocaleString("en-BD")}/mo` : "Rent on request";
  const availability = propertyAvailability(propertySummary?.available_from);
  const { data: signedCover } = propertyMedia?.storage_path
    ? await supabase.storage.from("property-media").createSignedUrl(propertyMedia.storage_path as string, MESSAGE_MEDIA_TTL_SECONDS)
    : { data: null };
  const propertyCoverUrl = signedCover?.signedUrl ?? null;

  return (
    <main className="messages-page messages-thread-route">
      <ProductNavigation authenticated canList={canList} current="messages" />
      <div className="messages-workspace-shell">
        <MessagesInboxPane
          userId={auth.userId}
          query={query}
          unreadOnly={unreadOnly}
          currentConversationId={conversation.id}
        />

        <section className="messages-thread-pane" aria-label={`Conversation with ${otherName || "NearBasha user"}`}>
          <div className="thread-shell messages-thread-shell">
            <header className="thread-header modern-thread-header">
              <div className="thread-identity-wrap">
                <Link className="thread-back-button" href="/messages" aria-label="Back to messages">←</Link>
                <div className="thread-avatar" aria-hidden="true">{initial}</div>
                <div className="thread-identity">
                  <div className="thread-name-row">
                    <h1>{otherName || "NearBasha user"}</h1>
                    {phoneVerified && <span className="message-verified-badge" title="Phone verified">✓ Verified</span>}
                  </div>
                  <p>{otherRole}</p>
                </div>
              </div>
              <Link className="thread-property-context" href={`/homes/${conversation.property_id}`} aria-label={`View ${propertyTitle}`}>
                <span className="thread-property-media" aria-hidden="true">
                  {propertyCoverUrl ? <img src={propertyCoverUrl} alt="" /> : <span>Home</span>}
                </span>
                <span className="thread-property-copy">
                  <small>Conversation about</small>
                  <strong>{propertyTitle}</strong>
                  <span>{propertyRent} · {availability}</span>
                </span>
              </Link>
            </header>

            <RealtimeMessageThread
              conversationId={conversation.id}
              userId={auth.userId}
              readField={readField}
              otherReadField={otherReadField}
              initialOtherReadAt={otherReadAt}
              initialMessages={messages}
              initialHasOlderMessages={hasOlderMessages}
              pageSize={THREAD_PAGE_SIZE}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
