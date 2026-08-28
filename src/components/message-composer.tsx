"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

export function MessageComposer({ conversationId, userId }: { conversationId: string; userId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function send() {
    const text = body.trim();
    if (!text) return;

    setBusy(true);
    setMessage(null);
    const supabase = createClient() as unknown as SupabaseClient;
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: userId,
      body: text,
    });

    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }

    setBody("");
    setBusy(false);
    router.refresh();
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
