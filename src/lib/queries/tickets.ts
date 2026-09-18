import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/guards";
import { normalizeTicketCode } from "@/lib/domain/codes";
import { isAgent } from "@/lib/domain/permissions";
import { CLOSED_STATUSES, OPEN_STATUSES } from "@/lib/domain/status";

/**
 * Traduce las reglas de visibilidad a una condición de Prisma, para que los
 * listados nunca traigan de la base lo que la persona no puede abrir.
 */
export function visibilityWhere(user: SessionUser): Prisma.TicketWhereInput {
  if (isAgent(user)) return {};
  const conditions: Prisma.TicketWhereInput[] = [{ requesterId: user.id }, { origin: "INTERNO" }];
  if (user.areaId) conditions.push({ areaId: user.areaId });
  return { OR: conditions };
}

export type TicketFilters = {
  q?: string;
  estado?: string;
  prioridad?: string;
  categoria?: string;
  area?: string;
  responsable?: string;
  origen?: string;
  vista?: string;
};

const STATUS_VALUES = new Set([...OPEN_STATUSES, ...CLOSED_STATUSES] as string[]);

export function filtersWhere(user: SessionUser, filters: TicketFilters): Prisma.TicketWhereInput {
  const and: Prisma.TicketWhereInput[] = [visibilityWhere(user)];

  if (filters.q) {
    const code = normalizeTicketCode(filters.q);
    and.push({
      OR: [
        { title: { contains: filters.q, mode: "insensitive" } },
        { description: { contains: filters.q, mode: "insensitive" } },
        { code: code ?? filters.q.toUpperCase() },
      ],
    });
  }

  if (filters.estado && STATUS_VALUES.has(filters.estado)) {
    and.push({ status: filters.estado as Prisma.TicketWhereInput["status"] });
  }
  if (filters.prioridad && ["ALTA", "MEDIA", "BAJA"].includes(filters.prioridad)) {
    and.push({ priority: filters.prioridad as Prisma.TicketWhereInput["priority"] });
  }
  if (filters.categoria) and.push({ categoryId: filters.categoria });
  if (filters.area) and.push({ areaId: filters.area });
  if (filters.responsable === "sin-asignar") and.push({ assigneeId: null });
  else if (filters.responsable) and.push({ assigneeId: filters.responsable });
  if (filters.origen === "AREA" || filters.origen === "INTERNO") and.push({ origin: filters.origen });

  switch (filters.vista) {
    case "abiertos":
      and.push({ status: { in: OPEN_STATUSES } });
      break;
    case "cerrados":
      and.push({ status: { in: CLOSED_STATUSES } });
      break;
    case "vencidos":
      and.push({ status: { in: OPEN_STATUSES }, dueDate: { lt: new Date() } });
      break;
    case "mios":
      and.push({ requesterId: user.id });
      break;
    case "a-mi-cargo":
      and.push({ assigneeId: user.id, status: { in: OPEN_STATUSES } });
      break;
  }

  return { AND: and };
}

export const TICKET_LIST_SELECT = {
  id: true,
  code: true,
  title: true,
  status: true,
  priority: true,
  origin: true,
  stage: true,
  pendingAction: true,
  requestedAt: true,
  dueDate: true,
  closedAt: true,
  updatedAt: true,
  area: { select: { name: true } },
  category: { select: { name: true } },
  requester: { select: { name: true } },
  assignee: { select: { name: true } },
} satisfies Prisma.TicketSelect;

export type TicketListItem = Prisma.TicketGetPayload<{ select: typeof TICKET_LIST_SELECT }>;

export async function listTickets(user: SessionUser, filters: TicketFilters, take = 100) {
  return prisma.ticket.findMany({
    where: filtersWhere(user, filters),
    select: TICKET_LIST_SELECT,
    orderBy: [{ status: "asc" }, { priority: "asc" }, { requestedAt: "desc" }],
    take,
  });
}

/** Cifras del panel: lo abierto, lo vencido y lo que espera al área. */
export async function dashboardStats(user: SessionUser) {
  const base = visibilityWhere(user);
  const now = new Date();

  const [abiertos, vencidos, sinAsignar, entregados, mios, aMiCargo] = await Promise.all([
    prisma.ticket.count({ where: { AND: [base, { status: { in: OPEN_STATUSES } }] } }),
    prisma.ticket.count({ where: { AND: [base, { status: { in: OPEN_STATUSES } }, { dueDate: { lt: now } }] } }),
    prisma.ticket.count({ where: { AND: [base, { status: { in: OPEN_STATUSES } }, { assigneeId: null }] } }),
    prisma.ticket.count({ where: { AND: [base, { status: "ENTREGADO" }] } }),
    prisma.ticket.count({ where: { AND: [base, { requesterId: user.id }, { status: { in: OPEN_STATUSES } }] } }),
    prisma.ticket.count({ where: { AND: [base, { assigneeId: user.id }, { status: { in: OPEN_STATUSES } }] } }),
  ]);

  return { abiertos, vencidos, sinAsignar, entregados, mios, aMiCargo };
}

/** Conteo por estado, para el tablero y las pastillas de filtro. */
export async function countByStatus(user: SessionUser) {
  const rows = await prisma.ticket.groupBy({
    by: ["status"],
    where: visibilityWhere(user),
    _count: { _all: true },
  });
  return Object.fromEntries(rows.map((r) => [r.status, r._count._all])) as Record<string, number>;
}
