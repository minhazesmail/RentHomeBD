const INTERNAL_URL_BASE = "https://nearbasha.invalid";

export function safeInternalPath(value: string | null | undefined, fallback = "/dashboard") {
  const candidate = value?.trim();
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) {
    return fallback;
  }

  try {
    const parsed = new URL(candidate, INTERNAL_URL_BASE);
    if (parsed.origin !== INTERNAL_URL_BASE) return fallback;

    const decodedPath = decodeURIComponent(parsed.pathname);
    if (decodedPath.startsWith("//") || decodedPath.includes("\\")) return fallback;

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
