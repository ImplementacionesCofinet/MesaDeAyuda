import { notFound } from "next/navigation";
import type { TicketEvent, User } from "@prisma/client";
import { DueBadge, OriginBadge, PriorityBadge, StatusBadge } from "@/components/badges";
import { CommentForm, ConfirmDeliveryForm } from "@/components/comment-form";
import { EditRequestForm } from "@/components/edit-request-form";
import { ManageTicketForm } from "@/components/manage-ticket-form";
import { requireUser } from "@/lib/auth/guards";
import { formatDateTime, formatRelative, toDateTimeInput } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { canEditRequest, canSeeInternalNotes, canViewTicket, isAgent } from "@/lib/domain/permissions";
import { STATUS_HINT } from "@/lib/domain/status";

export const dynamic = "force-dynamic";

/** Traduce una entrada del historial a una línea legible. */
function describeEvent(event: TicketEvent & { actor: Pick<User, "name"> | null }): string {
  const quien = event.actor?.name ?? "El sistema";
  switch (event.type) {
    case "CREACION":
      return `${quien} registró el requerimiento.`;
    case "CAMBIO_ESTADO":
      return `${quien} cambió el estado de ${event.fromValue} a ${event.toValue}.`;
    case "CAMBIO_ETAPA":
      return `${quien} actualizó la etapa: ${event.toValue}.`;
    case "ASIGNACION":
      return `${quien} asignó el requerimiento a ${event.toValue}.`;
    case "CAMBIO_PRIORIDAD":
      return `${quien} cambió la prioridad de ${event.fromValue} a ${event.toValue}.`;
    case "CAMBIO_FECHA": {
      const nueva = event.toValue && event.toValue !== "Sin fecha" ? formatDateTime(new Date(event.toValue)) : "sin fecha";
      return `${quien} movió la fecha estimada de cierre a ${nueva}.`;
    }
    case "PENDIENTE":
      return `${quien} actualizó lo que falta: ${event.toValue}.`;
    case "COMENTARIO":
      return `${quien} escribió un comentario.`;
    case "CIERRE":
      return `${quien} cerró el requerimiento.`;
    case "REAPERTURA":
      return `${quien} reabrió el requerimiento.`;
    case "EDICION":
      return `${quien} editó el contenido de la solicitud.`;
  }
}

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="tarjeta p-4">
      <dt className="text-[13px] font-semibold text-terracota">{label}</dt>
      <dd className="mt-1.5 text-sm leading-snug text-tinta">{children}</dd>
    </div>
  );
}

