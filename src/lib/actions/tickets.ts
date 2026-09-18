"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Prisma, TicketStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formatTicketCode } from "@/lib/domain/codes";
import {
  canComment,
  canCreateInternalTicket,
  canEditRequest,
  canManageTicket,
  canViewTicket,
  isAgent,
} from "@/lib/domain/permissions";
import { suggestedDueDate } from "@/lib/domain/sla";
import { canTransition, CLOSED_STATUSES, PRIORITY_LABEL, STATUS_LABEL } from "@/lib/domain/status";
import { fromDateTimeInput } from "@/lib/dates";
import { notifyAssigned, notifyComment, notifyDueDateChanged, notifyStatusChanged, notifyTicketCreated } from "@/lib/mail/notify";

export type ActionResult = { ok: true } | { ok: false; error: string };

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v.length === 0 ? null : v))
    .nullable();

const createSchema = z.object({
  title: z.string().trim().min(8, "El asunto debe tener al menos 8 caracteres.").max(160),
  description: z.string().trim().min(20, "Describe el requerimiento con al menos 20 caracteres."),
  categoryId: z.string().min(1, "Selecciona una categoría."),
  priority: z.enum(["ALTA", "MEDIA", "BAJA"]),
  origin: z.enum(["AREA", "INTERNO"]).default("AREA"),
  areaId: z.string().optional(),
  assigneeId: z.string().optional(),
});

/**
 * Asigna el consecutivo del año dentro de una transacción, para que dos
 * solicitudes simultáneas no reciban el mismo código.
 */
async function nextTicketCode(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const counter = await tx.ticketCounter.upsert({
    where: { year },
    create: { year, lastNumber: 1 },
    update: { lastNumber: { increment: 1 } },
  });
  return formatTicketCode(year, counter.lastNumber);
}

export async function createTicket(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = createSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    categoryId: formData.get("categoryId"),
    priority: formData.get("priority") ?? "MEDIA",
    origin: formData.get("origin") ?? "AREA",
    areaId: formData.get("areaId") ?? undefined,
    assigneeId: formData.get("assigneeId") ?? undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario." };
  }
  const input = parsed.data;

  if (input.origin === "INTERNO" && !canCreateInternalTicket(user)) {
    return { ok: false, error: "Solo el área de Datos y TI registra iniciativas internas." };
  }

  // Un solicitante siempre registra a nombre de su área; Datos y TI puede elegirla.
  const areaId = isAgent(user) && input.areaId ? input.areaId : user.areaId;
  if (!areaId) {
    return {
      ok: false,
      error: "Tu usuario todavía no tiene un área asignada. Pídele al área de Datos y TI que la configure.",
    };
  }

  const requestedAt = new Date();
  const sla = await prisma.slaPolicy.findUnique({ where: { priority: input.priority } });
  const dueDate = suggestedDueDate(requestedAt, sla);

  const ticket = await prisma.$transaction(async (tx) => {
    const code = await nextTicketCode(tx);
    const created = await tx.ticket.create({
      data: {
        code,
        title: input.title,
        description: input.description,
        categoryId: input.categoryId,
        areaId,
        requesterId: user.id,
        assigneeId: isAgent(user) && input.assigneeId ? input.assigneeId : null,
        priority: input.priority,
        origin: input.origin,
        requestedAt,
        dueDate,
        status: "NUEVO",
      },
    });

    await tx.ticketEvent.create({
      data: {
        ticketId: created.id,
        actorId: user.id,
        type: "CREACION",
        note: `Requerimiento registrado con prioridad ${PRIORITY_LABEL[input.priority].toLowerCase()}.`,
      },
    });

    return created;
  });

  await notifyTicketCreated(ticket.id);

  revalidatePath("/tickets");
  revalidatePath("/");
  redirect(`/tickets/${ticket.code}`);
}

/** Carga el ticket y valida que quien actúa pueda verlo. */
async function loadForActor(ticketId: string) {
  const user = await requireUser();
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return { user, ticket: null as null };
  if (!canViewTicket(user, ticket)) return { user, ticket: null as null };
  return { user, ticket };
}

const manageSchema = z.object({
  status: z.enum(["NUEVO", "EN_ANALISIS", "EN_DESARROLLO", "EN_PRUEBAS", "EN_ESPERA", "ENTREGADO", "CERRADO", "CANCELADO"]),
  priority: z.enum(["ALTA", "MEDIA", "BAJA"]),
  assigneeId: optionalText(60),
  stage: optionalText(160),
  pendingAction: optionalText(280),
  pendingOwnerId: optionalText(60),
  dueDate: z.string().optional(),
  note: optionalText(2000),
});

/**
 * Actualización de gestión: estado, etapa, pendiente, responsable, prioridad y
 * fecha estimada. Cada cambio deja su entrada en el historial y, cuando afecta
 * lo que el área ve, dispara el correo correspondiente.
 */
