import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 routing proxy (replaces the deprecated middleware.ts convention).
 * Runs on the Node.js runtime. Used here only for session cookie refresh and
 * unauthenticated redirects on protected routes. Authoritative auth checks still
 * happen in server components via requireUser / requireOwnerOrAgent / requireModerator.
 *
 * @see https://nextjs.org/docs/app/getting-started/proxy
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Protect authenticated product areas. Keep this list in sync with
     * PROTECTED_ROUTE_PREFIXES in src/lib/supabase/proxy.ts.
     */
    "/saved",
    "/saved/:path*",
    "/messages",
    "/messages/:path*",
    "/dashboard",
    "/dashboard/:path*",
    "/owner",
    "/owner/:path*",
    "/account",
    "/account/:path*",
    "/moderation",
    "/moderation/:path*",
  ],
};
