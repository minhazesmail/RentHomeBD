// Supabase publishable keys are designed for browser clients; authorization is
// enforced by RLS and database grants. Browser-visible environment variables
// must be referenced statically so Next.js can inline them into client bundles.

function requiredPublicEnv(name: string, value: string | undefined): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Copy .env.example to .env.local and set the values for your Supabase project.`,
    );
  }
  return normalized;
}

export const SUPABASE_URL = requiredPublicEnv(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL,
);

export const SUPABASE_PUBLISHABLE_KEY = requiredPublicEnv(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
