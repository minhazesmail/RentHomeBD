// These values are intentionally public. Supabase publishable keys are designed
// for browser clients; authorization is enforced by RLS and database grants.
// Environment variables can still override them for other deployments.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://naoarepmcfdnxehbdios.supabase.co";

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_Af21QWd3B7XLt_4TmoWEQw_deZseDwD";
