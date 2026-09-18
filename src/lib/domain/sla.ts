import type { Priority } from "@prisma/client";

/**
 * Calendario laboral usado para calcular la fecha estimada de cierre.
 *
 * El desfase horario se expresa en minutos respecto a UTC y se configura con
 * APP_UTC_OFFSET_MINUTES. Se usa un desfase fijo (no una zona IANA) porque las
 * sedes donde opera la mesa no aplican horario de verano; así el cálculo es
 * determinista y no depende de la zona horaria del servidor.
 */
export type WorkCalendar = {
  utcOffsetMinutes: number;
  /** Hora de inicio de la jornada, en horas locales (8 = 8:00 a. m.). */
  startHour: number;
  /** Hora de fin de la jornada, en horas locales (17 = 5:00 p. m.). */
  endHour: number;
  /** Días laborables, 0 = domingo … 6 = sábado. */
  workDays: number[];
};

export const DEFAULT_CALENDAR: WorkCalendar = {
  utcOffsetMinutes: Number(process.env.APP_UTC_OFFSET_MINUTES ?? -300),
  startHour: Number(process.env.APP_WORKDAY_START_HOUR ?? 8),
  endHour: Number(process.env.APP_WORKDAY_END_HOUR ?? 17),
  workDays: [1, 2, 3, 4, 5],
};

const MINUTE = 60_000;
const DAY_MINUTES = 24 * 60;

/** Convierte una fecha real a la "hora de pared" del calendario. */
function toLocal(date: Date, cal: WorkCalendar): Date {
  return new Date(date.getTime() + cal.utcOffsetMinutes * MINUTE);
}

function fromLocal(local: Date, cal: WorkCalendar): Date {
  return new Date(local.getTime() - cal.utcOffsetMinutes * MINUTE);
}

/** Minutos transcurridos desde la medianoche local. */
function minutesOfDay(local: Date): number {
  return local.getUTCHours() * 60 + local.getUTCMinutes();
}

function startOfLocalDay(local: Date): Date {
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
}

function isWorkDay(local: Date, cal: WorkCalendar): boolean {
  return cal.workDays.includes(local.getUTCDay());
}

/**
 * Lleva el cursor al siguiente instante hábil: si cae fuera de la jornada o en
 * un día no laborable, avanza al inicio de la próxima jornada.
 */
function nextWorkingInstant(local: Date, cal: WorkCalendar): Date {
  const openMin = cal.startHour * 60;
  const closeMin = cal.endHour * 60;
  let cursor = local;

  for (let guard = 0; guard < 400; guard++) {
    if (!isWorkDay(cursor, cal)) {
      cursor = new Date(startOfLocalDay(cursor).getTime() + DAY_MINUTES * MINUTE + openMin * MINUTE);
      continue;
    }
    const mins = minutesOfDay(cursor);
    if (mins < openMin) {
      return new Date(startOfLocalDay(cursor).getTime() + openMin * MINUTE);
    }
    if (mins >= closeMin) {
      cursor = new Date(startOfLocalDay(cursor).getTime() + DAY_MINUTES * MINUTE + openMin * MINUTE);
      continue;
    }
    return cursor;
  }
  return cursor;
}

/**
 * Suma horas hábiles a una fecha respetando jornada y días laborables.
 * Devuelve la fecha real (UTC) en la que se cumple el plazo.
 */
export function addBusinessHours(start: Date, hours: number, cal: WorkCalendar = DEFAULT_CALENDAR): Date {
  if (!Number.isFinite(hours) || hours <= 0) return start;

  const openMin = cal.startHour * 60;
  const closeMin = cal.endHour * 60;
  const dailyCapacity = closeMin - openMin;
  if (dailyCapacity <= 0 || cal.workDays.length === 0) return start;

  let remaining = Math.round(hours * 60);
  let cursor = nextWorkingInstant(toLocal(start, cal), cal);

  for (let guard = 0; remaining > 0 && guard < 5000; guard++) {
    const availableToday = closeMin - minutesOfDay(cursor);
    if (remaining <= availableToday) {
      cursor = new Date(cursor.getTime() + remaining * MINUTE);
      remaining = 0;
      break;
    }
    remaining -= availableToday;
    // Salta al inicio del siguiente día hábil.
    const nextDay = new Date(startOfLocalDay(cursor).getTime() + DAY_MINUTES * MINUTE + openMin * MINUTE);
    cursor = nextWorkingInstant(nextDay, cal);
  }

  return fromLocal(cursor, cal);
}

/** Horas hábiles entre dos instantes; útil para medir el tiempo de atención. */
export function businessHoursBetween(from: Date, to: Date, cal: WorkCalendar = DEFAULT_CALENDAR): number {
  if (to <= from) return 0;
  const openMin = cal.startHour * 60;
  const closeMin = cal.endHour * 60;

  let minutes = 0;
  let cursor = nextWorkingInstant(toLocal(from, cal), cal);
  const end = toLocal(to, cal);

  for (let guard = 0; cursor < end && guard < 5000; guard++) {
    const dayClose = startOfLocalDay(cursor).getTime() + closeMin * MINUTE;
    const segmentEnd = Math.min(dayClose, end.getTime());
    minutes += Math.max(0, (segmentEnd - cursor.getTime()) / MINUTE);
    const nextDay = new Date(startOfLocalDay(cursor).getTime() + DAY_MINUTES * MINUTE + openMin * MINUTE);
    cursor = nextWorkingInstant(nextDay, cal);
  }

  return Math.round((minutes / 60) * 100) / 100;
}

export type SlaTarget = { priority: Priority; resolutionHours: number | null; agreed: boolean };

/**
 * Fecha estimada de cierre sugerida al crear el ticket. Devuelve null cuando el
 * acuerdo de tiempo de ese nivel todavía no está definido ("Por acordar"), para
 * que la mesa no muestre un compromiso que nadie pactó.
 */
export function suggestedDueDate(
  requestedAt: Date,
  target: SlaTarget | null | undefined,
  cal: WorkCalendar = DEFAULT_CALENDAR,
): Date | null {
  if (!target || !target.agreed || !target.resolutionHours) return null;
  return addBusinessHours(requestedAt, target.resolutionHours, cal);
}

export type DueState = "sin_fecha" | "a_tiempo" | "por_vencer" | "vencido" | "cumplido" | "incumplido";

/** Estado del compromiso de fecha, para semáforos y tableros. */
export function dueState(
  dueDate: Date | null | undefined,
  closedAt: Date | null | undefined,
  now: Date = new Date(),
  warningHours = 8,
): DueState {
  if (!dueDate) return "sin_fecha";
  if (closedAt) return closedAt <= dueDate ? "cumplido" : "incumplido";
  if (now > dueDate) return "vencido";
  if (dueDate.getTime() - now.getTime() <= warningHours * 3600_000) return "por_vencer";
  return "a_tiempo";
}

export const DUE_STATE_LABEL: Record<DueState, string> = {
  sin_fecha: "Sin fecha comprometida",
  a_tiempo: "A tiempo",
  por_vencer: "Por vencer",
  vencido: "Vencido",
  cumplido: "Cerrado a tiempo",
  incumplido: "Cerrado fuera de plazo",
};
