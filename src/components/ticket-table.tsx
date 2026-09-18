import Link from "next/link";
import { DueBadge, OriginBadge, PriorityBadge, StatusBadge } from "@/components/badges";
import { formatDate, formatRelative } from "@/lib/dates";
import type { TicketListItem } from "@/lib/queries/tickets";

export function TicketTable({ tickets, empty }: { tickets: TicketListItem[]; empty?: string }) {
  if (tickets.length === 0) {
    return (
      <div className="tarjeta p-8 text-center text-sm text-humo">
        {empty ?? "No hay requerimientos que coincidan con el filtro."}
      </div>
    );
  }

  return (
    <div className="tarjeta overflow-hidden">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-borde text-xs uppercase tracking-wide text-humo">
            <th className="px-4 py-3 font-semibold">Requerimiento</th>
            <th className="px-4 py-3 font-semibold">Estado</th>
            <th className="px-4 py-3 font-semibold">Responsable</th>
            <th className="px-4 py-3 font-semibold">Solicitud</th>
            <th className="px-4 py-3 font-semibold">Cierre estimado</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <tr key={ticket.id} className="border-b border-borde/70 last:border-0 hover:bg-lienzo/60">
              <td className="px-4 py-3 align-top">
                <Link href={`/tickets/${ticket.code}`} className="font-semibold text-tinta hover:text-terracota">
                  {ticket.title}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-humo">
                  <span className="font-semibold text-terracota">{ticket.code}</span>
                  <span>·</span>
                  <span>{ticket.category.name}</span>
                  <span>·</span>
                  <span>{ticket.area.name}</span>
                  <PriorityBadge priority={ticket.priority} />
                  <OriginBadge origin={ticket.origin} />
                </div>
              </td>
              <td className="px-4 py-3 align-top">
                <StatusBadge status={ticket.status} />
                {ticket.stage ? <div className="mt-1 text-xs text-humo">{ticket.stage}</div> : null}
                {ticket.pendingAction ? (
                  <div className="mt-1 text-xs text-[#7A5A12]">Falta: {ticket.pendingAction}</div>
                ) : null}
              </td>
              <td className="px-4 py-3 align-top text-sm text-tinta">
                {ticket.assignee?.name ?? <span className="text-humo">Por asignar</span>}
                <div className="mt-1 text-xs text-humo">Solicitó {ticket.requester.name}</div>
              </td>
              <td className="px-4 py-3 align-top text-sm text-tinta">
                {formatDate(ticket.requestedAt)}
                <div className="mt-1 text-xs text-humo">{formatRelative(ticket.requestedAt)}</div>
              </td>
              <td className="px-4 py-3 align-top text-sm text-tinta">
                {formatDate(ticket.dueDate, "Por acordar")}
                <div className="mt-1">
                  <DueBadge dueDate={ticket.dueDate} closedAt={ticket.closedAt} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
