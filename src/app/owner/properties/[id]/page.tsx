import Link from "next/link";
import { notFound } from "next/navigation";

import { PropertyListingForm } from "@/components/property-listing-form";
import { requireOwnerOrAgent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOwnerOrAgent();
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: property }, { data: amenities }, { data: tenantRows }, { data: amenityRows }, { data: mediaRows }] = await Promise.all([
    supabase.from("properties").select("id, title, description, address_text, property_type, rent_bdt, deposit_bdt, utilities_included, size_sqft, bedrooms, bathrooms, floor_number, total_floors, furnishing, gender_preference, available_from, latitude, longitude, status, moderation_notes").eq("id", id).eq("owner_id", auth.userId).maybeSingle(),
    supabase.from("amenities").select("slug, name").order("name"),
    supabase.from("property_tenant_types").select("tenant_type").eq("property_id", id),
    supabase.from("property_amenities").select("amenity_slug").eq("property_id", id),
    supabase.from("property_media").select("id, storage_path, media_type, sort_order").eq("property_id", id).order("sort_order"),
  ]);

  if (!property) notFound();

  const formProperty = {
    ...property,
    tenant_types: (tenantRows ?? []).map((row) => row.tenant_type),
    amenities: (amenityRows ?? []).map((row) => row.amenity_slug),
    media: (mediaRows ?? []).map(({ id: mediaId, storage_path, media_type }) => ({ id: mediaId, storage_path, media_type })),
  };

  return (
    <main className="listing-shell">
      <header className="listing-page-header">
        <div>
          <Link className="brand-link compact-brand" href="/">RentHomeBD</Link>
          <p className="eyebrow">Owner workspace</p>
          <h1 className="listing-page-title">Edit listing</h1>
          <p className="intro">Changes stay private until the listing passes moderation.</p>
        </div>
        <Link className="text-link" href="/owner">Back to properties</Link>
      </header>

      <PropertyListingForm userId={auth.userId} amenities={amenities ?? []} property={formProperty} />
    </main>
  );
}
