"use client";

import LeafletMap, { type MapListing } from "@/components/leaflet-map";

const DHAKA_CENTER: [number, number] = [23.7808, 90.4073];

const previewListings: MapListing[] = [
  {
    id: "dhanmondi-preview",
    title: "Bright 3-bedroom in Dhanmondi",
    address_text: "Road 8, Dhanmondi, Dhaka",
    property_type: "apartment",
    rent_bdt: 32000,
    bedrooms: 3,
    bathrooms: 3,
    furnishing: "semi_furnished",
    available_from: null,
    latitude: 23.7465,
    longitude: 90.3760,
    distance_meters: null,
    cover_media_path: null,
  },
  {
    id: "banani-preview",
    title: "Modern flat near Banani 11",
    address_text: "Banani, Dhaka",
    property_type: "apartment",
    rent_bdt: 42000,
    bedrooms: 2,
    bathrooms: 2,
    furnishing: "furnished",
    available_from: null,
    latitude: 23.7937,
    longitude: 90.4066,
    distance_meters: null,
    cover_media_path: null,
  },
  {
    id: "bashundhara-preview",
    title: "Family apartment in Bashundhara",
    address_text: "Bashundhara R/A, Dhaka",
    property_type: "apartment",
    rent_bdt: 28000,
    bedrooms: 3,
    bathrooms: 2,
    furnishing: "unfurnished",
    available_from: null,
    latitude: 23.8133,
    longitude: 90.4315,
    distance_meters: null,
    cover_media_path: null,
  },
];

export function LandingMapPreview() {
  return (
    <div className="landing-map-preview" aria-label="Preview of rental listings pinned across Dhaka">
      <LeafletMap
        listings={previewListings}
        center={DHAKA_CENTER}
        radiusKm={null}
        selectedId="dhanmondi-preview"
        onSelect={() => undefined}
      />
      <div className="demo-card">
        <div className="demo-card-top">
          <div>
            <h3>Bright 3-bedroom in Dhanmondi</h3>
            <p>Road 8 · exact location pinned</p>
          </div>
          <div className="demo-price">৳32,000/mo</div>
        </div>
        <div className="demo-meta">
          <span>3 bedrooms</span>
          <span>Family friendly</span>
          <span>Fresh listing</span>
        </div>
      </div>
    </div>
  );
}
