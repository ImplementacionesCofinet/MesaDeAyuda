import Link from "next/link";
import { TicketTable } from "@/components/ticket-table";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { isAgent } from "@/lib/domain/permissions";
import { PRIORITY_LABEL, PRIORITY_ORDER, STATUS_LABEL, STATUS_ORDER } from "@/lib/domain/status";
import { listTickets, type TicketFilters } from "@/lib/queries/tickets";

export const dynamic = "force-dynamic";

const VISTAS: { value: string; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "abiertos", label: "Abiertos" },
  { value: "vencidos", label: "Vencidos" },
  { value: "mios", label: "Míos" },
  { value: "a-mi-cargo", label: "A mi cargo" },
  { value: "cerrados", label: "Cerrados" },
];

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const value = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");

  const filters: TicketFilters = {
    q: value("q") || undefined,
    estado: value("estado") || undefined,
    prioridad: value("prioridad") || undefined,
    categoria: value("categoria") || undefined,
    area: value("area") || undefined,
    responsable: value("responsable") || undefined,
    origen: value("origen") || undefined,
    vista: value("vista") || undefined,
  };

  const [tickets, categorias, areas, equipo] = await Promise.all([
    listTickets(user, filters, 200),
    prisma.category.findMany({ where: { active: true }, orderBy: { position: "asc" } }),
    isAgent(user) ? prisma.area.findMany({ where: { active: true }, orderBy: { name: "asc" } }) : [],
    isAgent(user)
      ? prisma.user.findMany({
          where: { active: true, role: { in: ["AGENTE", "ADMIN"] } },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : [],
  ]);

  const queryFor = (vista: string) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v && k !== "vista") next.set(k, v);
    }
    if (vista) next.set("vista", vista);
    const qs = next.toString();
    return qs ? `/tickets?${qs}` : "/tickets";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="rotulo">Requerimientos</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-tinta">Todos los requerimientos</h1>
          <p className="mt-2 text-sm text-humo">
            {tickets.length} {tickets.length === 1 ? "requerimiento" : "requerimientos"} con los filtros actuales.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {VISTAS.map((v) => {
          const activa = (filters.vista ?? "") === v.value;
          return (
            <Link
              key={v.label}
              href={queryFor(v.value)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                activa ? "bg-marca text-white" : "border border-borde bg-papel text-humo hover:text-tinta"
              }`}
            >
              {v.label}
            </Link>
          );
        })}
      </div>

      <form method="get" className="tarjeta grid gap-3 p-4 md:grid-cols-3 lg:grid-cols-5">
        {filters.vista ? <input type="hidden" name="vista" value={filters.vista} /> : null}

        <input
          type="search"
          name="q"
          defaultValue={filters.q ?? ""}
          placeholder="Buscar por texto o código (MA-2026-0001)"
          className="campo md:col-span-2"
        />

        <select name="estado" defaultValue={filters.estado ?? ""} className="campo">
          <option value="">Todos los estados</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>

        <select name="prioridad" defaultValue={filters.prioridad ?? ""} className="campo">
          <option value="">Toda prioridad</option>
          {PRIORITY_ORDER.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABEL[p]}
            </option>
          ))}
        </select>

        <select name="categoria" defaultValue={filters.categoria ?? ""} className="campo">
          <option value="">Toda categoría</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {isAgent(user) ? (
          <>
            <select name="area" defaultValue={filters.area ?? ""} className="campo">
              <option value="">Toda área</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>

            <select name="responsable" defaultValue={filters.responsable ?? ""} className="campo">
              <option value="">Todo responsable</option>
              <option value="sin-asignar">Sin asignar</option>
              {equipo.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>

            <select name="origen" defaultValue={filters.origen ?? ""} className="campo">
              <option value="">Todo origen</option>
              <option value="AREA">Requerimientos de áreas</option>
              <option value="INTERNO">Iniciativas de Datos y TI</option>
            </select>
          </>
        ) : null}

        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-lg bg-marca px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1D3B37]"
          >
            Filtrar
          </button>
          <Link
            href="/tickets"
            className="rounded-lg border border-borde bg-white px-4 py-2 text-sm font-semibold text-tinta transition hover:bg-lienzo"
          >
            Limpiar
          </Link>
        </div>
      </form>

      <TicketTable tickets={tickets} />
    </div>
  );
}
