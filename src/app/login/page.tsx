import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; returnTo?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/");

  const { error, returnTo } = await searchParams;
  const devUsers = env.devAuthEnabled
    ? await prisma.user.findMany({
        where: { active: true },
        orderBy: [{ role: "asc" }, { name: "asc" }],
        select: { email: true, name: true, role: true },
      })
    : [];

  const loginHref = returnTo ? `/api/auth/login?returnTo=${encodeURIComponent(returnTo)}` : "/api/auth/login";

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        <p className="rotulo">Cofinet · Área de Datos y TI</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-tinta">Mesa de ayuda</h1>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-humo">
          Un canal único donde cada área registra su requerimiento como ticket, y Datos y TI prioriza, actualiza y
          comunica el avance.
        </p>

        <div className="tarjeta mt-8 p-6">
          {error ? (
            <p className="mb-4 rounded-lg bg-[#FBE7E1] px-3 py-2 text-sm text-[#96331A]" role="alert">
              {error}
            </p>
          ) : null}

          <a
            href={loginHref}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-terracota px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#9B4A25]"
          >
            Entrar con la cuenta de Cofinet
          </a>
          <p className="mt-3 text-center text-xs text-humo">
            Se usa tu cuenta corporativa de Microsoft. La mesa de ayuda no guarda contraseñas.
          </p>

          {env.devAuthEnabled ? (
            <div className="mt-6 border-t border-borde pt-5">
              <p className="rotulo">Acceso de desarrollo</p>
              <p className="mt-1 text-xs text-humo">
                Solo visible con AUTH_DEV_MODE=true. No se habilita en producción.
              </p>
              <form action="/api/auth/dev" method="post" className="mt-3 flex gap-2">
                <select name="email" className="campo" defaultValue={devUsers[0]?.email ?? ""}>
                  {devUsers.map((u) => (
                    <option key={u.email} value={u.email}>
                      {u.name} — {u.email}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="shrink-0 rounded-lg border border-borde px-4 py-2 text-sm font-semibold text-tinta hover:bg-lienzo"
                >
                  Entrar
                </button>
              </form>
            </div>
          ) : null}
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-3 text-xs text-humo sm:grid-cols-3">
          {[
            ["Estado", "En análisis, desarrollo, pruebas, entregado"],
            ["Etapa del proceso", "Punto exacto del flujo"],
            ["Qué falta", "Actividad pendiente y responsable"],
            ["Fecha de solicitud", "Registrada al crear el ticket"],
            ["Fecha estimada de cierre", "Compromiso visible para el área"],
            ["Historial", "Todo cambio queda registrado"],
          ].map(([titulo, detalle]) => (
            <div key={titulo} className="tarjeta p-3">
              <dt className="text-[13px] font-semibold text-terracota">{titulo}</dt>
              <dd className="mt-1 leading-snug">{detalle}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
