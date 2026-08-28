"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

export function DeleteSavedSearchButton({ searchId, userId }: { searchId: string; userId: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient() as unknown as SupabaseClient, []);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    const { error } = await supabase.from("saved_searches").delete().eq("id", searchId).eq("user_id", userId);
    if (error) {
      window.alert(error.message);
      setBusy(false);
      return;
    }
    router.refresh();
  }

  return <button className="text-button" type="button" onClick={() => void remove()} disabled={busy}>{busy ? "Removing…" : "Delete"}</button>;
}
