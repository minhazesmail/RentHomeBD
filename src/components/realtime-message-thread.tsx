"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { MessageComposer, type ChatMessage } from "@/components/message-composer";
import { createClient } from "@/lib/supabase/client";

type Props = {
  conversationId: string;
  userId: string;
  readField: "renter_last_read_at" | "owner_last_read_at";
  initialMessages: ChatMessage[];
};

type ConnectionState = "connecting" | "live" | "offline";

function mergeMessage(messages: ChatMessage[], next: ChatMessage) {
  if (messages.some((message) => message.id === next.id)) return messages;
  return [...messages, next].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

export function RealtimeMessageThread({ conversationId, userId, readField, initialMessages }: Props) {
  const supabase = useMemo(() => createClient() as unknown as SupabaseClient, []);
  const [messages, setMessages] = useState(initialMessages);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const next = payload.new as ChatMessage;
          setMessages((current) => mergeMessage(current, next));

          if (next.sender_id !== userId) {
            void supabase
              .from("conversations")
              .update({ [readField]: next.created_at })
              .eq("id", conversationId);
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setConnectionState("live");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setConnectionState("offline");
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, readField, supabase, userId]);

  useEffect(() => {
    const node = listRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: messages.length > initialMessages.length ? "smooth" : "auto" });
  }, [initialMessages.length, messages.length]);

  return (
    <section className="thread-panel realtime-thread-panel">
      <div className="thread-live-bar" aria-live="polite">
        <span className={`thread-live-dot ${connectionState}`} aria-hidden="true" />
        <span>{connectionState === "live" ? "Live conversation" : connectionState === "connecting" ? "Connecting live updates…" : "Live updates interrupted"}</span>
      </div>

      <div className="message-list" ref={listRef}>
        {!messages.length && <div className="renter-empty">No messages yet. Send the first message about this property.</div>}
        {messages.map((message) => (
          <div className={`message-row${message.sender_id === userId ? " mine" : ""}`} key={message.id}>
            <div className="message-bubble">
              {message.body}
              <small>{new Date(message.created_at).toLocaleString("en-BD")}</small>
            </div>
          </div>
        ))}
      </div>

      <MessageComposer
        conversationId={conversationId}
        userId={userId}
        onSent={(message) => setMessages((current) => mergeMessage(current, message))}
      />
    </section>
  );
}
