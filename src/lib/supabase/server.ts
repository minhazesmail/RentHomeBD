import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { AppDatabase } from "./app-database.types";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<AppDatabase>(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot always write cookies. Session refresh will
            // be handled by the auth proxy when authentication is implemented.
          }
        },
      },
    },
  );
}
