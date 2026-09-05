"use client";

import Link from "next/link";

import { RecoveryState } from "@/components/recovery-state";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RecoveryState
      eyebrow="Something went off route"
      title="NearBasha could not load this page."
      description="Your account and saved data have not been changed by this screen. Try loading the page again, or return to the live map and continue from there."
      primaryAction={<button type="button" onClick={() => reset()}>Try again</button>}
      secondaryAction={<Link href="/homes">Open live map</Link>}
      headingId="recovery-heading"
    />
  );
}
