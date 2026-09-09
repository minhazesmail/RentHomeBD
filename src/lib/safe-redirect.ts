/**
 * Accept only same-origin relative URLs for post-auth redirects.
 * Query strings and fragments are allowed and must be preserved.
 * Rejects protocol-relative URLs (//evil.example), absolute URLs, and empty values.
 */
export function safeRelativePath(
  value: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
  // Block backslash tricks and control characters.
  if (trimmed.includes("\\") || /[\u0000-\u001F\u007F]/.test(trimmed)) {
    return fallback;
  }
  return trimmed;
}

/**
 * Resolve a validated relative destination against a deployer-controlled base URL.
 * Using URL construction (instead of assigning the destination to URL.pathname)
 * preserves nested query strings and fragments without allowing cross-origin redirects.
 */
export function safeRedirectUrl(
  baseUrl: string,
  value: string | null | undefined,
  fallback = "/dashboard",
): URL {
  const trustedOrigin = new URL(baseUrl).origin;
  return new URL(safeRelativePath(value, fallback), trustedOrigin);
}
