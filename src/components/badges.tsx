import type { Priority, TicketOrigin, TicketStatus } from "@prisma/client";
import { dueState, DUE_STATE_LABEL } from "@/lib/domain/sla";
import { ORIGIN_LABEL, PRIORITY_LABEL, STATUS_LABEL } from "@/lib/domain/status";

const STATUS_STYLE: Record<TicketStatus, string> = {
  NUEVO: "bg-[#EDEAE0] text-[#4A4A43] ring-[#DAD5C8]",
  EN_ANALISIS: "bg-[#E6EDF4] text-[#2B4C6F] ring-[#C9DAEA]",
  EN_DESARROLLO: "bg-[#F3E4DA] text-[#8C3F1D] ring-[#E4C7B4]",
  EN_PRUEBAS: "bg-[#EFE7F4] text-[#5A3A70] ring-[#DCCCE6]",
  EN_ESPERA: "bg-[#FAEFD2] text-[#7A5A12] ring-[#EBD9A8]",
  ENTREGADO: "bg-[#E3EFE3] text-[#2E5C33] ring-[#C6DEC8]",
  CERRADO: "bg-[#1E2A1C] text-[#EFEDE4] ring-[#1E2A1C]",
  CANCELADO: "bg-[#EDEAE0] text-[#8A8A82] ring-[#DAD5C8]",
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
  ALTA: "bg-[#FBE7E1] text-[#96331A] ring-[#F0C6B8]",
  MEDIA: "bg-[#F5F0E2] text-[#7A6A28] ring-[#E4DCC0]",
  BAJA: "bg-[#ECEFEA] text-[#4E5A4C] ring-[#D6DCD2]",
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

const DUE_STYLE: Record<string, string> = {
  sin_fecha: "text-humo",
  a_tiempo: "text-[#2E5C33]",
  por_vencer: "text-[#7A5A12]",
  vencido: "text-[#96331A] font-semibold",
  cumplido: "text-[#2E5C33]",
  incumplido: "text-[#96331A]",
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
    <span className="inline-flex items-center rounded-full bg-oliva px-2.5 py-0.5 text-xs font-semibold text-[#EFEDE4]">
      {ORIGIN_LABEL.INTERNO}
    </span>
  );
}
