import type { Role, TicketOrigin } from "@prisma/client";

/** Datos mínimos de la sesión necesarios para decidir permisos. */
export type Actor = {
  id: string;
  role: Role;
  areaId: string | null;
};

/** Datos mínimos del ticket necesarios para decidir permisos. */
export type TicketRef = {
  requesterId: string;
  areaId: string;
  assigneeId: string | null;
  origin: TicketOrigin;
};

export function isAgent(actor: Actor): boolean {
  return actor.role === "AGENTE" || actor.role === "ADMIN";
}

export function isAdmin(actor: Actor): boolean {
  return actor.role === "ADMIN";
}

/**
 * Quién puede abrir un ticket.
 *
 * Datos y TI ve todo. Una persona de un área ve lo suyo, lo de su área (el
 * objetivo de la mesa es que el área sepa siempre en qué va su solicitud) y las
 * iniciativas internas de Datos y TI, que están en el mismo tablero para que la
 * carga real del área sea visible.
 */
export function canViewTicket(actor: Actor, ticket: TicketRef): boolean {
  if (isAgent(actor)) return true;
  if (ticket.requesterId === actor.id) return true;
  if (ticket.origin === "INTERNO") return true;
  return actor.areaId !== null && actor.areaId === ticket.areaId;
}

/** Solo Datos y TI mueve estado, etapa, responsable, prioridad y fechas. */
export function canManageTicket(actor: Actor, ticket: TicketRef): boolean {
  void ticket;
  return isAgent(actor);
}

/** El solicitante puede corregir título y descripción mientras nadie la trabaja. */
export function canEditRequest(actor: Actor, ticket: TicketRef, status: string): boolean {
  if (isAgent(actor)) return true;
  return ticket.requesterId === actor.id && status === "NUEVO";
}

export function canComment(actor: Actor, ticket: TicketRef): boolean {
  return canViewTicket(actor, ticket);
}

/** Las notas internas nunca salen del área de Datos y TI. */
export function canSeeInternalNotes(actor: Actor): boolean {
  return isAgent(actor);
}

/** Registrar iniciativas propias de Datos y TI es exclusivo del área. */
export function canCreateInternalTicket(actor: Actor): boolean {
  return isAgent(actor);
}

export function canAdminister(actor: Actor): boolean {
  return isAdmin(actor);
}

export const ROLE_LABEL: Record<Role, string> = {
  SOLICITANTE: "Solicitante",
  AGENTE: "Datos y TI",
  ADMIN: "Administrador",
};
