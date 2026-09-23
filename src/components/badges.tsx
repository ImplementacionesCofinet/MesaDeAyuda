import type { Priority, TicketOrigin, TicketStatus } from "@prisma/client";
import { dueState, DUE_STATE_LABEL } from "@/lib/domain/sla";
import { ORIGIN_LABEL, PRIORITY_LABEL, STATUS_LABEL } from "@/lib/domain/status";

/** Cada estado tiene su color de la paleta institucional, del gris al verde. */
const STATUS_STYLE: Record<TicketStatus, string> = {
  NUEVO: "bg-[#EAE0D6] text-[#4E5D59] ring-[#DCCEC0]",
  EN_ANALISIS: "bg-[#DEE1E4] text-[#263849] ring-[#C8CFD6]",
  EN_DESARROLLO: "bg-[#DEECEB] text-[#1D3B37] ring-[#BFD9D6]",
  EN_PRUEBAS: "bg-[#DBE4E3] text-[#0F4B42] ring-[#BCD2CF]",
  EN_ESPERA: "bg-[#F1E7E1] text-[#8D321D] ring-[#E2CDC1]",
  ENTREGADO: "bg-[#CFE2DF] text-[#0F4B42] ring-[#AFCDC8]",
  CERRADO: "bg-[#1D3B37] text-[#F0E7DF] ring-[#1D3B37]",
  CANCELADO: "bg-[#EAE0D6] text-[#8A8078] ring-[#DCCEC0]",
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

const PRIORITY_STYLE: Record<Priority, string> = {
  ALTA: "bg-[#EFDEE5] text-[#671741] ring-[#DFC3D0]",
  MEDIA: "bg-[#F1E7E1] text-[#8D321D] ring-[#E2CDC1]",
  BAJA: "bg-[#E6E4DF] text-[#4E5D59] ring-[#D6D2CA]",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${PRIORITY_STYLE[priority]}`}
      title={`Prioridad ${PRIORITY_LABEL[priority].toLowerCase()}`}
    >
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

/** El compromiso de fecha: verde cuando se cumple, vino cuando se rompe. */
const DUE_STYLE: Record<string, string> = {
  sin_fecha: "text-humo",
  a_tiempo: "text-[#0F4B42]",
  por_vencer: "text-[#8D321D]",
  vencido: "text-[#932553] font-semibold",
  cumplido: "text-[#0F4B42]",
  incumplido: "text-[#932553]",
};

export function DueBadge({
  dueDate,
  closedAt,
}: {
  dueDate: Date | null;
  closedAt: Date | null;
}) {
  const state = dueState(dueDate, closedAt);
  return <span className={`text-xs ${DUE_STYLE[state]}`}>{DUE_STATE_LABEL[state]}</span>;
}

export function OriginBadge({ origin }: { origin: TicketOrigin }) {
  if (origin === "AREA") return null;
  return (
    <span className="inline-flex items-center rounded-full bg-bosque px-2.5 py-0.5 text-xs font-semibold text-[#F0E7DF]">
      {ORIGIN_LABEL.INTERNO}
    </span>
  );
}
