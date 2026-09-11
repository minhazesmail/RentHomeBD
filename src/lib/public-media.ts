export const PUBLIC_MEDIA_TTL_SECONDS = 300;
export const PUBLIC_MEDIA_REFRESH_MS = 240_000;

export function publicMediaRefreshIsBeforeExpiry() {
  return PUBLIC_MEDIA_REFRESH_MS < PUBLIC_MEDIA_TTL_SECONDS * 1000;
}
