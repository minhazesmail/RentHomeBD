import Link from "next/link";

import { RecoveryState } from "@/components/recovery-state";

export default function AuthErrorPage() {
  return (
    <RecoveryState
      eyebrow="Account recovery"
      title="That sign-in link is no longer available."
      description="The confirmation or recovery link may have expired or already been used. Return to sign in to continue, or request a new password reset link if you were recovering your account."
      primaryAction={<Link href="/login">Return to sign in</Link>}
      secondaryAction={<Link href="/">Back to home</Link>}
      headingId="auth-recovery-heading"
    />
  );
}
