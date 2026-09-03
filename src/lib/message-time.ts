const MESSAGE_TIME_ZONE = "Asia/Dhaka";

const TIME_FORMATTER = new Intl.DateTimeFormat("en-BD", {
  timeZone: MESSAGE_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("en-BD", {
  timeZone: MESSAGE_TIME_ZONE,
  day: "numeric",
  month: "short",
});

const FULL_DATE_FORMATTER = new Intl.DateTimeFormat("en-BD", {
  timeZone: MESSAGE_TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});

const EXACT_FORMATTER = new Intl.DateTimeFormat("en-BD", {
  timeZone: MESSAGE_TIME_ZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

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

export function formatInboxMessageTime(value: string, reference = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const messageDate = dhakaDateParts(date);
  const today = dhakaDateParts(reference);
  const yesterday = dhakaDateParts(addDhakaDays(reference, -1));

  if (messageDate.key === today.key) return TIME_FORMATTER.format(date);
  if (messageDate.key === yesterday.key) return "Yesterday";
  return messageDate.year === today.year ? SHORT_DATE_FORMATTER.format(date) : FULL_DATE_FORMATTER.format(date);
}

export function formatThreadMessageTime(value: string, reference = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const messageDate = dhakaDateParts(date);
  const today = dhakaDateParts(reference);
  const yesterday = dhakaDateParts(addDhakaDays(reference, -1));
  const time = TIME_FORMATTER.format(date);

  if (messageDate.key === today.key) return time;
  if (messageDate.key === yesterday.key) return `Yesterday, ${time}`;
  const dateLabel = messageDate.year === today.year ? SHORT_DATE_FORMATTER.format(date) : FULL_DATE_FORMATTER.format(date);
  return `${dateLabel}, ${time}`;
}

export function formatExactMessageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${EXACT_FORMATTER.format(date)} Bangladesh time`;
}
