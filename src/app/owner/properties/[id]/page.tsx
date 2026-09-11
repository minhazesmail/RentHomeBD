import Link from "next/link";
import { notFound } from "next/navigation";

import { ListingDraftGuard } from "@/components/listing-draft-guard";
import editorStyles from "@/components/listing-editor.module.css";
import { ListingWorkflowNav } from "@/components/listing-workflow-nav";
import { ProductNavigation } from "@/components/product-navigation";
import { PropertyListingForm } from "@/components/property-listing-form";
import { getLocale } from "@/i18n/get-locale";
import { getOwnerEditorCopy } from "@/i18n/owner-editor-copy";
import { getWorkflowCopy } from "@/i18n/workflow-copy";
import { requireOwnerOrAgent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import "../listing-media-styles.css";
export const dynamic = "force-dynamic";

const OWNER_MEDIA_PREVIEW_TTL_SECONDS = 300;

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const [auth, locale] = await Promise.all([requireOwnerOrAgent(), getLocale()]);
  const { id } = await params;
  const supabase = await createClient();
  const pageCopy = getOwnerEditorCopy(locale).editPage;
  const commonOwnerCopy = getWorkflowCopy(locale).owner.page;

  const [{ data: property }, { data: amenities }, { data: tenantRows }, { data: amenityRows }, { data: mediaRows }] = await Promise.all([
    supabase.from("properties").select("id, title, description, address_text, property_type, rent_bdt, deposit_bdt, utilities_included, size_sqft, bedrooms, bathrooms, floor_number, total_floors, furnishing, gender_preference, available_from, latitude, longitude, status, moderation_notes").eq("id", id).eq("owner_id", auth.userId).maybeSingle(),
    supabase.from("amenities").select("slug, name").order("name"),
    supabase.from("property_tenant_types").select("tenant_type").eq("property_id", id),
    supabase.from("property_amenities").select("amenity_slug").eq("property_id", id),
    supabase.from("property_media").select("id, storage_path, media_type, sort_order").eq("property_id", id).order("sort_order"),
  ]);

  if (!property) notFound();

  const mediaWithPreviews = await Promise.all((mediaRows ?? []).map(async ({ id: mediaId, storage_path, media_type, sort_order }) => {
    const { data: signed } = await supabase.storage.from("property-media").createSignedUrl(storage_path, OWNER_MEDIA_PREVIEW_TTL_SECONDS);
    return { id: mediaId, storage_path, media_type, sort_order, preview_url: signed?.signedUrl ?? null };
  }));

  const formProperty = {
    ...property,
    tenant_types: (tenantRows ?? []).map((row) => row.tenant_type),
    amenities: (amenityRows ?? []).map((row) => row.amenity_slug),
    media: mediaWithPreviews,
  };
  const editable = ["draft", "pending_review", "rejected"].includes(property.status);

  return (
    <main className="listing-shell listing-editor-page">
      <ProductNavigation authenticated canList current="properties" />
      <header className="listing-page-header listing-editor-header">
        <div>
          <p className="eyebrow">{pageCopy.eyebrow}</p>
          <h1 className="listing-page-title">{pageCopy.title}</h1>
          <p className="intro">{pageCopy.description}</p>
        </div>
        <Link className="text-link" href="/owner">{commonOwnerCopy.backToProperties}</Link>
      </header>

      <div className={editorStyles.editorShell}>
        <ListingWorkflowNav mode="editing" />
        <div>
          {editable && <ListingDraftGuard userId={auth.userId} propertyId={id} />}
          <PropertyListingForm userId={auth.userId} amenities={amenities ?? []} property={formProperty} />
        </div>
      </div>
    </main>
  );
}
