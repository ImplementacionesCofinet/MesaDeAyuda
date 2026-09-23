import { redirect } from "next/navigation";
import { BienvenidaForm } from "@/components/bienvenida-form";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { isAgent } from "@/lib/domain/permissions";

export const dynamic = "force-dynamic";

/**
 * Primer ingreso. Cada quien elige su área y queda listo para registrar
 * requerimientos, sin esperar a que un administrador lo habilite.
 */
export default async function BienvenidaPage() {
  const user = await requireUser();
  if (user.areaId || isAgent(user)) redirect("/");

  const areas = await prisma.area.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl">
        <p className="rotulo">Cofinet · Datos y TI</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-tinta">
          Bienvenido, {user.name.split(" ")[0]}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-humo">
          Esta es la mesa de ayuda: el canal único para los requerimientos de OASIS, soporte técnico, desarrollos,
          reportes y accesos. Desde que registras uno puedes ver su estado, la etapa en que va, qué falta y la fecha
          estimada de cierre.
        </p>

        <div className="tarjeta mt-7 p-6">
          <BienvenidaForm areas={areas} />
        </div>

        <p className="mt-6 text-xs text-humo">
          Entraste como {user.email}. Si no eres tú, cierra sesión desde tu cuenta de Microsoft.
        </p>
      </div>
    </div>
  );
}
