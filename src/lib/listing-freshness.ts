export const RECONFIRM_SOON_DAYS = 3;

export type ListingFreshnessSummary = {
  status: string;
  expires_at: string | null;
};

export function daysUntilListingExpiry(expiresAt: string | null, nowMs: number) {
  if (!expiresAt) return null;
  const expires = new Date(expiresAt).getTime();
  if (!Number.isFinite(expires)) return null;
  return Math.max(0, Math.ceil((expires - nowMs) / 86_400_000));
}

export function listingNeedsAttention(listing: ListingFreshnessSummary, nowMs: number) {
  if (listing.status === "pending_confirmation" || listing.status === "rejected") return true;
  if (listing.status !== "available") return false;
  const days = daysUntilListingExpiry(listing.expires_at, nowMs);
  return days !== null && days <= RECONFIRM_SOON_DAYS;
}
