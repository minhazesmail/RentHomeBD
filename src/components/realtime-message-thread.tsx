"use client";

import { startTransition, useEffect, useMemo, useOptimistic, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { MessageComposer, friendlyMessageError, type ChatMessage } from "@/components/message-composer";
import { createClient } from "@/lib/supabase/client";

type Props = {
  conversationId: string;
  userId: string;
  readField: "renter_last_read_at" | "owner_last_read_at";
  otherReadField: "renter_last_read_at" | "owner_last_read_at";
  initialOtherReadAt: string | null;
  initialMessages: ChatMessage[];
};

type ConnectionState = "connecting" | "live" | "offline";

function mergeMessage(messages: ChatMessage[], next: ChatMessage) {
  if (messages.some((message) => message.id === next.id)) return messages;
  return [...messages, next].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

export function RealtimeMessageThread({ conversationId, userId, readField, otherReadField, initialOtherReadAt, initialMessages }: Props) {
  const supabase = useMemo(() => createClient() as unknown as SupabaseClient, []);
  const [messages, setMessages] = useState(initialMessages);
  const [optimisticMessages, addOptimisticMessage] = useOptimistic(messages, (current, next: ChatMessage) => mergeMessage(current, next));
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [otherReadAt, setOtherReadAt] = useState(initialOtherReadAt);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const messageChannel = supabase
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

    const readChannel = supabase
      .channel(`conversation-read-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversations",
          filter: `id=eq.${conversationId}`,
        },
        (payload) => {
          const next = payload.new as Record<string, unknown>;
          const value = next[otherReadField];
          if (typeof value === "string") setOtherReadAt(value);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(messageChannel);
      void supabase.removeChannel(readChannel);
    };
  }, [conversationId, otherReadField, readField, supabase, userId]);

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
        {!optimisticMessages.length && <div className="renter-empty">No messages yet. Use a quick inquiry below or write your own message.</div>}
        {optimisticMessages.map((message) => {
          const mine = message.sender_id === userId;
          const read = mine && !message.pending && Boolean(otherReadAt && new Date(message.created_at) <= new Date(otherReadAt));
          return (
            <div className={`message-row${mine ? " mine" : ""}${message.pending ? " pending" : ""}`} key={message.id}>
              <div className="message-bubble">
                <div>{message.body}</div>
                <small className="message-status">
                  <span>{message.pending ? "Sending…" : new Date(message.created_at).toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" })}</span>
                  {mine && !message.pending && <span className={read ? "read-receipt read" : "read-receipt"}>{read ? "✓✓ Read" : "✓ Sent"}</span>}
                </small>
              </div>
            </div>
          );
        })}
      </div>

      <MessageComposer onSend={sendMessage} />
    </section>
  );
}
