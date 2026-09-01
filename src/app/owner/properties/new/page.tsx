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
          <Link className="brand-link compact-brand" href="/">NearBasha</Link>
          <p className="eyebrow">Owner workspace</p>
          <h1 className="listing-page-title">Create a rental listing</h1>
          <p className="intro">Build a trustworthy listing in five guided steps. Save an incomplete draft anytime; review requirements apply only when you submit.</p>
        </div>
        <Link className="text-link" href="/owner">Back to properties</Link>
      </header>

      <nav className="listing-workflow-ribbon" aria-label="Listing creation steps">
        <span><b>1</b>Basics & rent</span>
        <span><b>2</b>Home details</span>
        <span><b>3</b>Tenant fit</span>
        <span><b>4</b>Exact map pin</span>
        <span><b>5</b>Photos & video</span>
      </nav>

      <PropertyListingForm userId={auth.userId} amenities={amenities ?? []} />
    </main>
  );
}
