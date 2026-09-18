import Link from "next/link";
import type { SessionUser } from "@/lib/auth/guards";
import { isAdmin, isAgent, ROLE_LABEL } from "@/lib/domain/permissions";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-1.5 text-sm font-medium text-tinta/80 transition hover:bg-terracota-suave hover:text-terracota"
    >
      {children}
    </Link>
  );
}

export function TopNav({ user }: { user: SessionUser }) {
  return (
    <header className="border-b border-borde bg-papel">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3">
        <Link href="/" className="flex flex-col leading-tight">
          <span className="rotulo">Cofinet · Datos y TI</span>
          <span className="text-base font-semibold text-tinta">Mesa de ayuda</span>
        </Link>

        <nav className="flex flex-1 flex-wrap items-center gap-1">
          <NavLink href="/">Panel</NavLink>
          <NavLink href="/tickets">Requerimientos</NavLink>
          {isAgent(user) ? <NavLink href="/tablero">Tablero</NavLink> : null}
          {isAdmin(user) ? <NavLink href="/admin">Administración</NavLink> : null}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/tickets/nuevo"
            className="rounded-lg bg-terracota px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#9B4A25]"
          >
            Nuevo requerimiento
          </Link>
          <div className="hidden text-right sm:block">
            <div className="text-sm font-semibold text-tinta">{user.name}</div>
            <div className="text-xs text-humo">
              {/* Sin repetir el área cuando coincide con el rol (el equipo de Datos y TI). */}
              {[ROLE_LABEL[user.role], user.areaName]
                .filter((parte, indice, partes) => parte && partes.indexOf(parte) === indice)
                .join(" · ")}
            </div>
          </div>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="rounded-lg border border-borde px-3 py-1.5 text-sm text-humo transition hover:bg-lienzo hover:text-tinta"
            >
              Salir
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
