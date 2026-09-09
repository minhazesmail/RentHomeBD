import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { safeRedirectUrl, safeRelativePath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

function trustedAppUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!appUrl) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_APP_URL");
  }
  return appUrl;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = safeRelativePath(searchParams.get("next"));
  const supabase = await createClient();

  let error = null;
  if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (tokenHash && type) {
    ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }));
  } else {
    error = new Error("Missing authentication confirmation parameters");
  }

  const destination = error
    ? "/auth/error?message=confirmation-failed"
    : next;
  const redirectTo = safeRedirectUrl(trustedAppUrl(), destination);
  return NextResponse.redirect(redirectTo);
}
