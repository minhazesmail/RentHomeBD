/**
 * Bangladesh mobile number helpers.
 *
 * Accepted operator prefixes (national subscriber form starts with 1X):
 *   013, 014, 015, 016, 017, 018, 019
 *
 * Source of truth for the regex: BD_MOBILE_PREFIX_PATTERN below.
 * When BTRC assigns new ranges, update the pattern and the QA script
 * scripts/check-bangladesh-phone.mjs in the same change.
 */
export const BD_MOBILE_PREFIX_PATTERN = /^1[3-9]\d{8}$/;

/** Documented national prefixes currently accepted (without leading 0). */
export const BD_MOBILE_PREFIXES = [
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
] as const;

export function bangladeshPhoneSubscriberDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("880")) return digits.slice(3, 13);
  if (digits.startsWith("0") && digits.length > 1) return digits.slice(1, 11);
  return digits.slice(0, 10);
}

export function normalizeBangladeshPhone(value: string) {
  const subscriber = bangladeshPhoneSubscriberDigits(value);
  return BD_MOBILE_PREFIX_PATTERN.test(subscriber)
    ? `+880${subscriber}`
    : null;
}
