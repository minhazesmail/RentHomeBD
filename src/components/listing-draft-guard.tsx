"use client";

import { useEffect, useRef, useState } from "react";

const DRAFT_VERSION = 1;
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const FIELD_SELECTOR = 'input:not([type="file"]), textarea, select';

type DraftField =
  | { kind: "checked"; checked: boolean }
  | { kind: "value"; value: string };

type StoredListingDraft = {
  version: number;
  savedAt: number;
  fields: DraftField[];
  mediaTouched: boolean;
};

type Props = {
  userId: string;
  propertyId?: string;
};

type FormField = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function storageKey(userId: string, propertyId?: string) {
  return `nearbasha:listing-draft:v${DRAFT_VERSION}:${userId}:${propertyId ?? "new"}`;
}

function readFields(form: HTMLFormElement): DraftField[] {
  return Array.from(form.querySelectorAll<FormField>(FIELD_SELECTOR)).map((field) => {
    if (field instanceof HTMLInputElement && (field.type === "checkbox" || field.type === "radio")) {
      return { kind: "checked", checked: field.checked };
    }
    return { kind: "value", value: field.value };
  });
}

function setNativeValue(field: FormField, value: string) {
  const prototype = Object.getPrototypeOf(field) as object;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
  descriptor?.set?.call(field, value);
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));
}

function setNativeChecked(field: HTMLInputElement, checked: boolean) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "checked");
  descriptor?.set?.call(field, checked);
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));
}

function applyFields(form: HTMLFormElement, fields: DraftField[]) {
  const currentFields = Array.from(form.querySelectorAll<FormField>(FIELD_SELECTOR));
  currentFields.forEach((field, index) => {
    const saved = fields[index];
    if (!saved) return;
    if (saved.kind === "checked" && field instanceof HTMLInputElement) {
      setNativeChecked(field, saved.checked);
      return;
    }
    if (saved.kind === "value") setNativeValue(field, saved.value);
  });
}

function parseDraft(raw: string | null): StoredListingDraft | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<StoredListingDraft>;
    if (value.version !== DRAFT_VERSION || typeof value.savedAt !== "number" || !Array.isArray(value.fields)) return null;
    if (Date.now() - value.savedAt > DRAFT_TTL_MS) return null;
    return {
      version: DRAFT_VERSION,
      savedAt: value.savedAt,
      fields: value.fields as DraftField[],
      mediaTouched: Boolean(value.mediaTouched),
    };
  } catch {
    return null;
  }
}

export function ListingDraftGuard({ userId, propertyId }: Props) {
  const key = storageKey(userId, propertyId);
  const dirtyRef = useRef(false);
  const mediaTouchedRef = useRef(false);
  const recoverableRef = useRef<StoredListingDraft | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [recoverable, setRecoverable] = useState<StoredListingDraft | null>(null);

  useEffect(() => {
    const form = document.querySelector<HTMLFormElement>("form.listing-form");
    if (!form) return;

    const stored = parseDraft(window.localStorage.getItem(key));
    if (stored) {
      recoverableRef.current = stored;
      setRecoverable(stored);
    } else {
      window.localStorage.removeItem(key);
    }

    const persist = () => {
      if (!dirtyRef.current) return;
      const snapshot: StoredListingDraft = {
        version: DRAFT_VERSION,
        savedAt: Date.now(),
        fields: readFields(form),
        mediaTouched: mediaTouchedRef.current,
      };
      try {
        window.localStorage.setItem(key, JSON.stringify(snapshot));
        setSavedAt(snapshot.savedAt);
      } catch {
        // Browser storage can be unavailable in strict/private contexts. The leave warning still protects the form.
      }
    };

    const schedulePersist = () => {
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(persist, 650);
    };

    const markDirty = (mediaTouched = false) => {
      if (recoverableRef.current) {
        recoverableRef.current = null;
        setRecoverable(null);
        window.localStorage.removeItem(key);
      }
      if (mediaTouched) mediaTouchedRef.current = true;
      dirtyRef.current = true;
      setDirty(true);
      schedulePersist();
    };

    const onInput = () => markDirty(false);
    const onChange = (event: Event) => {
      const target = event.target;
      markDirty(target instanceof HTMLInputElement && target.type === "file");
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(".listing-media-controls, .listing-media-remove, .interactive-map-preview")) markDirty(true);
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      persist();
      event.preventDefault();
      event.returnValue = "";
    };
    const onDocumentClick = (event: MouseEvent) => {
      if (!dirtyRef.current || event.defaultPrevented) return;
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.href === window.location.href) return;
      persist();
      const leave = window.confirm("You have unsaved listing changes. Leave this page without saving the draft?");
      if (!leave) {
        event.preventDefault();
        event.stopPropagation();
      } else {
        dirtyRef.current = false;
      }
    };

    form.addEventListener("input", onInput);
    form.addEventListener("change", onChange);
    form.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onDocumentClick, true);

    return () => {
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
      if (dirtyRef.current) persist();
      const params = new URLSearchParams(window.location.search);
      if (window.location.pathname === "/owner" && ["saved", "submitted"].includes(params.get("notice") ?? "")) {
        window.localStorage.removeItem(key);
      }
      form.removeEventListener("input", onInput);
      form.removeEventListener("change", onChange);
      form.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onDocumentClick, true);
    };
  }, [key]);

  function restoreDraft() {
    const form = document.querySelector<HTMLFormElement>("form.listing-form");
    const draft = recoverableRef.current;
    if (!form || !draft) return;
    recoverableRef.current = null;
    setRecoverable(null);
    window.localStorage.removeItem(key);
    applyFields(form, draft.fields);
    mediaTouchedRef.current = draft.mediaTouched;
    dirtyRef.current = true;
    setDirty(true);
    setSavedAt(draft.savedAt);
  }

  function discardDraft() {
    recoverableRef.current = null;
    setRecoverable(null);
    dirtyRef.current = false;
    mediaTouchedRef.current = false;
    setDirty(false);
    setSavedAt(null);
    window.localStorage.removeItem(key);
  }

  if (recoverable) {
    return (
      <div className="review-note" role="status">
        <strong>Unsaved listing draft found</strong>
        <p>NearBasha saved your form fields in this browser {new Date(recoverable.savedAt).toLocaleString("en-BD")}.</p>
        {recoverable.mediaTouched && <p>Media files, removals, cover choice, or map interactions may need to be repeated after restoring.</p>}
        <div className="owner-header-actions">
          <button className="secondary-button" type="button" onClick={restoreDraft}>Restore draft</button>
          <button className="text-button" type="button" onClick={discardDraft}>Discard local draft</button>
        </div>
      </div>
    );
  }

  return (
    <div className="form-hint" role="status" aria-live="polite">
      {dirty
        ? `Draft protection active${savedAt ? ` · fields backed up locally at ${new Date(savedAt).toLocaleTimeString("en-BD", { hour: "numeric", minute: "2-digit" })}` : ""}. Save draft before leaving; newly selected media files cannot be restored after a reload.`
        : "Draft protection active. NearBasha will warn before you leave with unsaved changes and locally back up form fields as you edit."}
    </div>
  );
}
