// These values are intentionally public. Supabase publishable keys are designed
// for browser clients; authorization is enforced by RLS and database grants.
// Environment variables still override them for isolated deployments.
const DEFAULT_SUPABASE_URL = "https://naoarepmcfdnxehbdios.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_Af21QWd3B7XLt_4TmoWEQw_deZseDwD";

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  DEFAULT_SUPABASE_PUBLISHABLE_KEY;
