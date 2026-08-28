import Link from "next/link";

import { PropertyListingForm } from "@/components/property-listing-form";
import { requireOwnerOrAgent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NewPropertyPage() {
  const auth = await requireOwnerOrAgent();
  const supabase = await createClient();
  const { data: amenities } = await supabase.from("amenities").select("slug, name").order("name");

  return (
    <main className="listing-shell">
      <header className="listing-page-header">
        <div>
          <Link className="brand-link compact-brand" href="/">RentHomeBD</Link>
          <p className="eyebrow">Owner workspace</p>
          <h1 className="listing-page-title">Create a rental listing</h1>
          <p className="intro">Save an incomplete draft anytime. Submission checks run only when you send the listing for moderation.</p>
        </div>
        <Link className="text-link" href="/owner">Back to properties</Link>
      </header>

      <PropertyListingForm userId={auth.userId} amenities={amenities ?? []} />
    </main>
  );
}
