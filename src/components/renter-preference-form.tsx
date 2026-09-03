"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { TENANT_PROFILE_LABELS, type TenantType } from "@/lib/tenant-match";

const options: Array<["" | Exclude<TenantType, "everyone">, string]> = [
  ["", "No preference"],
  ["family", TENANT_PROFILE_LABELS.family],
  ["bachelor", TENANT_PROFILE_LABELS.bachelor],
  ["student", TENANT_PROFILE_LABELS.student],
  ["job_holder", TENANT_PROFILE_LABELS.job_holder],
];

export function RenterPreferenceForm({
  userId,
  initialPreference,
}: {
  userId: string;
  initialPreference: string | null;
}) {
  const router = useRouter();
  const [preference, setPreference] = useState(initialPreference ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ preferred_tenant_type: preference || null } as never)
      .eq("id", userId);

    if (error) {
      setMessage("We couldn't update your renter type preference. Please try again.");
      setBusy(false);
      return;
    }

    setMessage("Renter type preference updated. Your map results will use it as a matching signal.");
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="renter-preference-control">
      <label htmlFor="preferred-tenant-type">
        <span>Renter type</span>
        <select
          id="preferred-tenant-type"
          value={preference}
          onChange={(event) => setPreference(event.target.value)}
          disabled={busy}
        >
          {options.map(([value, label]) => <option key={value || "none"} value={value}>{label}</option>)}
        </select>
      </label>
      <button className="secondary-button" type="button" onClick={() => void save()} disabled={busy}>
        {busy ? "Saving…" : "Save preference"}
      </button>
      {message && <p className="renter-preference-message" role="status" aria-live="polite">{message}</p>}
    </div>
  );
}
