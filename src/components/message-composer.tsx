"use client";

import { useState } from "react";

import { useLocale } from "@/i18n/use-locale";
import { getWorkflowCopy } from "@/i18n/workflow-copy";
import type { Locale } from "@/i18n/config";

export type ChatMessage = { id: string; sender_id: string; body: string; created_at: string; pending?: boolean };

export function friendlyMessageError(message: string, locale: Locale = "en") {
  const copy = getWorkflowCopy(locale).messages.composer;
  const lower = message.toLowerCase();
  if (lower.includes("message rate limit reached")) {
    return copy.fastError;
  }
  if (lower.includes("hourly message limit reached")) {
    return copy.hourlyError;
  }
  if (lower.includes("not a participant") || lower.includes("sender mismatch")) {
    return copy.permissionError;
  }
  return copy.genericError;
}

export function MessageComposer({
  onSend,
}: {
  onSend: (text: string) => Promise<{ error?: string }>;
}) {
  const { locale } = useLocale();
  const copy = getWorkflowCopy(locale).messages.composer;
  const quickInquiries = [
    copy.inquiryAvailable,
    copy.inquiryTenant,
    copy.inquiryVisit,
    copy.inquiryMoveIn,
  ];
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
      <div className="quick-inquiries" role="group" aria-label={copy.suggestionAria}>
        {quickInquiries.map((inquiry) => (
          <button key={inquiry} type="button" onClick={() => setBody(inquiry)} disabled={busy}>
            {inquiry}
          </button>
        ))}
      </div>

      <div className="message-input-shell">
        <label className="sr-only" htmlFor="message-composer-input">{copy.label}</label>
        <textarea
          id="message-composer-input"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={2}
          maxLength={4000}
          placeholder={copy.placeholder}
          aria-describedby="message-composer-help message-composer-count"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send();
            }
          }}
        />
        <button className="message-send-button" type="button" disabled={busy || !body.trim()} onClick={() => void send()} aria-label={copy.sendAria}>
          {busy ? "…" : "➤"}
        </button>
      </div>

      <div className="message-composer-footer">
        <span id="message-composer-help">{copy.help}</span>
        <span id="message-composer-count">{body.length}/4000</span>
      </div>
      {message && <div className="auth-message" role="alert">{message}</div>}
    </div>
  );
}
