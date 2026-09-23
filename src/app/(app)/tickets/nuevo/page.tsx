import Link from "next/link";
import { NewTicketForm } from "@/components/new-ticket-form";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { isAgent } from "@/lib/domain/permissions";

export const dynamic = "force-dynamic";

export default async function NuevoTicketPage() {
  const user = await requireUser();
  const esAgente = isAgent(user);

  const [categorias, areas, equipo] = await Promise.all([
    prisma.category.findMany({ where: { active: true }, orderBy: { position: "asc" } }),
    esAgente ? prisma.area.findMany({ where: { active: true }, orderBy: { name: "asc" } }) : [],
    esAgente
      ? prisma.user.findMany({
          where: { active: true, role: { in: ["AGENTE", "ADMIN"] } },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : [],
  ]);

  const sinArea = !user.areaId && !esAgente;

  return (
    <div className="mx-auto max-w-3xl">
      <p className="rotulo">Nuevo requerimiento</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-tinta">Registra tu requerimiento</h1>
      <p className="mt-2 text-sm leading-relaxed text-humo">
        Todo entra por el mismo canal: OASIS, soporte técnico, desarrollos y reportes. Desde que lo registras podrás ver
        su estado, la etapa del proceso, qué falta y la fecha estimada de cierre.
      </p>

      {sinArea ? (
        <div className="tarjeta mt-6 p-5 text-sm text-[#96331A]">
          Tu usuario todavía no tiene un área asignada, así que no podemos registrar el requerimiento a nombre de nadie.
          Escríbele al área de Datos y TI para que la configure y vuelve a intentarlo.
        </div>
      ) : (
        <div className="tarjeta mt-6 p-6">
          <NewTicketForm
            categorias={categorias}
            areas={areas}
            equipo={equipo}
            esAgente={esAgente}
            areaPropia={user.areaId}
          />
        </div>
      )}

      <p className="mt-6 text-sm text-humo">
        <Link href="/tickets" className="text-marca hover:underline">
          Ver los requerimientos ya registrados
        </Link>
      </p>
    </div>
  );
}
