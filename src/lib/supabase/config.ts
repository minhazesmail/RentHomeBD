// Supabase publishable keys are designed for browser clients; authorization is
// enforced by RLS and database grants. Values must come from environment
// variables so each deployment can use an isolated project.

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Copy .env.example to .env.local and set the values for your Supabase project.`,
    );
  }
  return value;
}

export const SUPABASE_URL = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
export const SUPABASE_PUBLISHABLE_KEY = requiredEnv(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
);
