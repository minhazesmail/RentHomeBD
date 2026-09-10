"use client";

import { useRouter } from "next/navigation";

import { SavedHomesProvider, useSavedHomesState } from "@/components/saved-homes-state";

function ContextualSaveHomeButton({
  propertyId,
  compact,
}: {
  propertyId: string;
  compact: boolean;
}) {
  const router = useRouter();
  const savedHomes = useSavedHomesState();

  if (!savedHomes) return null;

  const saved = savedHomes.savedPropertyIds.has(propertyId);
  const busy = savedHomes.pendingPropertyIds.has(propertyId);
  const message = savedHomes.errorByPropertyId.get(propertyId) ?? null;

  function toggle() {
    if (!savedHomes.ready) return;
    if (!savedHomes.userId) {
      router.push(`/login?next=${encodeURIComponent(`/homes/${propertyId}`)}`);
      return;
    }
    void savedHomes.toggleSaved(propertyId);
  }

  return (
    <div className={compact ? "save-home-wrap compact" : "save-home-wrap"}>
      <button
        className={saved ? "save-home-button saved" : "save-home-button"}
        type="button"
        onClick={toggle}
        disabled={busy || !savedHomes.ready}
        aria-pressed={saved}
        aria-busy={busy || !savedHomes.ready}
        aria-label={!savedHomes.ready ? "Loading saved home state" : saved ? "Remove from saved homes" : "Save this home"}
      >
        <span aria-hidden="true">{saved ? "♥" : "♡"}</span>
        {!compact && (!savedHomes.ready ? "Loading…" : busy ? (saved ? "Saving…" : "Removing…") : saved ? "Saved home" : "Save home")}
      </button>
      {message && <small className={compact ? "sr-only" : "save-home-error"} role="status">{message}</small>}
    </div>
  );
}

export function SaveHomeButton({
  propertyId,
  userId,
  initialSaved = false,
  compact = false,
}: {
  propertyId: string;
  userId: string | null;
  initialSaved?: boolean;
  compact?: boolean;
}) {
  const sharedSavedHomes = useSavedHomesState();

  if (sharedSavedHomes) {
    return <ContextualSaveHomeButton propertyId={propertyId} compact={compact} />;
  }

  return (
    <SavedHomesProvider
      userId={userId}
      initialSavedPropertyIds={initialSaved ? [propertyId] : []}
    >
      <ContextualSaveHomeButton propertyId={propertyId} compact={compact} />
    </SavedHomesProvider>
  );
}
