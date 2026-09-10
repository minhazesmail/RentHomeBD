import { randomUUID } from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ListingDraftGuard } from "@/components/listing-draft-guard";
import editorStyles from "@/components/listing-editor.module.css";
import { ListingWorkflowNav } from "@/components/listing-workflow-nav";
import { ProductNavigation } from "@/components/product-navigation";
import { PropertyListingForm } from "@/components/property-listing-form";
import { requireOwnerOrAgent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import "../listing-media-styles.css";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type NewPropertySearchParams = {
  draft?: string | string[];
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewPropertyPage({
  searchParams,
}: {
  searchParams: Promise<NewPropertySearchParams>;
}) {
  const auth = await requireOwnerOrAgent();
  const params = await searchParams;
  const requestedDraftId = firstValue(params.draft)?.trim();

  // Give a new-listing attempt a stable UUID before the first write. The URL
  // survives refresh/network ambiguity, so a retry cannot silently create a
  // second draft if the first request committed but its response was lost.
  if (!requestedDraftId || !UUID_PATTERN.test(requestedDraftId)) {
    redirect(`/owner/properties/new?draft=${randomUUID()}`);
  }

  const draftId = requestedDraftId;
  const supabase = await createClient();
  const [{ data: amenities }, { data: existingDraft }] = await Promise.all([
    supabase.from("amenities").select("slug, name").order("name"),
    supabase
      .from("properties")
      .select("id")
      .eq("id", draftId)
      .eq("owner_id", auth.userId)
      .maybeSingle(),
  ]);

  // If an earlier save committed before the browser lost the response, resume
  // through the normal edit route instead of presenting another blank form.
  if (existingDraft) {
    redirect(`/owner/properties/${draftId}`);
  }

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
          <ListingDraftGuard userId={auth.userId} propertyId={draftId} />
          <PropertyListingForm userId={auth.userId} amenities={amenities ?? []} draftId={draftId} />
        </div>
      </div>
    </main>
  );
}