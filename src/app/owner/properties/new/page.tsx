import Link from "next/link";

import { ListingDraftGuard } from "@/components/listing-draft-guard";
import editorStyles from "@/components/listing-editor.module.css";
import { ListingWorkflowNav } from "@/components/listing-workflow-nav";
import { ProductNavigation } from "@/components/product-navigation";
import { PropertyListingForm } from "@/components/property-listing-form";
import { requireOwnerOrAgent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import "../listing-media-styles.css";
export const dynamic = "force-dynamic";

export default async function NewPropertyPage() {
  const auth = await requireOwnerOrAgent();
  const supabase = await createClient();
  const { data: amenities } = await supabase.from("amenities").select("slug, name").order("name");

  return (
    <main className="listing-shell listing-editor-page">
      <ProductNavigation authenticated canList current="properties" />
      <header className="listing-page-header listing-editor-header">
        <div>
          <p className="eyebrow">Owner workspace · New listing</p>
          <h1 className="listing-page-title">Create a rental listing</h1>
          <p className="intro">Work through one renter-facing step at a time. Your readiness panel stays visible as the listing becomes ready for review.</p>
        </div>
        <Link className="text-link" href="/owner">Back to properties</Link>
      </header>

      <div className={editorStyles.editorShell}>
        <ListingWorkflowNav mode="creation" />
        <div>
          <ListingDraftGuard userId={auth.userId} />
          <PropertyListingForm userId={auth.userId} amenities={amenities ?? []} />
        </div>
      </div>
    </main>
  );
}
