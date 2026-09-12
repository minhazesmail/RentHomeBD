"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { getDashboardCopy } from "@/i18n/dashboard-copy";
import { useLocale } from "@/i18n/use-locale";
import { createClient } from "@/lib/supabase/client";
import { normalizeTenantType, type TenantType } from "@/lib/tenant-match";

type SearchTenantType = Exclude<TenantType, "everyone">;

const tenantValues: SearchTenantType[] = ["family", "bachelor", "student", "job_holder"];

function validSearchTenant(value: string): value is SearchTenantType {
  return tenantValues.includes(value as SearchTenantType);
}

export function RenterPreferenceForm({
  userId,
  initialPreference,
}: {
  userId: string;
  initialPreference: string | null;
}) {
  const router = useRouter();
  const { locale, dictionary } = useLocale();
  const copy = getDashboardCopy(locale).preference;
  const normalizedInitial = normalizeTenantType(initialPreference);
  const startingPreference: SearchTenantType | "" = normalizedInitial && normalizedInitial !== "everyone" ? normalizedInitial : "";
  const [preference, setPreference] = useState<SearchTenantType | "">(startingPreference);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const labels: Record<SearchTenantType, string> = {
    family: dictionary.common.tenant.family,
    bachelor: dictionary.common.tenant.bachelor,
    student: dictionary.common.tenant.student,
    job_holder: dictionary.common.tenant.jobHolder,
  };

  async function save() {
    if (!validSearchTenant(preference)) {
      setMessage(copy.required);
      return;
    }

    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ preferred_tenant_type: preference } as never)
      .eq("id", userId);

    if (error) {
      setMessage(copy.error);
      setBusy(false);
      return;
    }

    setMessage(copy.success);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="renter-preference-control">
      <label htmlFor="preferred-tenant-type">
        <span>{copy.label}</span>
        <select
          id="preferred-tenant-type"
          value={preference}
          onChange={(event) => setPreference(event.target.value as SearchTenantType | "")}
          disabled={busy}
          required
        >
          <option value="" disabled>{copy.choose}</option>
          {tenantValues.map((value) => <option key={value} value={value}>{labels[value]}</option>)}
        </select>
      </label>
      <button className="secondary-button" type="button" onClick={() => void save()} disabled={busy}>
        {busy ? copy.saving : copy.save}
      </button>
      {message && <p className="renter-preference-message" role="status" aria-live="polite">{message}</p>}
    </div>
  );
}
