import { LandingMapPreviewClient, type LandingMapListing } from "@/components/landing-map-preview-client";
import { getLandingInventory } from "@/lib/landing-inventory";

export async function LandingMapPreview() {
  const { featuredListings } = await getLandingInventory();

  const listings: LandingMapListing[] = featuredListings.flatMap((listing) => {
    if (listing.latitude == null || listing.longitude == null) return [];
    return [{
      id: listing.id,
      title: listing.title,
      address_text: listing.address_text,
      rent_bdt: listing.rent_bdt,
      bedrooms: listing.bedrooms,
      latitude: listing.latitude,
      longitude: listing.longitude,
      cover_url: listing.imageUrl,
    }];
  });

  return <LandingMapPreviewClient listings={listings} />;
}
