import { AreaForm, CategoryForm, SlaRow, UserRow } from "@/components/admin-forms";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { PRIORITY_ORDER } from "@/lib/domain/status";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();

  const [areas, categorias, usuarios, acuerdos] = await Promise.all([
    prisma.area.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({ orderBy: { position: "asc" } }),
    prisma.user.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.slaPolicy.findMany(),
  ]);

  const porPrioridad = PRIORITY_ORDER.map((p) => acuerdos.find((a) => a.priority === p)).filter(
    (a): a is NonNullable<typeof a> => Boolean(a),
  );

  return (
    <div className="space-y-10">
      <div>
        <p className="rotulo">Administración</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-tinta">Configuración de la mesa</h1>
        <p className="mt-2 max-w-2xl text-sm text-humo">
          Áreas, categorías, permisos y acuerdos de tiempo. Los cambios aplican de inmediato.
        </p>
      </div>

      <section className="tarjeta p-6">
        <h2 className="text-lg font-semibold text-tinta">Acuerdos de tiempo por prioridad</h2>
        <p className="mt-1 text-sm text-humo">
          Mientras un nivel no esté marcado como acordado, la mesa muestra &ldquo;Por acordar&rdquo; y no compromete
          fechas automáticas. Las horas de solución se cuentan en jornada hábil.
        </p>
        <div className="mt-4">
          {porPrioridad.map((policy) => (
            <SlaRow key={policy.priority} policy={policy} />
          ))}
        </div>
      </section>

      <section className="tarjeta p-6">
        <h2 className="text-lg font-semibold text-tinta">Categorías de requerimiento</h2>
        <p className="mt-1 mb-4 text-sm text-humo">Lo que el área elige al registrar: OASIS, soporte, desarrollos, reportes…</p>
        <div className="space-y-3">
          {categorias.map((c) => (
            <CategoryForm key={c.id} category={c} />
          ))}
        </div>
        <div className="mt-5 border-t border-borde pt-5">
          <CategoryForm />
        </div>
      </section>

      <section className="tarjeta p-6">
        <h2 className="text-lg font-semibold text-tinta">Áreas</h2>
        <p className="mt-1 mb-4 text-sm text-humo">Cada requerimiento pertenece a un área; su gente ve lo del área.</p>
        <div className="space-y-3">
          {areas.map((a) => (
            <AreaForm key={a.id} area={a} />
          ))}
        </div>
        <div className="mt-5 border-t border-borde pt-5">
          <AreaForm />
        </div>
      </section>

      <section className="tarjeta p-6">
        <h2 className="text-lg font-semibold text-tinta">Usuarios</h2>
        <p className="mt-1 mb-2 text-sm text-humo">
          Los usuarios se crean solos en su primer inicio de sesión con la cuenta de Cofinet. Aquí les asignas área y
          rol.
        </p>
        <div>
          {usuarios.map((u) => (
            <UserRow key={u.id} user={u} areas={areas} />
          ))}
        </div>
      </section>
    </div>
  );
}
