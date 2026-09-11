"use client";

import { startTransition, useCallback, useEffect, useLayoutEffect, useMemo, useOptimistic, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { MessageComposer, friendlyMessageError, type ChatMessage } from "@/components/message-composer";
import { useLocale } from "@/i18n/use-locale";
import { getWorkflowCopy } from "@/i18n/workflow-copy";
import {
  isThreadBottomVisible,
  latestIncomingMessageAt,
  mergeThreadMessages,
  shouldAdvanceReadAt,
  threadCanAdvanceRead,
} from "@/lib/message-thread-state";
import { formatExactMessageTime, formatThreadMessageTime } from "@/lib/message-time";
import { createClient } from "@/lib/supabase/client";

type Props = {
  conversationId: string;
  userId: string;
  readField: "renter_last_read_at" | "owner_last_read_at";
  otherReadField: "renter_last_read_at" | "owner_last_read_at";
  initialReadAt: string | null;
  initialOtherReadAt: string | null;
  initialMessages: ChatMessage[];
  initialHasOlderMessages: boolean;
  pageSize: number;
};

type ConnectionState = "connecting" | "syncing" | "live" | "offline";

const CATCH_UP_PAGE_SIZE = 200;

function mergeMessage(messages: ChatMessage[], next: ChatMessage) {
  return mergeThreadMessages(messages, [next]);
}

function mergeMessages(messages: ChatMessage[], incoming: ChatMessage[]) {
  return mergeThreadMessages(messages, incoming);
}

export function RealtimeMessageThread({
  conversationId,
  userId,
  readField,
  otherReadField,
  initialReadAt,
  initialOtherReadAt,
  initialMessages,
  initialHasOlderMessages,
  pageSize,
}: Props) {
  const { locale } = useLocale();
  const copy = getWorkflowCopy(locale).messages.live;
  const supabase = useMemo(() => createClient() as unknown as SupabaseClient, []);
  const [messages, setMessages] = useState(initialMessages);
  const [optimisticMessages, addOptimisticMessage] = useOptimistic(messages, (current, next: ChatMessage) => mergeMessage(current, next));
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [otherReadAt, setOtherReadAt] = useState(initialOtherReadAt);
  const [hasOlderMessages, setHasOlderMessages] = useState(initialHasOlderMessages);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [olderMessagesError, setOlderMessagesError] = useState<string | null>(null);
  const [documentVisibility, setDocumentVisibility] = useState<DocumentVisibilityState>("hidden");
  const [windowFocused, setWindowFocused] = useState(false);
  const [bottomVisible, setBottomVisible] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const bottomSentinelRef = useRef<HTMLDivElement | null>(null);
  const bottomVisibleRef = useRef(false);
  const followIncomingRef = useRef(false);
  const restoreScrollHeightRef = useRef<number | null>(null);
  const hasPositionedInitiallyRef = useRef(false);
  const messagesRef = useRef(initialMessages);
  const committedReadAtRef = useRef(initialReadAt);
  const desiredReadAtRef = useRef(initialReadAt);
  const readSyncInFlightRef = useRef(false);
  const lastMessage = optimisticMessages.at(-1) ?? null;
  const lastMessageId = lastMessage?.id ?? null;
  const lastMessageMine = lastMessage?.sender_id === userId;
  const renderedAt = new Date();

  const flushReadState = useCallback(async () => {
    if (readSyncInFlightRef.current) return;
    readSyncInFlightRef.current = true;

    try {
      while (shouldAdvanceReadAt(committedReadAtRef.current, desiredReadAtRef.current)) {
        const target = desiredReadAtRef.current;
        if (!target) break;

        const { error } = await supabase
          .from("conversations")
          .update({ [readField]: target })
          .eq("id", conversationId);

        if (error) return;
        committedReadAtRef.current = target;
      }
    } finally {
      readSyncInFlightRef.current = false;
    }
  }, [conversationId, readField, supabase]);

  useEffect(() => {
    let disposed = false;
    let catchUpInFlight = false;
    let catchUpQueued = false;

    function storeMessages(updater: (current: ChatMessage[]) => ChatMessage[]) {
      setMessages((current) => {
        const next = updater(current);
        messagesRef.current = next;
        return next;
      });
    }

    function recordOwnReadAt(value: unknown) {
      if (typeof value !== "string") return;
      if (shouldAdvanceReadAt(committedReadAtRef.current, value)) committedReadAtRef.current = value;
      if (shouldAdvanceReadAt(desiredReadAtRef.current, value)) desiredReadAtRef.current = value;
    }

    async function syncConversationReadState() {
      const { data } = await supabase
        .from("conversations")
        .select(`${readField}, ${otherReadField}`)
        .eq("id", conversationId)
        .maybeSingle();
      if (disposed || !data) return;

      const row = data as Record<string, unknown>;
      const otherValue = row[otherReadField];
      if (typeof otherValue === "string" || otherValue === null) setOtherReadAt(otherValue as string | null);
      recordOwnReadAt(row[readField]);
    }

    async function catchUpMessages() {
      if (catchUpInFlight) {
        catchUpQueued = true;
        return;
      }

      catchUpInFlight = true;
      let successful = true;

      try {
        do {
          catchUpQueued = false;
          const latestMessage = messagesRef.current.at(-1) ?? null;
          let offset = 0;

          while (!disposed) {
            let query = supabase
              .from("messages")
              .select("id, sender_id, body, created_at")
              .eq("conversation_id", conversationId)
              .order("created_at", { ascending: true })
              .order("id", { ascending: true })
              .range(offset, offset + CATCH_UP_PAGE_SIZE - 1);

            if (latestMessage) query = query.gte("created_at", latestMessage.created_at);

            const { data, error } = await query;
            if (disposed) return;
            if (error) {
              successful = false;
              setConnectionState("offline");
              break;
            }

            const batch = (data ?? []) as ChatMessage[];
            if (batch.length) {
              if (bottomVisibleRef.current) followIncomingRef.current = true;
              storeMessages((current) => mergeMessages(current, batch));
            }
            if (batch.length < CATCH_UP_PAGE_SIZE) break;
            offset += batch.length;
          }
        } while (!disposed && successful && catchUpQueued);
      } finally {
        catchUpInFlight = false;
      }

      if (!disposed && successful) setConnectionState("live");
    }

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
          if (next.sender_id !== userId && bottomVisibleRef.current) followIncomingRef.current = true;
          storeMessages((current) => mergeMessage(current, next));
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnectionState("syncing");
          void catchUpMessages();
          void syncConversationReadState();
        }
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
          const otherValue = next[otherReadField];
          if (typeof otherValue === "string" || otherValue === null) setOtherReadAt(otherValue as string | null);
          recordOwnReadAt(next[readField]);
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void syncConversationReadState();
      });

    return () => {
      disposed = true;
      void supabase.removeChannel(messageChannel);
      void supabase.removeChannel(readChannel);
    };
  }, [conversationId, otherReadField, readField, supabase, userId]);

  useEffect(() => {
    function syncDocumentActivity() {
      setDocumentVisibility(document.visibilityState);
      setWindowFocused(document.hasFocus());
    }

    syncDocumentActivity();
    document.addEventListener("visibilitychange", syncDocumentActivity);
    window.addEventListener("focus", syncDocumentActivity);
    window.addEventListener("blur", syncDocumentActivity);

    return () => {
      document.removeEventListener("visibilitychange", syncDocumentActivity);
      window.removeEventListener("focus", syncDocumentActivity);
      window.removeEventListener("blur", syncDocumentActivity);
    };
  }, []);

  useEffect(() => {
    const root = listRef.current;
    const target = bottomSentinelRef.current;
    if (!root || !target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = Boolean(entry?.isIntersecting) && isThreadBottomVisible(root);
        bottomVisibleRef.current = visible;
        setBottomVisible(visible);
      },
      { root, threshold: 0.9 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [conversationId]);

  useEffect(() => {
    if (!threadCanAdvanceRead(documentVisibility, windowFocused, bottomVisible)) return;

    const latestIncomingAt = latestIncomingMessageAt(messages, userId);
    if (shouldAdvanceReadAt(desiredReadAtRef.current, latestIncomingAt)) desiredReadAtRef.current = latestIncomingAt;
    if (shouldAdvanceReadAt(committedReadAtRef.current, desiredReadAtRef.current)) void flushReadState();
  }, [bottomVisible, documentVisibility, flushReadState, messages, userId, windowFocused]);

  useLayoutEffect(() => {
    const node = listRef.current;
    if (!node) return;

    const previousHeight = restoreScrollHeightRef.current;
    if (previousHeight !== null) {
      node.scrollTop += node.scrollHeight - previousHeight;
      restoreScrollHeightRef.current = null;
    }

    const visible = isThreadBottomVisible(node);
    bottomVisibleRef.current = visible;
    setBottomVisible(visible);
  }, [messages]);

  useEffect(() => {
    const node = listRef.current;
    if (!node || !lastMessageId) return;
    if (!hasPositionedInitiallyRef.current) {
      node.scrollTo({ top: node.scrollHeight, behavior: "auto" });
      hasPositionedInitiallyRef.current = true;
      return;
    }
    if (!lastMessageMine && !followIncomingRef.current) return;
    followIncomingRef.current = false;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [lastMessageId, lastMessageMine]);

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
      setOlderMessagesError(copy.loadOlderError);
      setLoadingOlderMessages(false);
      return;
    }

    const newestFirst = (data ?? []) as ChatMessage[];
    const olderMessages = newestFirst.slice(0, pageSize).reverse();
    setHasOlderMessages(newestFirst.length > pageSize);
    setMessages((current) => {
      const next = mergeMessages(current, olderMessages);
      messagesRef.current = next;
      return next;
    });
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
          resultError = friendlyMessageError(error.message, locale);
          resolve();
          return;
        }

        const sentMessage = data as ChatMessage;
        setMessages((current) => {
          const next = mergeMessage(current, sentMessage);
          messagesRef.current = next;
          return next;
        });
        if (shouldAdvanceReadAt(committedReadAtRef.current, sentMessage.created_at)) committedReadAtRef.current = sentMessage.created_at;
        if (shouldAdvanceReadAt(desiredReadAtRef.current, sentMessage.created_at)) desiredReadAtRef.current = sentMessage.created_at;
        resolve();
      });
    });

    return resultError ? { error: resultError } : {};
  }

  return (
    <section className="thread-panel realtime-thread-panel">
      <div className="thread-live-bar" aria-live="polite">
        <span className={`thread-live-dot ${connectionState}`} aria-hidden="true" />
        <span>
          {connectionState === "live"
            ? copy.liveConversation
            : connectionState === "syncing"
              ? copy.catchingUp
              : connectionState === "connecting"
                ? copy.connecting
                : copy.interrupted}
        </span>
      </div>

      <div className="message-list" ref={listRef}>
        {hasOlderMessages && (
          <div className="older-message-loader">
            <button className="secondary-button" type="button" onClick={loadOlderMessages} disabled={loadingOlderMessages}>
              {loadingOlderMessages ? copy.loadingEarlier : copy.loadEarlier}
            </button>
            {olderMessagesError && <span className="form-error" role="alert">{olderMessagesError}</span>}
          </div>
        )}
        {!hasOlderMessages && optimisticMessages.length > pageSize && <div className="message-history-start">{copy.historyStart}</div>}
        {!optimisticMessages.length && <div className="renter-empty">{copy.empty}</div>}
        {optimisticMessages.map((message) => {
          const mine = message.sender_id === userId;
          const read = mine && !message.pending && Boolean(otherReadAt && new Date(message.created_at) <= new Date(otherReadAt));
          return (
            <div className={`message-row${mine ? " mine" : ""}${message.pending ? " pending" : ""}`} key={message.id}>
              <div className="message-bubble">
                <div>{message.body}</div>
                <small className="message-status">
                  <span>{message.pending ? copy.sending : <time suppressHydrationWarning dateTime={message.created_at} title={formatExactMessageTime(message.created_at, locale)}>{formatThreadMessageTime(message.created_at, renderedAt, locale)}</time>}</span>
                  {mine && !message.pending && <span className={read ? "read-receipt read" : "read-receipt"}>{read ? copy.read : copy.sent}</span>}
                </small>
              </div>
            </div>
          );
        })}
        <div ref={bottomSentinelRef} aria-hidden="true" style={{ height: 1 }} />
      </div>

      <MessageComposer onSend={sendMessage} />
    </section>
  );
}
