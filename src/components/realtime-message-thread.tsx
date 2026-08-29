"use client";

import { startTransition, useEffect, useMemo, useOptimistic, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { MessageComposer, friendlyMessageError, type ChatMessage } from "@/components/message-composer";
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
  const [optimisticMessages, addOptimisticMessage] = useOptimistic(messages, (current, next: ChatMessage) => mergeMessage(current, next));
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
    node.scrollTo({ top: node.scrollHeight, behavior: optimisticMessages.length > initialMessages.length ? "smooth" : "auto" });
  }, [initialMessages.length, optimisticMessages.length]);

  async function sendMessage(text: string) {
    let resultError: string | undefined;

    await new Promise<void>((resolve) => {
      startTransition(async () => {
        const optimisticMessage: ChatMessage = {
          id: `optimistic-${crypto.randomUUID()}`,
          sender_id: userId,
          body: text,
          created_at: new Date().toISOString(),
          pending: true,
        };
        addOptimisticMessage(optimisticMessage);

        const { data, error } = await supabase
          .from("messages")
          .insert({
            conversation_id: conversationId,
            sender_id: userId,
            body: text,
          })
          .select("id, sender_id, body, created_at")
          .single();

        if (error) {
          resultError = friendlyMessageError(error.message);
          resolve();
          return;
        }

        setMessages((current) => mergeMessage(current, data as ChatMessage));
        resolve();
      });
    });

    return resultError ? { error: resultError } : {};
  }

  return (
    <section className="thread-panel realtime-thread-panel">
      <div className="thread-live-bar" aria-live="polite">
        <span className={`thread-live-dot ${connectionState}`} aria-hidden="true" />
        <span>{connectionState === "live" ? "Live conversation" : connectionState === "connecting" ? "Connecting live updates…" : "Live updates interrupted"}</span>
      </div>

      <div className="message-list" ref={listRef}>
        {!optimisticMessages.length && <div className="renter-empty">No messages yet. Send the first message about this property.</div>}
        {optimisticMessages.map((message) => (
          <div className={`message-row${message.sender_id === userId ? " mine" : ""}${message.pending ? " pending" : ""}`} key={message.id}>
            <div className="message-bubble">
              {message.body}
              <small>{message.pending ? "Sending…" : new Date(message.created_at).toLocaleString("en-BD")}</small>
            </div>
          </div>
        ))}
      </div>

      <MessageComposer onSend={sendMessage} />
    </section>
  );
}
