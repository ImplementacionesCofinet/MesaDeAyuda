import type { TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { STATUS_LABEL } from "@/lib/domain/status";
import { sendMail } from "./mailer";
import { formatDate, ticketEmail, type TicketMailData } from "./templates";

const TICKET_INCLUDE = {
  area: { select: { name: true } },
  category: { select: { name: true } },
  requester: { select: { name: true, email: true } },
  assignee: { select: { name: true, email: true } },
} as const;

type LoadedTicket = Awaited<ReturnType<typeof loadTicket>>;

async function loadTicket(ticketId: string) {
  return prisma.ticket.findUnique({ where: { id: ticketId }, include: TICKET_INCLUDE });
}

function toMailData(ticket: NonNullable<LoadedTicket>): TicketMailData {
  return {
    code: ticket.code,
    title: ticket.title,
    status: ticket.status,
    priority: ticket.priority,
    stage: ticket.stage,
    pendingAction: ticket.pendingAction,
    areaName: ticket.area.name,
    categoryName: ticket.category.name,
    requesterName: ticket.requester.name,
    assigneeName: ticket.assignee?.name ?? null,
    requestedAt: ticket.requestedAt,
    dueDate: ticket.dueDate,
  };
}

/** Correos del equipo de Datos y TI activo. */
async function teamEmails(): Promise<string[]> {
  const team = await prisma.user.findMany({
    where: { active: true, role: { in: ["AGENTE", "ADMIN"] } },
    select: { email: true },
  });
  return team.map((u) => u.email);
}

/** Avisa al equipo del nuevo requerimiento y deja acuse al solicitante. */
export async function notifyTicketCreated(ticketId: string): Promise<void> {
  const ticket = await loadTicket(ticketId);
  if (!ticket) return;
  const data = toMailData(ticket);

  const paraElEquipo = ticketEmail({
    headline: `Nuevo requerimiento de ${ticket.area.name}`,
    intro: `${ticket.requester.name} registró un requerimiento en la mesa de ayuda.`,
    ticket: data,
    extra: { label: "Descripción", body: ticket.description },
  });
  await sendMail({
    to: await teamEmails(),
    subject: `[${ticket.code}] Nuevo requerimiento: ${ticket.title}`,
    ...paraElEquipo,
    event: "ticket_creado",
    ticketId,
  });

  const acuse = ticketEmail({
    headline: "Recibimos tu requerimiento",
    intro: "Quedó registrado en la mesa de ayuda. Aquí podrás ver su estado en todo momento.",
    ticket: data,
  });
  await sendMail({
    to: [ticket.requester.email],
    subject: `[${ticket.code}] Recibimos tu requerimiento`,
    ...acuse,
    event: "ticket_creado_acuse",
    ticketId,
  });
}

/** Avisa al solicitante que su requerimiento cambió de estado. */
export async function notifyStatusChanged(
  ticketId: string,
  from: TicketStatus,
  actorName: string,
  note?: string,
): Promise<void> {
  const ticket = await loadTicket(ticketId);
  if (!ticket) return;

  const body = ticketEmail({
    headline: `${STATUS_LABEL[from]} → ${STATUS_LABEL[ticket.status]}`,
    intro: `${actorName} actualizó el estado de tu requerimiento.`,
    ticket: toMailData(ticket),
    ...(note ? { extra: { label: "Nota del responsable", body: note } } : {}),
  });

  await sendMail({
    to: [ticket.requester.email],
    subject: `[${ticket.code}] Ahora está ${STATUS_LABEL[ticket.status].toLowerCase()}`,
    ...body,
    event: "cambio_estado",
    ticketId,
  });
}

/** Avisa a quien queda como responsable. */
export async function notifyAssigned(ticketId: string, actorName: string): Promise<void> {
  const ticket = await loadTicket(ticketId);
  if (!ticket?.assignee) return;

  const body = ticketEmail({
    headline: "Te asignaron un requerimiento",
    intro: `${actorName} te dejó como responsable de este requerimiento.`,
    ticket: toMailData(ticket),
  });

  await sendMail({
    to: [ticket.assignee.email],
    subject: `[${ticket.code}] Quedaste como responsable`,
    ...body,
    event: "asignacion",
    ticketId,
  });
}

/** Avisa a la contraparte cuando hay un comentario público. */
export async function notifyComment(ticketId: string, authorId: string, authorName: string, text: string): Promise<void> {
  const ticket = await loadTicket(ticketId);
  if (!ticket) return;

  const destinatarios =
    authorId === ticket.requesterId
      ? [ticket.assignee?.email, ...(ticket.assigneeId ? [] : await teamEmails())].filter(
          (x): x is string => Boolean(x),
        )
      : [ticket.requester.email];

  const body = ticketEmail({
    headline: `Nuevo comentario de ${authorName}`,
    intro: "Hay novedades en el requerimiento.",
    ticket: toMailData(ticket),
    extra: { label: "Comentario", body: text },
  });

  await sendMail({
    to: destinatarios,
    subject: `[${ticket.code}] Nuevo comentario`,
    ...body,
    event: "comentario",
    ticketId,
  });
}

/** Avisa cuando se mueve la fecha estimada de cierre: es el compromiso visible para el área. */
export async function notifyDueDateChanged(ticketId: string, previous: Date | null, actorName: string): Promise<void> {
  const ticket = await loadTicket(ticketId);
  if (!ticket) return;

  const body = ticketEmail({
    headline: "Cambió la fecha estimada de cierre",
    intro: `${actorName} actualizó el compromiso de fecha.`,
    ticket: toMailData(ticket),
    extra: {
      label: "Cambio de fecha",
      body: `Antes: ${formatDate(previous)}\nAhora: ${formatDate(ticket.dueDate)}`,
    },
  });

  await sendMail({
    to: [ticket.requester.email],
    subject: `[${ticket.code}] Nueva fecha estimada de cierre`,
    ...body,
    event: "cambio_fecha",
    ticketId,
  });
}