export async function updateTicketManagement(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ticketId = String(formData.get("ticketId") ?? "");
  const { user, ticket } = await loadForActor(ticketId);
  if (!ticket) return { ok: false, error: "No encontramos el requerimiento." };
  if (!canManageTicket(user, ticket)) {
    return { ok: false, error: "Solo el área de Datos y TI puede actualizar la gestión del requerimiento." };
  }

  const parsed = manageSchema.safeParse({
    status: formData.get("status"),
    priority: formData.get("priority"),
    assigneeId: formData.get("assigneeId") ?? "",
    stage: formData.get("stage") ?? "",
    pendingAction: formData.get("pendingAction") ?? "",
    pendingOwnerId: formData.get("pendingOwnerId") ?? "",
    dueDate: formData.get("dueDate") ?? "",
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario." };
  }
  const input = parsed.data;

  if (!canTransition(ticket.status, input.status)) {
    return {
      ok: false,
      error: `No se puede pasar de ${STATUS_LABEL[ticket.status]} a ${STATUS_LABEL[input.status]}.`,
    };
  }

  const newDueDate = fromDateTimeInput(input.dueDate);
  const now = new Date();
  const events: Prisma.TicketEventCreateManyInput[] = [];
  const data: Prisma.TicketUpdateInput = {};

  if (input.status !== ticket.status) {
    data.status = input.status;
    events.push({
      ticketId: ticket.id,
      actorId: user.id,
      type: input.status === "CERRADO" ? "CIERRE" : CLOSED_STATUSES.includes(ticket.status) ? "REAPERTURA" : "CAMBIO_ESTADO",
      field: "estado",
      fromValue: STATUS_LABEL[ticket.status],
      toValue: STATUS_LABEL[input.status],
      note: input.note,
    });

    if (!ticket.startedAt && input.status === "EN_DESARROLLO") data.startedAt = now;
    if (input.status === "ENTREGADO") data.deliveredAt = now;
    if (input.status === "CERRADO") data.closedAt = now;
    if (!CLOSED_STATUSES.includes(input.status)) data.closedAt = null;
  }

  if (!ticket.firstResponseAt && input.status !== "NUEVO") {
    data.firstResponseAt = now;
  }

  if (input.priority !== ticket.priority) {
    data.priority = input.priority;
    events.push({
      ticketId: ticket.id,
      actorId: user.id,
      type: "CAMBIO_PRIORIDAD",
      field: "prioridad",
      fromValue: PRIORITY_LABEL[ticket.priority],
      toValue: PRIORITY_LABEL[input.priority],
    });
  }

  const assigneeChanged = (input.assigneeId ?? null) !== ticket.assigneeId;
  if (assigneeChanged) {
    data.assignee = input.assigneeId ? { connect: { id: input.assigneeId } } : { disconnect: true };
    const [antes, despues] = await Promise.all([
      ticket.assigneeId ? prisma.user.findUnique({ where: { id: ticket.assigneeId }, select: { name: true } }) : null,
      input.assigneeId ? prisma.user.findUnique({ where: { id: input.assigneeId }, select: { name: true } }) : null,
    ]);
    events.push({
      ticketId: ticket.id,
      actorId: user.id,
      type: "ASIGNACION",
      field: "responsable",
      fromValue: antes?.name ?? "Sin asignar",
      toValue: despues?.name ?? "Sin asignar",
    });
  }

  if (input.stage !== ticket.stage) {
    data.stage = input.stage;
    events.push({
      ticketId: ticket.id,
      actorId: user.id,
      type: "CAMBIO_ETAPA",
      field: "etapa",
      fromValue: ticket.stage ?? "Sin detallar",
      toValue: input.stage ?? "Sin detallar",
    });
  }

  const pendingChanged =
    input.pendingAction !== ticket.pendingAction || (input.pendingOwnerId ?? null) !== ticket.pendingOwnerId;
  if (pendingChanged) {
    data.pendingAction = input.pendingAction;
    data.pendingOwner = input.pendingOwnerId ? { connect: { id: input.pendingOwnerId } } : { disconnect: true };
    events.push({
      ticketId: ticket.id,
      actorId: user.id,
      type: "PENDIENTE",
      field: "pendiente",
      fromValue: ticket.pendingAction ?? "Nada pendiente",
      toValue: input.pendingAction ?? "Nada pendiente",
    });
  }

  const dueChanged = (newDueDate?.getTime() ?? null) !== (ticket.dueDate?.getTime() ?? null);
  if (dueChanged) {
    data.dueDate = newDueDate;
    events.push({
      ticketId: ticket.id,
      actorId: user.id,
      type: "CAMBIO_FECHA",
      field: "fecha estimada de cierre",
      fromValue: ticket.dueDate?.toISOString() ?? "Sin fecha",
      toValue: newDueDate?.toISOString() ?? "Sin fecha",
    });
  }

  if (events.length === 0) {
    return { ok: false, error: "No hay cambios que guardar." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.ticket.update({ where: { id: ticket.id }, data });
    await tx.ticketEvent.createMany({ data: events });
  });

  if (input.status !== ticket.status) {
    await notifyStatusChanged(ticket.id, ticket.status, user.name, input.note ?? undefined);
  }
  if (assigneeChanged && input.assigneeId) {
    await notifyAssigned(ticket.id, user.name);
  }
  if (dueChanged) {
    await notifyDueDateChanged(ticket.id, ticket.dueDate, user.name);
  }

  revalidatePath(`/tickets/${ticket.code}`);
  revalidatePath("/tickets");
  revalidatePath("/tablero");
  revalidatePath("/");
  return { ok: true };
}

const commentSchema = z.object({
  body: z.string().trim().min(2, "Escribe un comentario.").max(4000),
  internal: z.boolean(),
});

export async function addComment(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const ticketId = String(formData.get("ticketId") ?? "");
  const { user, ticket } = await loadForActor(ticketId);
  if (!ticket) return { ok: false, error: "No encontramos el requerimiento." };
  if (!canComment(user, ticket)) return { ok: false, error: "No puedes comentar este requerimiento." };

  const wantsInternal = formData.get("internal") === "on";
  const parsed = commentSchema.safeParse({
    body: formData.get("body"),
    internal: wantsInternal && isAgent(user),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisa el comentario." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.ticketComment.create({
      data: { ticketId: ticket.id, authorId: user.id, body: parsed.data.body, internal: parsed.data.internal },
    });
    await tx.ticketEvent.create({
      data: {
        ticketId: ticket.id,
        actorId: user.id,
        type: "COMENTARIO",
        note: parsed.data.internal ? "Nota interna" : "Comentario visible para el área",
      },
    });
  });

  if (!parsed.data.internal) {
    await notifyComment(ticket.id, user.id, user.name, parsed.data.body);
  }

  revalidatePath(`/tickets/${ticket.code}`);
  return { ok: true };
}

