import { DEFAULT_CALENDAR } from "@/lib/domain/sla";

const TIMEZONE = process.env.APP_DISPLAY_TIMEZONE ?? "America/Bogota";

export function formatDateTime(date: Date | null | undefined, fallback = "—"): string {
  if (!date) return fallback;
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: TIMEZONE,
  }).format(date);
}

export function formatDate(date: Date | null | undefined, fallback = "—"): string {
  if (!date) return fallback;
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: TIMEZONE }).format(date);
}

/** "hace 3 días", "en 5 horas". */
export function formatRelative(date: Date | null | undefined, now: Date = new Date()): string {
  if (!date) return "—";
  const diffMs = date.getTime() - now.getTime();
  const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 365 * 24 * 3600_000],
    ["month", 30 * 24 * 3600_000],
    ["day", 24 * 3600_000],
    ["hour", 3600_000],
    ["minute", 60_000],
  ];
  for (const [unit, ms] of units) {
    if (Math.abs(diffMs) >= ms) return rtf.format(Math.round(diffMs / ms), unit);
  }
  return "hace un momento";
}

/**
 * Valor para <input type="datetime-local">, expresado en la hora local de la
 * operación (no en la del navegador de quien consulta).
 */
export function toDateTimeInput(date: Date | null | undefined): string {
  if (!date) return "";
  const shifted = new Date(date.getTime() + DEFAULT_CALENDAR.utcOffsetMinutes * 60_000);
  return shifted.toISOString().slice(0, 16);
}

/** Interpreta lo escrito en un <input type="datetime-local"> como hora local de la operación. */
export function fromDateTimeInput(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getTime() - DEFAULT_CALENDAR.utcOffsetMinutes * 60_000);
}
