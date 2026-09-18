import { describe, expect, it } from "vitest";
import { addBusinessHours, businessHoursBetween, dueState, suggestedDueDate, type WorkCalendar } from "./sla";

// Jornada 8:00-17:00, lunes a viernes, UTC-5.
const cal: WorkCalendar = { utcOffsetMinutes: -300, startHour: 8, endHour: 17, workDays: [1, 2, 3, 4, 5] };

/** Construye una fecha a partir de la hora local del calendario. */
function local(y: number, m: number, d: number, h: number, min = 0): Date {
  return new Date(Date.UTC(y, m - 1, d, h, min) - cal.utcOffsetMinutes * 60_000);
}

describe("addBusinessHours", () => {
  it("suma dentro de la misma jornada", () => {
    expect(addBusinessHours(local(2026, 9, 15, 9), 3, cal)).toEqual(local(2026, 9, 15, 12));
  });

  it("pasa al día siguiente cuando no alcanza la jornada", () => {
    // Martes 15:00 + 4h hábiles = 2h el martes + 2h el miércoles.
    expect(addBusinessHours(local(2026, 9, 15, 15), 4, cal)).toEqual(local(2026, 9, 16, 10));
  });

  it("salta el fin de semana", () => {
    // Viernes 16:00 + 2h = 1h el viernes + 1h el lunes.
    expect(addBusinessHours(local(2026, 9, 18, 16), 2, cal)).toEqual(local(2026, 9, 21, 9));
  });

  it("arranca en la siguiente jornada si se registra fuera de horario", () => {
    expect(addBusinessHours(local(2026, 9, 15, 21), 1, cal)).toEqual(local(2026, 9, 16, 9));
    expect(addBusinessHours(local(2026, 9, 15, 6), 1, cal)).toEqual(local(2026, 9, 15, 9));
  });

  it("registra el sábado y cuenta desde el lunes", () => {
    expect(addBusinessHours(local(2026, 9, 19, 10), 2, cal)).toEqual(local(2026, 9, 21, 10));
  });

  it("cubre plazos de varias jornadas", () => {
    // Lunes 8:00 + 45h hábiles = 5 jornadas de 9h: cierra el viernes a las 17:00.
    expect(addBusinessHours(local(2026, 9, 14, 8), 45, cal)).toEqual(local(2026, 9, 18, 17));
  });

  it("pasa a la semana siguiente cuando el plazo excede la jornada del viernes", () => {
    expect(addBusinessHours(local(2026, 9, 14, 8), 46, cal)).toEqual(local(2026, 9, 21, 9));
  });

  it("devuelve la misma fecha con horas no positivas", () => {
    const start = local(2026, 9, 15, 9);
    expect(addBusinessHours(start, 0, cal)).toEqual(start);
    expect(addBusinessHours(start, -5, cal)).toEqual(start);
  });
});

describe("businessHoursBetween", () => {
  it("cuenta solo tiempo hábil", () => {
    expect(businessHoursBetween(local(2026, 9, 15, 9), local(2026, 9, 15, 12), cal)).toBe(3);
  });

  it("descuenta noches y fines de semana", () => {
    // Viernes 16:00 a lunes 9:00 = 1h del viernes + 1h del lunes.
    expect(businessHoursBetween(local(2026, 9, 18, 16), local(2026, 9, 21, 9), cal)).toBe(2);
  });

  it("es cero cuando el fin es anterior al inicio", () => {
    expect(businessHoursBetween(local(2026, 9, 18, 16), local(2026, 9, 18, 9), cal)).toBe(0);
  });
});

describe("suggestedDueDate", () => {
  it("no compromete fecha si el acuerdo está por acordar", () => {
    expect(suggestedDueDate(local(2026, 9, 15, 9), { priority: "ALTA", resolutionHours: 4, agreed: false }, cal)).toBeNull();
    expect(suggestedDueDate(local(2026, 9, 15, 9), null, cal)).toBeNull();
  });

  it("calcula la fecha cuando el acuerdo ya está formalizado", () => {
    expect(suggestedDueDate(local(2026, 9, 15, 9), { priority: "ALTA", resolutionHours: 4, agreed: true }, cal))
      .toEqual(local(2026, 9, 15, 13));
  });
});

describe("dueState", () => {
  const due = local(2026, 9, 18, 17);

  it("distingue los estados del compromiso", () => {
    expect(dueState(null, null, local(2026, 9, 18, 9))).toBe("sin_fecha");
    expect(dueState(due, null, local(2026, 9, 15, 9))).toBe("a_tiempo");
    expect(dueState(due, null, local(2026, 9, 18, 14))).toBe("por_vencer");
    expect(dueState(due, null, local(2026, 9, 19, 9))).toBe("vencido");
    expect(dueState(due, local(2026, 9, 18, 12))).toBe("cumplido");
    expect(dueState(due, local(2026, 9, 22, 12))).toBe("incumplido");
  });
});