export default async function TicketPage({ params }: { params: Promise<{ code: string }> }) {
  const user = await requireUser();
  const { code } = await params;

  const ticket = await prisma.ticket.findUnique({
    where: { code: decodeURIComponent(code).toUpperCase() },
    include: {
      area: true,
      category: true,
      requester: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true } },
      pendingOwner: { select: { id: true, name: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true, role: true } } },
      },
      events: {
        orderBy: { createdAt: "desc" },
        include: { actor: { select: { name: true } } },
      },
    },
  });

  if (!ticket || !canViewTicket(user, ticket)) notFound();

  const esAgente = isAgent(user);
  const comentarios = ticket.comments.filter((c) => !c.internal || canSeeInternalNotes(user));

  const [equipo, personasArea, categorias] = await Promise.all([
    esAgente
      ? prisma.user.findMany({
          where: { active: true, role: { in: ["AGENTE", "ADMIN"] } },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : [],
    esAgente
      ? prisma.user.findMany({
          where: { active: true, OR: [{ areaId: ticket.areaId }, { role: { in: ["AGENTE", "ADMIN"] } }] },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : [],
    prisma.category.findMany({ where: { active: true }, orderBy: { position: "asc" }, select: { id: true, name: true } }),
  ]);

  const puedeEditar = canEditRequest(user, ticket, ticket.status);
  const puedeConfirmar = ticket.status === "ENTREGADO" && (ticket.requesterId === user.id || esAgente);

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rotulo">{ticket.code}</span>
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          <OriginBadge origin={ticket.origin} />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-tinta">{ticket.title}</h1>
        <p className="text-sm text-humo">
          {ticket.category.name} · {ticket.area.name} · Solicitado por {ticket.requester.name}{" "}
          {formatRelative(ticket.requestedAt)}
        </p>
      </header>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Dato label="Estado">
          <span className="font-semibold">{STATUS_HINT[ticket.status]}</span>
        </Dato>
        <Dato label="Etapa del proceso">{ticket.stage ?? <span className="text-humo">Sin detallar</span>}</Dato>
        <Dato label="Qué falta">
          {ticket.pendingAction ? (
            <>
              {ticket.pendingAction}
              {ticket.pendingOwner ? (
                <span className="mt-1 block text-xs text-humo">Depende de {ticket.pendingOwner.name}</span>
              ) : null}
            </>
          ) : (
            <span className="text-humo">Nada pendiente del área</span>
          )}
        </Dato>
        <Dato label="Fecha de solicitud">{formatDateTime(ticket.requestedAt)}</Dato>
        <Dato label="Fecha estimada de cierre">
          {formatDateTime(ticket.dueDate, "Por acordar")}
          <span className="mt-1 block">
            <DueBadge dueDate={ticket.dueDate} closedAt={ticket.closedAt} />
          </span>
        </Dato>
      </dl>

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <section className="tarjeta p-6">
            <h2 className="text-sm font-semibold text-tinta">Descripción del requerimiento</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-tinta/90">{ticket.description}</p>
            <p className="mt-4 text-xs text-humo">
              Responsable: {ticket.assignee?.name ?? "Por asignar"}
              {ticket.closedAt ? ` · Cerrado ${formatDateTime(ticket.closedAt)}` : ""}
            </p>
          </section>

          {puedeEditar ? (
            <EditRequestForm
              ticketId={ticket.id}
              title={ticket.title}
              description={ticket.description}
              categoryId={ticket.categoryId}
              categorias={categorias}
            />
          ) : null}

          {puedeConfirmar ? (
            <section className="tarjeta border-terracota/40 p-6">
              <h2 className="text-sm font-semibold text-tinta">El requerimiento está entregado</h2>
              <p className="mt-1 mb-4 text-sm text-humo">
                Si ya validaste la entrega, confírmala para cerrarlo. Si algo no quedó bien, escríbelo como comentario.
              </p>
              <ConfirmDeliveryForm ticketId={ticket.id} />
            </section>
          ) : null}

          <section className="tarjeta p-6">
            <h2 className="text-sm font-semibold text-tinta">
              Conversación <span className="font-normal text-humo">({comentarios.length})</span>
            </h2>

            <ul className="mt-4 space-y-4">
              {comentarios.map((c) => (
                <li
                  key={c.id}
                  className={`rounded-lg border p-4 ${
                    c.internal ? "border-[#EBD9A8] bg-[#FAF5E6]" : "border-borde bg-lienzo/50"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-humo">
                    <span className="font-semibold text-tinta">{c.author.name}</span>
                    <span>·</span>
                    <span>{formatDateTime(c.createdAt)}</span>
                    {c.internal ? (
                      <span className="rounded-full bg-[#EBD9A8] px-2 py-0.5 font-semibold text-[#7A5A12]">
                        Nota interna
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-tinta/90">{c.body}</p>
                </li>
              ))}
              {comentarios.length === 0 ? (
                <li className="text-sm text-humo">Todavía no hay comentarios.</li>
              ) : null}
            </ul>

            <div className="mt-6 border-t border-borde pt-5">
              <CommentForm ticketId={ticket.id} esAgente={esAgente} />
            </div>
          </section>
        </div>

        <div className="space-y-6">
          {esAgente ? (
            <section className="tarjeta p-6">
              <h2 className="text-sm font-semibold text-tinta">Gestión</h2>
              <p className="mt-1 mb-4 text-xs text-humo">Lo que cambies aquí es lo que ve el área solicitante.</p>
              <ManageTicketForm
                ticketId={ticket.id}
                status={ticket.status}
                priority={ticket.priority}
                stage={ticket.stage}
                pendingAction={ticket.pendingAction}
                pendingOwnerId={ticket.pendingOwnerId}
                assigneeId={ticket.assigneeId}
                dueDateInput={toDateTimeInput(ticket.dueDate)}
                equipo={equipo}
                personas={personasArea}
              />
            </section>
          ) : null}

          <section className="tarjeta p-6">
            <h2 className="text-sm font-semibold text-tinta">Historial</h2>
            <ol className="mt-4 space-y-4">
              {ticket.events.map((event) => (
                <li key={event.id} className="border-l-2 border-borde pl-4">
                  <p className="text-sm leading-snug text-tinta">{describeEvent(event)}</p>
                  {event.note ? <p className="mt-1 text-xs italic text-humo">{event.note}</p> : null}
                  <p className="mt-1 text-xs text-humo">{formatDateTime(event.createdAt)}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
