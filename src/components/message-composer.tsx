"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

export type ChatMessage = { id: string; sender_id: string; body: string; created_at: string };

function friendlyMessageError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("message rate limit reached")) {
    return "You’re sending messages very quickly. Wait a moment and try again.";
  }
  if (lower.includes("hourly message limit reached")) {
    return "You’ve reached the hourly messaging limit. Please try again later.";
  }
  if (lower.includes("not a participant") || lower.includes("sender mismatch")) {
    return "You no longer have permission to send messages in this conversation.";
  }
  return "Could not send your message. Please try again.";
}

export function MessageComposer({
  conversationId,
  userId,
  onSent,
}: {
  conversationId: string;
  userId: string;
  onSent?: (message: ChatMessage) => void;
}) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function send() {
    const text = body.trim();
    if (!text) return;

    setBusy(true);
    setMessage(null);
    const supabase = createClient() as unknown as SupabaseClient;
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
      setMessage(friendlyMessageError(error.message));
      setBusy(false);
      return;
    }

    setBody("");
    setBusy(false);
    onSent?.(data as ChatMessage);
  }

  return (
    <div className="message-composer">
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={3}
        maxLength={4000}
        placeholder="Write a message…"
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void send();
          }
        }}
      />
      <div className="message-composer-footer">
        <span>{body.length}/4000</span>
        <button className="primary-button" type="button" disabled={busy || !body.trim()} onClick={() => void send()}>
          {busy ? "Sending…" : "Send"}
        </button>
      </div>
      {message && <div className="auth-message">{message}</div>}
    </div>
  );
}
