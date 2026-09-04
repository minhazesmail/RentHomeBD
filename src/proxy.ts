import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/saved/:path*",
    "/messages/:path*",
    "/dashboard/:path*",
    "/owner/:path*",
    "/account/:path*",
    "/moderation/:path*",
  ],
};
