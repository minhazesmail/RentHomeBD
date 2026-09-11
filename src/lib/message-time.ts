import type { Locale } from "@/i18n/config";
import { formatWorkflowText, getWorkflowCopy } from "@/i18n/workflow-copy";

const MESSAGE_TIME_ZONE = "Asia/Dhaka";

function localeTag(locale: Locale) {
  return locale === "bn" ? "bn-BD" : "en-BD";
}

function timeFormatter(locale: Locale) {
  return new Intl.DateTimeFormat(localeTag(locale), {
    timeZone: MESSAGE_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  });
}

function shortDateFormatter(locale: Locale) {
  return new Intl.DateTimeFormat(localeTag(locale), {
    timeZone: MESSAGE_TIME_ZONE,
    day: "numeric",
    month: "short",
  });
}

function fullDateFormatter(locale: Locale) {
  return new Intl.DateTimeFormat(localeTag(locale), {
    timeZone: MESSAGE_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function exactFormatter(locale: Locale) {
  return new Intl.DateTimeFormat(localeTag(locale), {
    timeZone: MESSAGE_TIME_ZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function dhakaDateParts(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MESSAGE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const record = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    key: `${record.year}-${record.month}-${record.day}`,
    year: record.year,
  };
}

function addDhakaDays(reference: Date, days: number) {
  return new Date(reference.getTime() + days * 86_400_000);
}

export function formatInboxMessageTime(value: string, reference = new Date(), locale: Locale = "en") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const copy = getWorkflowCopy(locale).messages.time;
  const messageDate = dhakaDateParts(date);
  const today = dhakaDateParts(reference);
  const yesterday = dhakaDateParts(addDhakaDays(reference, -1));

  if (messageDate.key === today.key) return timeFormatter(locale).format(date);
  if (messageDate.key === yesterday.key) return copy.yesterday;
  return messageDate.year === today.year ? shortDateFormatter(locale).format(date) : fullDateFormatter(locale).format(date);
}

export function formatThreadMessageTime(value: string, reference = new Date(), locale: Locale = "en") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const copy = getWorkflowCopy(locale).messages.time;
  const messageDate = dhakaDateParts(date);
  const today = dhakaDateParts(reference);
  const yesterday = dhakaDateParts(addDhakaDays(reference, -1));
  const time = timeFormatter(locale).format(date);

  if (messageDate.key === today.key) return time;
  if (messageDate.key === yesterday.key) return formatWorkflowText(copy.yesterdayAt, { time });
  const dateLabel = messageDate.year === today.year ? shortDateFormatter(locale).format(date) : fullDateFormatter(locale).format(date);
  return `${dateLabel}, ${time}`;
}

export function formatExactMessageTime(value: string, locale: Locale = "en") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const copy = getWorkflowCopy(locale).messages.time;
  return formatWorkflowText(copy.bangladeshTime, { time: exactFormatter(locale).format(date) });
}
