import Link from "next/link";
import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { RealtimeMessageThread } from "@/components/realtime-message-thread";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Conversation = {
  id: string;
  property_id: string;
  renter_id: string;
  owner_id: string;
  renter_display_name: string | null;
  owner_display_name: string | null;
  property_title: string | null;
};

type Message = { id: string; sender_id: string; body: string; created_at: string };

export default async function MessageThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  const { id } = await params;
  const supabase = (await createClient()) as unknown as SupabaseClient;

  const { data: conversationData } = await supabase
    .from("conversations")
    .select("id, property_id, renter_id, owner_id, renter_display_name, owner_display_name, property_title")
    .eq("id", id)
    .maybeSingle();

  const conversation = conversationData as Conversation | null;
  if (!conversation) notFound();

  const readField = auth.userId === conversation.renter_id ? "renter_last_read_at" : "owner_last_read_at";
  await supabase.from("conversations").update({ [readField]: new Date().toISOString() }).eq("id", conversation.id);

  const { data: messageRows } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true });

  const messages = (messageRows ?? []) as Message[];
  const otherName = auth.userId === conversation.renter_id ? conversation.owner_display_name : conversation.renter_display_name;

  return (
    <main className="messages-page">
      <div className="thread-shell">
        <header className="thread-header">
          <div><Link className="text-link" href="/messages">← Messages</Link><h1>{otherName || "RentHomeBD user"}</h1><p>{conversation.property_title || "Rental property"}</p></div>
          <Link className="secondary-button link-button thread-property-link" href={`/homes/${conversation.property_id}`}>View property</Link>
        </header>

        <RealtimeMessageThread
          conversationId={conversation.id}
          userId={auth.userId}
          readField={readField}
          initialMessages={messages}
        />
      </div>
    </main>
  );
}
