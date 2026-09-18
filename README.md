# Mesa de ayuda · Cofinet

Canal único donde cada área registra sus requerimientos como ticket, y el área
de Datos y TI prioriza, actualiza y comunica el avance.

Cada requerimiento muestra, en todo momento:

| Campo | Qué responde |
| --- | --- |
| **Estado** | En análisis, desarrollo, pruebas, entregado |
| **Etapa del proceso** | El punto exacto del flujo |
| **Qué falta** | La actividad pendiente y de quién depende |
| **Fecha de solicitud** | Registrada al crear el ticket |
| **Fecha estimada de cierre** | El compromiso visible para el área |

Entra por el mismo canal todo lo del área: **OASIS (ERP), soporte técnico,
desarrollos, reportes, accesos e infraestructura**. Las iniciativas propias de
Datos y TI se cargan en el mismo tablero, para que la carga real del área sea
visible al priorizar.

## Qué incluye

- Registro de requerimientos por área, con categoría y prioridad.
- Gestión por parte de Datos y TI: estado, etapa, responsable, pendientes,
  prioridad y fecha estimada de cierre.
- Historial completo e inmutable de cada cambio.
- Conversación por ticket, con notas internas que el área no ve.
- Notificaciones por correo al crear, asignar, cambiar de estado, mover la
  fecha comprometida y comentar.
- Tablero de la carga del área y panel con las cifras de seguimiento.
- Acuerdos de tiempo por prioridad, configurables; mientras no estén pactados,
  la mesa muestra "Por acordar" y no compromete fechas automáticas.
- Inicio de sesión con la cuenta corporativa (Microsoft Entra ID). No se
  guardan contraseñas.

## Puesta en marcha

| Documento | Para qué |
| --- | --- |
| [docs/despliegue.md](docs/despliegue.md) | Instalar en el servidor interno con Docker |
| [docs/entra-id.md](docs/entra-id.md) | Registrar la aplicación en Microsoft Entra ID |
| [docs/operacion.md](docs/operacion.md) | Cómo se opera la mesa: roles, estados, acuerdos de tiempo |
| [docs/desarrollo.md](docs/desarrollo.md) | Levantar el proyecto en local y ejecutar pruebas |

Resumen para el servidor interno:

```bash
cp .env.example .env     # completar credenciales y URL
docker compose up -d --build
```

## Cómo está construido

| Pieza | Elección | Por qué |
| --- | --- | --- |
| Aplicación | Next.js 15 (App Router) + TypeScript | Un solo proyecto para interfaz y servidor |
| Base de datos | PostgreSQL 16 + Prisma | Migraciones versionadas y consultas tipadas |
| Sesión | OIDC contra Entra ID + cookie firmada | Sin contraseñas propias que administrar |
| Correo | SMTP (Nodemailer) | Usa el correo corporativo que ya existe |
| Despliegue | Docker Compose | Los datos no salen de la red interna |

La estructura del código:

```
prisma/schema.prisma      Modelo de datos y migraciones
src/lib/domain/           Reglas: estados, permisos, acuerdos de tiempo (con pruebas)
src/lib/actions/          Operaciones de escritura (crear, gestionar, comentar)
src/lib/queries/          Consultas y reglas de visibilidad
src/lib/auth/             Inicio de sesión con Entra ID y sesión
src/lib/mail/             Plantillas y envío de notificaciones
src/app/                  Páginas: panel, requerimientos, tablero, administración
e2e/                      Prueba del ciclo completo en navegador
```

## Pruebas y comprobaciones

```bash
npm run verificar # revisa la configuración contra Entra ID, la base y el correo
npm test          # reglas de dominio: estados, permisos, cálculo de fechas
npm run test:e2e  # ciclo completo en navegador (requiere la app levantada)
```

## Lo que no incluye esta primera versión

- Adjuntos en los tickets (pantallazos y archivos).
- Tablero de indicadores con cumplimiento de acuerdos de tiempo.
- Integración de datos con OASIS: el ERP entra como categoría, la mesa no lo consulta.
- Encuesta de satisfacción al cerrar.
