export const DEFAULT_APP_TIME_ZONE = "Asia/Shanghai";

function twoDigit(value: string | undefined) {
  return String(value ?? "").padStart(2, "0");
}

function getDateParts(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
}

export function getLocalDateInTimeZone(date: Date, timeZone = process.env.APP_TIME_ZONE ?? DEFAULT_APP_TIME_ZONE) {
  let parts: Intl.DateTimeFormatPart[];

  try {
    parts = getDateParts(date, timeZone);
  } catch {
    parts = getDateParts(date, DEFAULT_APP_TIME_ZONE);
  }

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${twoDigit(month)}-${twoDigit(day)}`;
}

export function getTodayLocalDate() {
  return getLocalDateInTimeZone(new Date());
}
