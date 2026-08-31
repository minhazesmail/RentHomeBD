import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";

import { PhoneVerificationForm } from "@/components/phone-verification-form";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PhoneVerificationPage() {
  const auth = await requireUser();
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const { data: trustProfile } = await supabase
    .from("profiles")
    .select("phone_verified_at")
    .eq("id", auth.userId)
    .maybeSingle();

  return (
    <main className="listing-shell">
      <header className="listing-page-header">
        <div>
          <Link className="brand-link compact-brand" href="/">NearBasha</Link>
          <p className="eyebrow">Account security</p>
          <h1 className="listing-page-title">Phone verification</h1>
          <p className="intro">Link and verify a Bangladesh mobile number to add a phone-verified trust signal to your account.</p>
        </div>
        <Link className="text-link" href="/dashboard">Back to dashboard</Link>
      </header>

      <PhoneVerificationForm
        currentPhone={auth.phone ?? null}
        isVerified={Boolean(trustProfile?.phone_verified_at)}
      />

      <section className="listing-section" style={{ marginTop: 22 }}>
        <div className="section-heading"><span>i</span><div><h2>How this trust signal works</h2><p>Verification proves control of the phone number at the time of verification. It does not prove legal identity or property ownership.</p></div></div>
        <p className="section-copy">The SMS is sent and the OTP is validated by Supabase Auth using the configured provider. Provider credentials belong in Supabase Auth settings only; they must never be placed in NEXT_PUBLIC variables, committed to Git, or stored in the browser.</p>
      </section>
    </main>
  );
}
