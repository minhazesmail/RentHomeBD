"use client";

import { useRouter } from "next/navigation";

import { SavedHomesProvider, useSavedHomesState } from "@/components/saved-homes-state";
import { useLocale } from "@/i18n/use-locale";
import { getWorkflowCopy } from "@/i18n/workflow-copy";

function ContextualSaveHomeButton({
  propertyId,
  compact,
}: {
  propertyId: string;
  compact: boolean;
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const copy = getWorkflowCopy(locale).saved.homes;
  const savedHomes = useSavedHomesState();

  if (!savedHomes) return null;
  const store = savedHomes;

  const saved = store.savedPropertyIds.has(propertyId);
  const busy = store.pendingPropertyIds.has(propertyId);
  const message = store.errorByPropertyId.get(propertyId) ?? store.loadError;

  function toggle() {
    if (!store.ready) return;
    if (!store.userId) {
      router.push(`/login?next=${encodeURIComponent(`/homes/${propertyId}`)}`);
      return;
    }
    void store.toggleSaved(propertyId);
  }

  return (
    <div className={compact ? "save-home-wrap compact" : "save-home-wrap"}>
      <button
        className={saved ? "save-home-button saved" : "save-home-button"}
        type="button"
        onClick={toggle}
        disabled={busy || !store.ready}
        aria-pressed={saved}
        aria-busy={busy || !store.ready}
        aria-label={!store.ready ? copy.loadingState : saved ? copy.removeSaved : copy.saveThisHome}
      >
        <span aria-hidden="true">{saved ? "♥" : "♡"}</span>
        {!compact && (!store.ready ? copy.loading : busy ? (saved ? copy.saving : copy.removing) : saved ? copy.savedHome : copy.saveHome)}
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
