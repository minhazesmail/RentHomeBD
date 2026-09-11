export const PUBLIC_MEDIA_TTL_SECONDS = 300;
export const PUBLIC_MEDIA_REFRESH_MS = 240_000;

export function publicMediaRefreshIsBeforeExpiry() {
  return PUBLIC_MEDIA_REFRESH_MS < PUBLIC_MEDIA_TTL_SECONDS * 1000;
}

export function storagePathFromSignedUrl(signedUrl: string) {
  try {
    const url = new URL(signedUrl, "https://nearbasha.invalid");
    const marker = "/object/sign/property-media/";
    const index = url.pathname.indexOf(marker);
    if (index < 0) return null;
    return decodeURIComponent(url.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
}
