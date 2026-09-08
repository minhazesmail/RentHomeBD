import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

type Profile = Pick<
  Tables<"profiles">,
  "id" | "display_name" | "primary_role" | "avatar_path"
>;

export type AuthContext = {
  userId: string;
  email?: string;
  phone?: string;
  profile: Profile;
};

async function ensureProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<Profile | null> {
  const { data: existing } = await supabase
    .from("profiles")
    .select("id, display_name, primary_role, avatar_path")
    .eq("id", userId)
    .maybeSingle();

  if (existing) return existing;

  // Fallback when the auth trigger did not create a row (partial signup, race, etc.).
  // Always create as renter; owner/agent roles are only set by the signup trigger
  // from trusted metadata or by security-definer paths.
  const { data: created, error } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      primary_role: "renter",
    })
    .select("id, display_name, primary_role, avatar_path")
    .maybeSingle();

  if (error || !created) return null;
  return created;
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const claims = claimsData?.claims;

  if (claimsError || !claims?.sub) return null;

  const profile = await ensureProfile(supabase, claims.sub);
  if (!profile) return null;

  return {
    userId: claims.sub,
    email: typeof claims.email === "string" ? claims.email : undefined,
    phone: typeof claims.phone === "string" ? claims.phone : undefined,
    profile,
  };
}

export async function requireUser() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  return auth;
}

export async function requireOwnerOrAgent() {
  const auth = await requireUser();
  if (
    auth.profile.primary_role !== "owner" &&
    auth.profile.primary_role !== "agent"
  ) {
    redirect("/dashboard?error=owner-role-required");
  }
  return auth;
}

export async function requireModerator() {
  const auth = await requireUser();
  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("moderators")
    .select("user_id")
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (!membership) redirect("/dashboard?error=moderator-role-required");
  return auth;
}
