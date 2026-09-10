"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

type SavedHomesState = {
  userId: string | null;
  ready: boolean;
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

const SavedHomesContext = createContext<SavedHomesState | null>(null);

function savedIdsKey(ids: string[] | undefined) {
  if (!ids) return "__load__";
  return [...ids].sort().join("|");
}

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
  const supabase = useMemo(() => createClient() as unknown as SupabaseClient, []);
  const initialKey = savedIdsKey(initialSavedPropertyIds);
  const [savedPropertyIds, setSavedPropertyIds] = useState<Set<string>>(
    () => new Set(initialSavedPropertyIds ?? []),
  );
  const [pendingPropertyIds, setPendingPropertyIds] = useState<Set<string>>(new Set());
  const [errorByPropertyId, setErrorByPropertyId] = useState<Map<string, string>>(new Map());
  const [loaded, setLoaded] = useState(Boolean(authReady && (userId === null || initialSavedPropertyIds)));

  useEffect(() => {
    let cancelled = false;

    setPendingPropertyIds(new Set());
    setErrorByPropertyId(new Map());

    if (!authReady) {
      setLoaded(false);
      return () => {
        cancelled = true;
      };
    }

    if (!userId) {
      setSavedPropertyIds(new Set());
      setLoaded(true);
      return () => {
        cancelled = true;
      };
    }

    if (initialSavedPropertyIds) {
      setSavedPropertyIds(new Set(initialSavedPropertyIds));
      setLoaded(true);
      return () => {
        cancelled = true;
      };
    }

    setLoaded(false);
    void (async () => {
      const { data, error } = await supabase
        .from("saved_properties")
        .select("property_id")
        .eq("user_id", userId);

      if (cancelled) return;
      if (error) {
        setSavedPropertyIds(new Set());
        setLoaded(true);
        return;
      }

      setSavedPropertyIds(new Set((data ?? []).map((row) => row.property_id as string)));
      setLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [authReady, initialKey, initialSavedPropertyIds, supabase, userId]);

  const toggleSaved = useCallback(async (propertyId: string) => {
    if (!userId || !loaded || pendingPropertyIds.has(propertyId)) return;

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
      setErrorByPropertyId((current) => new Map(current).set(propertyId, "Could not update your saved homes. Please try again."));
    }

    setPendingPropertyIds((current) => {
      const next = new Set(current);
      next.delete(propertyId);
      return next;
    });
  }, [loaded, pendingPropertyIds, savedPropertyIds, supabase, userId]);

  const value = useMemo<SavedHomesState>(() => ({
    userId,
    ready: authReady && loaded,
    savedPropertyIds,
    pendingPropertyIds,
    errorByPropertyId,
    toggleSaved,
  }), [authReady, errorByPropertyId, loaded, pendingPropertyIds, savedPropertyIds, toggleSaved, userId]);

  return <SavedHomesContext.Provider value={value}>{children}</SavedHomesContext.Provider>;
}

export function useSavedHomesState() {
  return useContext(SavedHomesContext);
}
