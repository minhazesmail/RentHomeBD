import Link from "next/link";

import { RecoveryState } from "@/components/recovery-state";

export default function NotFound() {
  return (
    <RecoveryState
      eyebrow="404 · Route not found"
      title="This place is not on the map."
      description="The page may have moved, the listing may no longer be available, or the address may be incorrect. Return to the live Dhaka map or start again from NearBasha."
      primaryAction={<Link href="/homes">Open live map</Link>}
      secondaryAction={<Link href="/">Back to home</Link>}
      headingId="not-found-heading"
    />
  );
}
