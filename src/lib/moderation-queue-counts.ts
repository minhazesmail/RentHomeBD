import type { SupabaseClient } from "@supabase/supabase-js";

export type ModerationQueueCounts = {
  listings: number;
  reports: number;
  accounts: number;
};

export async function getModerationQueueCounts(supabase: SupabaseClient): Promise<ModerationQueueCounts> {
  const [listingResult, reportResult, accountResult] = await Promise.all([
    supabase.from("properties").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    supabase.from("listing_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .in("primary_role", ["owner", "agent"])
      .is("role_verified_at", null),
  ]);

  return {
    listings: listingResult.count ?? 0,
    reports: reportResult.count ?? 0,
    accounts: accountResult.count ?? 0,
  };
}