const requestSchema = z.object({
  title: z.string().trim().min(8, "El asunto debe tener al menos 8 caracteres.").max(160),
  description: z.string().trim().min(20, "La descripción debe tener al menos 20 caracteres."),
  categoryId: z.string().min(1, "Selecciona una categoría."),
});

/** Corrección del contenido de la solicitud (asunto, descripción, categoría). */
export async function updateTicketRequest(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const ticketId = String(formData.get("ticketId") ?? "");
  const { user, ticket } = await loadForActor(ticketId);
  if (!ticket) return { ok: false, error: "No encontramos el requerimiento." };
  if (!canEditRequest(user, ticket, ticket.status)) {
    return { ok: false, error: "Este requerimiento ya está en gestión: escribe un comentario para pedir un ajuste." };
  }

  const parsed = requestSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    categoryId: formData.get("categoryId"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.ticket.update({ where: { id: ticket.id }, data: parsed.data });
    await tx.ticketEvent.create({
      data: { ticketId: ticket.id, actorId: user.id, type: "EDICION", note: "Se actualizó el contenido de la solicitud." },
    });
  });

  revalidatePath(`/tickets/${ticket.code}`);
  return { ok: true };
}

/** Atajo para que el solicitante confirme la entrega y el ticket quede cerrado. */
export async function confirmDelivery(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const ticketId = String(formData.get("ticketId") ?? "");
  const { user, ticket } = await loadForActor(ticketId);
  if (!ticket) return { ok: false, error: "No encontramos el requerimiento." };
  if (ticket.requesterId !== user.id && !isAgent(user)) {
    return { ok: false, error: "Solo el solicitante puede confirmar la entrega." };
  }
  if (ticket.status !== "ENTREGADO") {
    return { ok: false, error: "El requerimiento todavía no está entregado." };
  }

  const nota = String(formData.get("closingNote") ?? "").trim();
  const previous: TicketStatus = ticket.status;

  await prisma.$transaction(async (tx) => {
    await tx.ticket.update({
      where: { id: ticket.id },
      data: { status: "CERRADO", closedAt: new Date(), closingNote: nota || null },
    });
    await tx.ticketEvent.create({
      data: {
        ticketId: ticket.id,
        actorId: user.id,
        type: "CIERRE",
        field: "estado",
        fromValue: STATUS_LABEL[previous],
        toValue: STATUS_LABEL["CERRADO"],
        note: nota || "El solicitante confirmó la entrega.",
      },
    });
  });

  await notifyStatusChanged(ticket.id, previous, user.name, nota || undefined);

  revalidatePath(`/tickets/${ticket.code}`);
  revalidatePath("/tickets");
  revalidatePath("/");
  return { ok: true };
}
