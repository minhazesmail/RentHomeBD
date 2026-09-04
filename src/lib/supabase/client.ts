import { createBrowserClient } from "@supabase/ssr";

import type { AppDatabase } from "./app-database.types";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config";

export function createClient() {
  return createBrowserClient<AppDatabase>(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
  );
}
