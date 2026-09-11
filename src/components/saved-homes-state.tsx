"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { useLocale } from "@/i18n/use-locale";
import { getWorkflowCopy } from "@/i18n/workflow-copy";
import { createClient } from "@/lib/supabase/client";

type SavedHomesState = {
  userId: string | null;
  ready: boolean;
  loadError: string | null;
  savedPropertyIds: ReadonlySet<string>;
  pendingPropertyIds: ReadonlySet<string>;
  errorByPropertyId: ReadonlyMap<string, string>;
  toggleSaved: (propertyId: string) => Promise<void>;
};

type SavedHomesProviderProps = {
  children: ReactNode;
  userId: string | null;
  authReady?: boolean;
  initialSavedPropertyIds?: string[];
};

type RemoteLoadState = "idle" | "loaded" | "error";

const SavedHomesContext = createContext<SavedHomesState | null>(null);

function setMembership(current: Set<string>, propertyId: string, saved: boolean) {
  const next = new Set(current);
  if (saved) next.add(propertyId);
  else next.delete(propertyId);
  return next;
}

export function SavedHomesProvider({
  children,
  userId,
  authReady = true,
  initialSavedPropertyIds,
}: SavedHomesProviderProps) {
  const { locale } = useLocale();
  const copy = getWorkflowCopy(locale).saved.homes;
  const supabase = useMemo(() => createClient() as unknown as SupabaseClient, []);
  const hasServerSeed = initialSavedPropertyIds !== undefined;
  const [savedPropertyIds, setSavedPropertyIds] = useState<Set<string>>(
    () => new Set(initialSavedPropertyIds ?? []),
  );
  const [pendingPropertyIds, setPendingPropertyIds] = useState<Set<string>>(new Set());
  const [errorByPropertyId, setErrorByPropertyId] = useState<Map<string, string>>(new Map());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [remoteLoadState, setRemoteLoadState] = useState<RemoteLoadState>(
    hasServerSeed ? "loaded" : "idle",
  );

  useEffect(() => {
    if (!authReady || !userId || hasServerSeed) return;

    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("saved_properties")
        .select("property_id")
        .eq("user_id", userId);

      if (cancelled) return;
      if (error) {
        setLoadError(copy.loadError);
        setRemoteLoadState("error");
        return;
      }

      setSavedPropertyIds(new Set((data ?? []).map((row) => row.property_id as string)));
      setLoadError(null);
      setRemoteLoadState("loaded");
    })();

    return () => {
      cancelled = true;
    };
  }, [authReady, copy.loadError, hasServerSeed, supabase, userId]);

  const ready = authReady && (!userId || hasServerSeed || remoteLoadState === "loaded");

  const toggleSaved = useCallback(async (propertyId: string) => {
    if (!userId || !ready || pendingPropertyIds.has(propertyId)) return;

    const wasSaved = savedPropertyIds.has(propertyId);
    const nextSaved = !wasSaved;

    setPendingPropertyIds((current) => new Set(current).add(propertyId));
    setErrorByPropertyId((current) => {
      const next = new Map(current);
      next.delete(propertyId);
      return next;
    });
    setSavedPropertyIds((current) => setMembership(current, propertyId, nextSaved));

    const result = nextSaved
      ? await supabase.from("saved_properties").upsert(
          { user_id: userId, property_id: propertyId },
          { onConflict: "user_id,property_id", ignoreDuplicates: true },
        )
      : await supabase.from("saved_properties").delete().eq("user_id", userId).eq("property_id", propertyId);

    if (result.error) {
      setSavedPropertyIds((current) => setMembership(current, propertyId, wasSaved));
      setErrorByPropertyId((current) => new Map(current).set(propertyId, copy.updateError));
    }

    setPendingPropertyIds((current) => {
      const next = new Set(current);
      next.delete(propertyId);
      return next;
    });
  }, [copy.updateError, pendingPropertyIds, ready, savedPropertyIds, supabase, userId]);

  const value = useMemo<SavedHomesState>(() => ({
    userId,
    ready,
    loadError,
    savedPropertyIds,
    pendingPropertyIds,
    errorByPropertyId,
    toggleSaved,
  }), [errorByPropertyId, loadError, pendingPropertyIds, ready, savedPropertyIds, toggleSaved, userId]);

  return <SavedHomesContext.Provider value={value}>{children}</SavedHomesContext.Provider>;
}

export function useSavedHomesState() {
  return useContext(SavedHomesContext);
}
