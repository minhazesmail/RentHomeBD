import type { MapListing } from "@/components/leaflet-map";
import { LandingMapPreviewClient } from "@/components/landing-map-preview-client";
import { getLandingInventory } from "@/lib/landing-inventory";

export async function LandingMapPreview() {
  const { featuredListings } = await getLandingInventory();

  const listings: MapListing[] = featuredListings.flatMap((listing) => {
    if (listing.latitude == null || listing.longitude == null) return [];
    return [{
      id: listing.id,
      title: listing.title,
      address_text: listing.address_text,
      property_type: listing.property_type,
      rent_bdt: listing.rent_bdt,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      furnishing: listing.furnishing ?? "unfurnished",
      available_from: listing.available_from,
      latitude: listing.latitude,
      longitude: listing.longitude,
      distance_meters: null,
      cover_media_path: null,
      cover_url: listing.imageUrl,
      tenant_types: listing.tenantTypes,
    }];
  });

  return <LandingMapPreviewClient listings={listings} />;
}
