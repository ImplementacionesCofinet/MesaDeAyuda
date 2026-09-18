import { PrismaClient, type Priority } from "@prisma/client";

/**
 * Datos iniciales de la mesa de ayuda: áreas, categorías, acuerdos de tiempo y
 * los primeros usuarios administradores. Es idempotente: se puede volver a
 * correr sin duplicar nada.
 */
const prisma = new PrismaClient();

const AREAS = [
  "Datos y TI",
  "Contabilidad",
  "Despachos",
  "Comercial",
  "Compras",
  "Talento Humano",
  "Gerencia",
];

const CATEGORIAS: { name: string; description: string }[] = [
  { name: "OASIS (ERP)", description: "Errores, dudas y ajustes sobre el ERP OASIS." },
  { name: "Soporte técnico", description: "Equipos, periféricos, correo, impresión y conectividad." },
  { name: "Desarrollos", description: "Automatizaciones, integraciones y software a la medida." },
  { name: "Reportes e información", description: "Informes, tableros y extracciones de datos." },
  { name: "Accesos y permisos", description: "Altas, bajas y cambios de acceso a sistemas." },
  { name: "Infraestructura y redes", description: "Servidores, respaldos, red y telefonía." },
  { name: "Otros requerimientos", description: "Lo que no encaja en las categorías anteriores." },
];

const CRITERIOS: Record<Priority, string> = {
  ALTA: "Operación detenida o riesgo directo en despachos y cierres",
  MEDIA: "Mejora necesaria que no bloquea la operación diaria",
  BAJA: "Optimización o desarrollo planificado sin urgencia",
};

function emailList(name: string): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

async function main() {
  for (const name of AREAS) {
    await prisma.area.upsert({ where: { name }, create: { name }, update: {} });
  }

  for (const [index, categoria] of CATEGORIAS.entries()) {
    await prisma.category.upsert({
      where: { name: categoria.name },
      create: { ...categoria, position: index + 1 },
      update: { description: categoria.description, position: index + 1 },
    });
  }

  // Los tiempos quedan sin acordar: la propuesta los deja para pactar con las áreas.
  for (const priority of Object.keys(CRITERIOS) as Priority[]) {
    await prisma.slaPolicy.upsert({
      where: { priority },
      create: { priority, criterion: CRITERIOS[priority], agreed: false },
      update: { criterion: CRITERIOS[priority] },
    });
  }

  const areaTI = await prisma.area.findUnique({ where: { name: "Datos y TI" } });

  for (const email of emailList("ADMIN_EMAILS")) {
    await prisma.user.upsert({
      where: { email },
      create: { email, name: email.split("@")[0], role: "ADMIN", areaId: areaTI?.id ?? null },
      update: { role: "ADMIN" },
    });
  }

  for (const email of emailList("AGENT_EMAILS")) {
    await prisma.user.upsert({
      where: { email },
      create: { email, name: email.split("@")[0], role: "AGENTE", areaId: areaTI?.id ?? null },
      update: { role: "AGENTE" },
    });
  }

  console.log(
    `Listo: ${AREAS.length} áreas, ${CATEGORIAS.length} categorías y 3 niveles de prioridad configurados.`,
  );

  if (process.env.SEED_DEMO === "true") {
    await seedDemo();
  }
}

/** Datos de ejemplo para mostrar la mesa funcionando antes de abrirla a las áreas. */
async function seedDemo() {
  const [areaTI, contabilidad, despachos] = await Promise.all([
    prisma.area.findUnique({ where: { name: "Datos y TI" } }),
    prisma.area.findUnique({ where: { name: "Contabilidad" } }),
    prisma.area.findUnique({ where: { name: "Despachos" } }),
  ]);

  const analista = await prisma.user.upsert({
    where: { email: "demo.analista@cofinet.com.au" },
    create: { email: "demo.analista@cofinet.com.au", name: "Ana Restrepo (demo)", role: "AGENTE", areaId: areaTI?.id },
    update: {},
  });
  const contadora = await prisma.user.upsert({
    where: { email: "demo.contabilidad@cofinet.com.au" },
    create: {
      email: "demo.contabilidad@cofinet.com.au",
      name: "Carolina Díaz (demo)",
      role: "SOLICITANTE",
      areaId: contabilidad?.id,
    },
    update: {},
  });
  const despachador = await prisma.user.upsert({
    where: { email: "demo.despachos@cofinet.com.au" },
    create: {
      email: "demo.despachos@cofinet.com.au",
      name: "Diego Marín (demo)",
      role: "SOLICITANTE",
      areaId: despachos?.id,
    },
    update: {},
  });

  const categorias = await prisma.category.findMany();
  const cat = (name: string) => categorias.find((c) => c.name.startsWith(name))!.id;

  const year = new Date().getFullYear();
  const ejemplos = [
    {
      code: `MA-${year}-9001`,
      title: "Error al generar el informe de despachos en OASIS",
      description:
        "Desde el lunes, el informe de despachos del día arroja un error al exportarlo a Excel. Afecta el cierre diario de la operación.",
      categoryId: cat("OASIS"),
      areaId: despachos!.id,
      requesterId: despachador.id,
      assigneeId: analista.id,
      priority: "ALTA" as const,
      status: "EN_DESARROLLO" as const,
      stage: "Corrigiendo la consulta del reporte",
      pendingAction: "Confirmar con Despachos el rango de fechas afectado",
      pendingOwnerId: despachador.id,
      dueDate: new Date(Date.now() + 2 * 86_400_000),
    },
    {
      code: `MA-${year}-9002`,
      title: "Automatizar la conciliación bancaria mensual",
      description:
        "Hoy la conciliación se arma a mano con tres archivos distintos. Necesitamos un proceso que los cruce y deje el resultado listo para revisar.",
      categoryId: cat("Desarrollos"),
      areaId: contabilidad!.id,
      requesterId: contadora.id,
      assigneeId: analista.id,
      priority: "MEDIA" as const,
      status: "EN_ANALISIS" as const,
      stage: "Levantando el detalle de los tres archivos con Contabilidad",
      pendingAction: null,
      pendingOwnerId: null,
      dueDate: null,
    },
    {
      code: `MA-${year}-9003`,
      title: "Depurar y respaldar el histórico de la base de datos",
      description:
        "Iniciativa interna: depurar tablas históricas y dejar el respaldo automático verificado semanalmente.",
      categoryId: cat("Infraestructura"),
      areaId: areaTI!.id,
      requesterId: analista.id,
      assigneeId: analista.id,
      priority: "BAJA" as const,
      status: "EN_ESPERA" as const,
      origin: "INTERNO" as const,
      stage: "A la espera de la ventana de mantenimiento",
      pendingAction: "Ventana de mantenimiento aprobada por Gerencia",
      pendingOwnerId: null,
      dueDate: null,
    },
  ];

  for (const ejemplo of ejemplos) {
    const { code, ...rest } = ejemplo;
    const ticket = await prisma.ticket.upsert({
      where: { code },
      create: { code, ...rest },
      update: {},
    });
    const eventos = await prisma.ticketEvent.count({ where: { ticketId: ticket.id } });
    if (eventos === 0) {
      await prisma.ticketEvent.create({
        data: { ticketId: ticket.id, actorId: ticket.requesterId, type: "CREACION", note: "Requerimiento de ejemplo." },
      });
    }
  }

  console.log("Datos de demostración cargados (3 requerimientos de ejemplo).");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
