import { createClient } from "@supabase/supabase-js";
import { LandingMapPreviewClient } from "@/components/landing-map-preview-client";
import { LANDING_PREVIEW_AREAS, loadNeighborhoodInventory } from "@/lib/landing-neighborhood-inventory";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

export async function LandingMapPreview() {
  const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const initialInventory = await loadNeighborhoodInventory(client, LANDING_PREVIEW_AREAS[0], AbortSignal.timeout(8000));
  return <LandingMapPreviewClient initialInventory={initialInventory} />;
}
