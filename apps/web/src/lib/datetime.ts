const CLINIC_TIME_ZONE = "Asia/Kuala_Lumpur";

// `en-MY` renders a lowercase meridiem; the verified design uses "2:00 PM".
export function formatClinicTime(value: string | Date): string {
  const parts = new Intl.DateTimeFormat("en-MY", {
    timeZone: CLINIC_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("hour")}:${part("minute")} ${part("dayPeriod").toUpperCase()}`.trim();
}
