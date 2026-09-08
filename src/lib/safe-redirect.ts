/**
 * Accept only same-origin relative paths for post-auth redirects.
 * Rejects protocol-relative URLs (//evil.example), absolute URLs, and empty values.
 */
export function safeRelativePath(
  value: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
  // Block backslash tricks and control characters
  if (trimmed.includes("\\") || /[\u0000-\u001F\u007F]/.test(trimmed)) {
    return fallback;
  }
  return trimmed;
}
