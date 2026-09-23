import Link from "next/link";
import { TicketTable } from "@/components/ticket-table";
import { requireUser } from "@/lib/auth/guards";
import { isAgent } from "@/lib/domain/permissions";
import { dashboardStats, listTickets } from "@/lib/queries/tickets";

export const dynamic = "force-dynamic";

function Kpi({ label, value, href, tone }: { label: string; value: number; href: string; tone?: "alerta" }) {
  return (
    <Link
      href={href}
      className="tarjeta block p-4 transition hover:border-marca/40 hover:shadow-[0_1px_0_0_rgba(176,86,44,0.12)]"
    >
      <div className={`text-3xl font-semibold ${tone === "alerta" && value > 0 ? "text-marca" : "text-tinta"}`}>
        {value}
      </div>
      <div className="mt-1 text-sm text-humo">{label}</div>
    </Link>
  );
}

export default async function PanelPage() {
  const user = await requireUser();
  const agente = isAgent(user);

  const [stats, propios, atencion] = await Promise.all([
    dashboardStats(user),
    listTickets(user, { vista: "mios" }, 8),
    agente
      ? listTickets(user, { vista: "a-mi-cargo" }, 8)
      : listTickets(user, { estado: "ENTREGADO" }, 8),
  ]);

  return (
    <div className="space-y-10">
      <section>
        <p className="rotulo">Panel</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-tinta">Hola, {user.name.split(" ")[0]}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-humo">
          {agente
            ? "Esta es la carga real del área: requerimientos de las áreas e iniciativas propias en el mismo tablero."
            : "Aquí ves en qué va cada solicitud de tu área, sin tener que preguntar."}
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Requerimientos abiertos" value={stats.abiertos} href="/tickets?vista=abiertos" />
        <Kpi label="Fuera de la fecha comprometida" value={stats.vencidos} href="/tickets?vista=vencidos" tone="alerta" />
        {agente ? (
          <Kpi label="Sin responsable asignado" value={stats.sinAsignar} href="/tickets?responsable=sin-asignar" tone="alerta" />
        ) : (
          <Kpi label="Mis solicitudes abiertas" value={stats.mios} href="/tickets?vista=mios" />
        )}
        <Kpi label="Entregados, esperan confirmación" value={stats.entregados} href="/tickets?estado=ENTREGADO" />
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-tinta">
            {agente ? "A tu cargo" : "Entregados: esperan tu confirmación"}
          </h2>
          <Link href={agente ? "/tickets?vista=a-mi-cargo" : "/tickets?estado=ENTREGADO"} className="text-sm text-marca hover:underline">
            Ver todos
          </Link>
        </div>
        <TicketTable
          tickets={atencion}
          empty={agente ? "No tienes requerimientos a tu cargo." : "No hay entregas pendientes de confirmar."}
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-tinta">Mis solicitudes</h2>
          <Link href="/tickets?vista=mios" className="text-sm text-marca hover:underline">
            Ver todas
          </Link>
        </div>
        <TicketTable tickets={propios} empty="Todavía no has registrado requerimientos." />
      </section>
    </div>
  );
}
