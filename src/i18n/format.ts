import type { Locale } from "./config";

export function toIntlLocale(locale: Locale) {
  return locale === "bn" ? "bn-BD" : "en-BD";
}

export function formatNumber(
  value: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions,
) {
  return new Intl.NumberFormat(toIntlLocale(locale), options).format(value);
}

export function formatCurrency(value: number, locale: Locale) {
  return new Intl.NumberFormat(toIntlLocale(locale), {
    style: "currency",
    currency: "BDT",
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(
  value: Date | number | string,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  },
) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(toIntlLocale(locale), options).format(date);
}

export function formatRelativeTime(
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  locale: Locale,
) {
  return new Intl.RelativeTimeFormat(toIntlLocale(locale), {
    numeric: "auto",
  }).format(value, unit);
}
