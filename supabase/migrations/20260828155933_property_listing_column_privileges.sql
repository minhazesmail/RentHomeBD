revoke insert on table public.properties from authenticated;
grant insert (
  owner_id,
  title,
  description,
  address_text,
  property_type,
  rent_bdt,
  deposit_bdt,
  utilities_included,
  size_sqft,
  bedrooms,
  bathrooms,
  floor_number,
  total_floors,
  furnishing,
  gender_preference,
  available_from,
  latitude,
  longitude,
  location,
  status
) on table public.properties to authenticated;
