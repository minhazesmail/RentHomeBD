"use client";

import { useState } from "react";

export type ChatMessage = { id: string; sender_id: string; body: string; created_at: string; pending?: boolean };

const QUICK_INQUIRIES = [
  "Is this still available?",
  "Is this suitable for my tenant type?",
  "Can I visit the property this week?",
  "What is the earliest move-in date?",
];

export function friendlyMessageError(message: string) {
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
  onSend,
}: {
  onSend: (text: string) => Promise<{ error?: string }>;
}) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function send() {
    const text = body.trim();
    if (!text || busy) return;

    setBusy(true);
    setMessage(null);
    setBody("");

    const result = await onSend(text);
    if (result.error) {
      setBody(text);
      setMessage(result.error);
    }

    setBusy(false);
  }

  return (
    <div className="message-composer">
      <div className="quick-inquiries" role="group" aria-label="Quick inquiry suggestions">
        {QUICK_INQUIRIES.map((inquiry) => (
          <button key={inquiry} type="button" onClick={() => setBody(inquiry)} disabled={busy}>
            {inquiry}
          </button>
        ))}
      </div>

      <div className="message-input-shell">
        <label className="sr-only" htmlFor="message-composer-input">Message</label>
        <textarea
          id="message-composer-input"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={2}
          maxLength={4000}
          placeholder="Write a polite message about this property…"
          aria-describedby="message-composer-help message-composer-count"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send();
            }
          }}
        />
        <button className="message-send-button" type="button" disabled={busy || !body.trim()} onClick={() => void send()} aria-label="Send message">
          {busy ? "…" : "➤"}
        </button>
      </div>

      <div className="message-composer-footer">
        <span id="message-composer-help">Enter to send · Shift + Enter for a new line</span>
        <span id="message-composer-count">{body.length}/4000</span>
      </div>
      {message && <div className="auth-message" role="alert">{message}</div>}
    </div>
  );
}
