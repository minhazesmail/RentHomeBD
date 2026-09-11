"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getSupportCopy } from "@/i18n/support-copy";
import { useLocale } from "@/i18n/use-locale";
import { createClient } from "@/lib/supabase/client";

type BlockState = { blocked: boolean; blocked_by_me: boolean };

export function ConversationSafetyControls({
  conversationId,
  otherUserId,
}: {
  conversationId: string;
  otherUserId: string;
}) {
  const { locale } = useLocale();
  const copy = getSupportCopy(locale);
  const [state, setState] = useState<BlockState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    void supabase.rpc("get_conversation_block_state", { conversation_uuid: conversationId }).then(({ data }) => {
      if (!active) return;
      const row = Array.isArray(data) ? data[0] : data;
      setState(row ? { blocked: Boolean(row.blocked), blocked_by_me: Boolean(row.blocked_by_me) } : { blocked: false, blocked_by_me: false });
    });
    return () => { active = false; };
  }, [conversationId]);

  async function toggleBlock() {
    const shouldBlock = !state?.blocked_by_me;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: blockError } = await supabase.rpc("set_user_block", { blocked_user: otherUserId, should_block: shouldBlock });
    if (blockError) {
      setError(copy.blockError);
    } else {
      setState({ blocked: shouldBlock, blocked_by_me: shouldBlock });
    }
    setBusy(false);
  }

  const reportHref = `/contact?category=safety_abuse&conversation=${encodeURIComponent(conversationId)}`;

  return (
    <div className="thread-safety-actions">
      {state?.blocked && <span className="form-hint" role="status">{copy.blocked}</span>}
      {error && <span className="auth-message" role="alert">{error}</span>}
      {(!state?.blocked || state.blocked_by_me) && (
        <button className="text-button" type="button" disabled={busy || state === null} onClick={() => void toggleBlock()}>
          {state?.blocked_by_me ? copy.unblock : copy.block}
        </button>
      )}
      <Link className="text-link" href={reportHref}>{copy.report}</Link>
    </div>
  );
}
