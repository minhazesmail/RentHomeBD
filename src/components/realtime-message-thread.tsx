"use client";

import { startTransition, useEffect, useLayoutEffect, useMemo, useOptimistic, useRef, useState } from "react";
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
  initialHasOlderMessages: boolean;
  pageSize: number;
};

type ConnectionState = "connecting" | "live" | "offline";

function mergeMessage(messages: ChatMessage[], next: ChatMessage) {
  if (messages.some((message) => message.id === next.id)) return messages;
  return [...messages, next].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

function mergeMessages(messages: ChatMessage[], incoming: ChatMessage[]) {
  const byId = new Map(messages.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return Array.from(byId.values()).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

export function RealtimeMessageThread({ conversationId, userId, readField, otherReadField, initialOtherReadAt, initialMessages, initialHasOlderMessages, pageSize }: Props) {
  const supabase = useMemo(() => createClient() as unknown as SupabaseClient, []);
  const [messages, setMessages] = useState(initialMessages);
  const [optimisticMessages, addOptimisticMessage] = useOptimistic(messages, (current, next: ChatMessage) => mergeMessage(current, next));
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [otherReadAt, setOtherReadAt] = useState(initialOtherReadAt);
  const [hasOlderMessages, setHasOlderMessages] = useState(initialHasOlderMessages);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [olderMessagesError, setOlderMessagesError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const restoreScrollHeightRef = useRef<number | null>(null);
  const hasPositionedInitiallyRef = useRef(false);
  const lastMessageId = optimisticMessages.at(-1)?.id ?? null;

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

  useLayoutEffect(() => {
    const node = listRef.current;
    const previousHeight = restoreScrollHeightRef.current;
    if (!node || previousHeight === null) return;
    node.scrollTop += node.scrollHeight - previousHeight;
    restoreScrollHeightRef.current = null;
  }, [messages]);

  useEffect(() => {
    const node = listRef.current;
    if (!node || !lastMessageId) return;
    if (!hasPositionedInitiallyRef.current) {
      node.scrollTo({ top: node.scrollHeight, behavior: "auto" });
      hasPositionedInitiallyRef.current = true;
      return;
    }
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [lastMessageId]);

  async function loadOlderMessages() {
    const oldestMessage = messages[0];
    const node = listRef.current;
    if (!oldestMessage || !hasOlderMessages || loadingOlderMessages) return;

    setLoadingOlderMessages(true);
    setOlderMessagesError(null);
    if (node) restoreScrollHeightRef.current = node.scrollHeight;

    const { data, error } = await supabase
      .from("messages")
      .select("id, sender_id, body, created_at")
      .eq("conversation_id", conversationId)
      .lt("created_at", oldestMessage.created_at)
      .order("created_at", { ascending: false })
      .limit(pageSize + 1);

    if (error) {
      restoreScrollHeightRef.current = null;
      setOlderMessagesError("Could not load earlier messages. Please try again.");
      setLoadingOlderMessages(false);
      return;
    }

    const newestFirst = (data ?? []) as ChatMessage[];
    const olderMessages = newestFirst.slice(0, pageSize).reverse();
    setHasOlderMessages(newestFirst.length > pageSize);
    setMessages((current) => mergeMessages(current, olderMessages));
    setLoadingOlderMessages(false);
  }

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
        {hasOlderMessages && (
          <div className="older-message-loader">
            <button className="secondary-button" type="button" onClick={loadOlderMessages} disabled={loadingOlderMessages}>
              {loadingOlderMessages ? "Loading earlier messages…" : "Load earlier messages"}
            </button>
            {olderMessagesError && <span className="form-error" role="alert">{olderMessagesError}</span>}
          </div>
        )}
        {!hasOlderMessages && optimisticMessages.length > pageSize && <div className="message-history-start">You’ve reached the start of this conversation.</div>}
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
