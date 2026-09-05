import Link from "next/link";
import { LockKeyhole, ShieldCheck } from "lucide-react";
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
  const isVerified = Boolean(trustProfile?.phone_verified_at);

  return (
    <main className="verification-shell phone-verification-shell">
      <header className="listing-page-header verification-page-header phone-verification-page-header">
        <div>
          <Link className="brand-link compact-brand" href="/">NearBasha</Link>
          <p className="eyebrow">Account trust</p>
          <h1 className="listing-page-title">{isVerified ? "Your phone is verified" : "Verify your phone"}</h1>
          <p className="intro">Confirm a Bangladesh mobile number you control. Verification adds a clear trust signal while keeping your number private on public listings.</p>
        </div>
        <Link className="text-link" href="/dashboard">Back to dashboard</Link>
      </header>

      <PhoneVerificationForm
        currentPhone={auth.phone ?? null}
        isVerified={isVerified}
      />

      <section className="phone-verification-trust-note" aria-labelledby="phone-trust-note-heading">
        <div className="phone-verification-trust-note-heading">
          <span><ShieldCheck size={20} aria-hidden="true" /></span>
          <div>
            <p className="eyebrow">What the badge means</p>
            <h2 id="phone-trust-note-heading">A useful signal, not an identity guarantee</h2>
          </div>
        </div>
        <div className="phone-verification-trust-grid">
          <div>
            <ShieldCheck size={17} aria-hidden="true" />
            <span><strong>It confirms</strong> that the account controlled the verified mobile number when verification was completed.</span>
          </div>
          <div>
            <LockKeyhole size={17} aria-hidden="true" />
            <span><strong>It does not confirm</strong> legal identity, property ownership, or whether every listing detail is accurate.</span>
          </div>
        </div>
      </section>
    </main>
  );
}
