import Link from "next/link";
import { DueBadge, OriginBadge, PriorityBadge } from "@/components/badges";
import { requireAgent } from "@/lib/auth/guards";
import { formatDate } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { OPEN_STATUSES, STATUS_HINT, STATUS_LABEL } from "@/lib/domain/status";

export const dynamic = "force-dynamic";

/**
 * Tablero de la carga real del área: requerimientos de las áreas e iniciativas
 * propias de Datos y TI, uno al lado del otro.
 */
export default async function TableroPage() {
  await requireAgent();

  const tickets = await prisma.ticket.findMany({
    where: { status: { in: OPEN_STATUSES } },
    orderBy: [{ priority: "asc" }, { dueDate: "asc" }, { requestedAt: "asc" }],
    select: {
      id: true,
      code: true,
      title: true,
      status: true,
      priority: true,
      origin: true,
      stage: true,
      pendingAction: true,
      dueDate: true,
      closedAt: true,
      area: { select: { name: true } },
      assignee: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="rotulo">Tablero</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-tinta">Carga del área</h1>
        <p className="mt-2 max-w-2xl text-sm text-humo">
          {tickets.length} requerimientos abiertos, ordenados por prioridad y fecha comprometida.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {OPEN_STATUSES.map((status) => {
          const columna = tickets.filter((t) => t.status === status);
          return (
            <section key={status} className="flex flex-col gap-3">
              <header className="flex items-baseline justify-between">
                <h2 className="text-sm font-semibold text-tinta">{STATUS_LABEL[status]}</h2>
                <span className="text-xs font-semibold text-humo">{columna.length}</span>
              </header>
              <p className="text-xs leading-snug text-humo">{STATUS_HINT[status]}</p>

              <div className="space-y-3">
                {columna.map((ticket) => (
                  <Link
                    key={ticket.id}
                    href={`/tickets/${ticket.code}`}
                    className="tarjeta block p-3 transition hover:border-terracota/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-terracota">{ticket.code}</span>
                      <PriorityBadge priority={ticket.priority} />
                    </div>
                    <p className="mt-1.5 text-sm font-semibold leading-snug text-tinta">{ticket.title}</p>
                    <p className="mt-1 text-xs text-humo">{ticket.area.name}</p>
                    {ticket.stage ? <p className="mt-1 text-xs text-humo">{ticket.stage}</p> : null}
                    {ticket.pendingAction ? (
                      <p className="mt-1 text-xs text-[#7A5A12]">Falta: {ticket.pendingAction}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-humo">{ticket.assignee?.name ?? "Por asignar"}</span>
                      <OriginBadge origin={ticket.origin} />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <span className="text-xs text-humo">{formatDate(ticket.dueDate, "Sin fecha")}</span>
                      <DueBadge dueDate={ticket.dueDate} closedAt={ticket.closedAt} />
                    </div>
                  </Link>
                ))}
                {columna.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-borde p-3 text-xs text-humo">Sin requerimientos.</p>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
