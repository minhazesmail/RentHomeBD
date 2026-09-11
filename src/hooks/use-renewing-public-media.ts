"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { PUBLIC_MEDIA_REFRESH_MS, PUBLIC_MEDIA_TTL_SECONDS } from "@/lib/public-media";
import { createClient } from "@/lib/supabase/client";

export type RenewableMedia = { path: string; initialUrl?: string | null };

export function useRenewingPublicMedia(items: RenewableMedia[]) {
  const supabase = useMemo(() => createClient(), []);
  const itemKey = useMemo(() => items.map((item) => item.path).sort().join("\n"), [items]);
  const initialUrls = useMemo<Record<string, string>>(
    () => Object.fromEntries(items.flatMap((item) => item.initialUrl ? [[item.path, item.initialUrl]] : [])),
    [items],
  );
  const [renewedUrls, setRenewedUrls] = useState<Record<string, string>>({});
  const urls = useMemo(() => ({ ...initialUrls, ...renewedUrls }), [initialUrls, renewedUrls]);

  const refresh = useCallback(async (onlyPath?: string) => {
    const paths = onlyPath ? [onlyPath] : itemKey ? itemKey.split("\n") : [];
    if (!paths.length) return;
    const { data } = await supabase.storage.from("property-media").createSignedUrls(paths, PUBLIC_MEDIA_TTL_SECONDS);
    if (!data?.length) return;
    setRenewedUrls((current) => {
      const next = { ...current };
      for (const row of data) if (row.path && row.signedUrl) next[row.path] = row.signedUrl;
      return next;
    });
  }, [itemKey, supabase]);

  useEffect(() => {
    if (!itemKey) return;
    const timer = window.setInterval(() => { void refresh(); }, PUBLIC_MEDIA_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [itemKey, refresh]);

  return { urls, refresh };
}
