import type { Priority, TicketStatus, TicketOrigin } from "@prisma/client";

/** Estados en el orden en que avanzan dentro del flujo. */
export const STATUS_ORDER: TicketStatus[] = [
  "NUEVO",
  "EN_ANALISIS",
  "EN_DESARROLLO",
  "EN_PRUEBAS",
  "EN_ESPERA",
  "ENTREGADO",
  "CERRADO",
  "CANCELADO",
];

export const STATUS_LABEL: Record<TicketStatus, string> = {
  NUEVO: "Nuevo",
  EN_ANALISIS: "En análisis",
  EN_DESARROLLO: "En desarrollo",
  EN_PRUEBAS: "En pruebas",
  EN_ESPERA: "En espera",
  ENTREGADO: "Entregado",
  CERRADO: "Cerrado",
  CANCELADO: "Cancelado",
};

/** Texto que ve el área para saber qué significa cada estado. */
export const STATUS_HINT: Record<TicketStatus, string> = {
  NUEVO: "Registrado, pendiente de revisión por Datos y TI.",
  EN_ANALISIS: "Estamos entendiendo el requerimiento y dimensionando el trabajo.",
  EN_DESARROLLO: "El trabajo está en construcción.",
  EN_PRUEBAS: "Terminado y en validación antes de entregar.",
  EN_ESPERA: "Detenido a la espera de un tercero o de información del área.",
  ENTREGADO: "Entregado al área, pendiente de confirmación.",
  CERRADO: "Confirmado y cerrado.",
  CANCELADO: "No continúa.",
};

/** Estados en los que el requerimiento sigue vivo. */
export const OPEN_STATUSES: TicketStatus[] = [
  "NUEVO",
  "EN_ANALISIS",
  "EN_DESARROLLO",
  "EN_PRUEBAS",
  "EN_ESPERA",
  "ENTREGADO",
];

/** Estados en los que el requerimiento ya no consume capacidad. */
export const CLOSED_STATUSES: TicketStatus[] = ["CERRADO", "CANCELADO"];

export function isOpen(status: TicketStatus): boolean {
  return OPEN_STATUSES.includes(status);
}

/** Transiciones permitidas. Evita saltos que dejarían el historial sin sentido. */
const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  NUEVO: ["EN_ANALISIS", "EN_ESPERA", "CANCELADO"],
  EN_ANALISIS: ["EN_DESARROLLO", "EN_PRUEBAS", "EN_ESPERA", "ENTREGADO", "CANCELADO"],
  EN_DESARROLLO: ["EN_PRUEBAS", "EN_ANALISIS", "EN_ESPERA", "CANCELADO"],
  EN_PRUEBAS: ["ENTREGADO", "EN_DESARROLLO", "EN_ESPERA", "CANCELADO"],
  EN_ESPERA: ["EN_ANALISIS", "EN_DESARROLLO", "EN_PRUEBAS", "CANCELADO"],
  ENTREGADO: ["CERRADO", "EN_ANALISIS", "EN_DESARROLLO"],
  CERRADO: ["EN_ANALISIS"],
  CANCELADO: ["EN_ANALISIS"],
};

export function allowedTransitions(from: TicketStatus): TicketStatus[] {
  return TRANSITIONS[from];
}

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return from === to || TRANSITIONS[from].includes(to);
}

export const PRIORITY_ORDER: Priority[] = ["ALTA", "MEDIA", "BAJA"];

export const PRIORITY_LABEL: Record<Priority, string> = {
  ALTA: "Alta",
  MEDIA: "Media",
  BAJA: "Baja",
};

/** Criterios acordados en la propuesta. */
export const PRIORITY_CRITERION: Record<Priority, string> = {
  ALTA: "Operación detenida o riesgo directo en despachos y cierres",
  MEDIA: "Mejora necesaria que no bloquea la operación diaria",
  BAJA: "Optimización o desarrollo planificado sin urgencia",
};

export const ORIGIN_LABEL: Record<TicketOrigin, string> = {
  AREA: "Requerimiento de área",
  INTERNO: "Iniciativa de Datos y TI",
};
