export function bangladeshPhoneSubscriberDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("880")) return digits.slice(3, 13);
  if (digits.startsWith("0") && digits.length > 1) return digits.slice(1, 11);
  return digits.slice(0, 10);
}

export function normalizeBangladeshPhone(value: string) {
  const subscriber = bangladeshPhoneSubscriberDigits(value);
  return /^1[3-9]\d{8}$/.test(subscriber) ? `+880${subscriber}` : null;
}
