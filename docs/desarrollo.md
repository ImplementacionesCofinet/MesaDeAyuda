# Desarrollo local

## Requisitos

- Node.js 22 o superior
- PostgreSQL 16 (local o en Docker)

## Puesta en marcha

```bash
npm install
cp .env.example .env
```

En `.env`, para trabajar sin Entra ID:

```bash
DATABASE_URL="postgresql://mesa:mesa@127.0.0.1:5432/mesadeayuda?schema=public"
APP_URL="http://localhost:3000"
AUTH_SECRET="una-clave-local-de-mas-de-32-caracteres"
AUTH_DEV_MODE="true"     # permite entrar eligiendo un usuario de la lista
MAIL_ENABLED="false"     # los correos se registran en EmailLog, no se envían
SEED_DEMO="true"         # tres requerimientos de ejemplo
ADMIN_EMAILS="tu.correo@cofinet.com.au"
```

`AUTH_DEV_MODE` solo funciona fuera de producción: con `NODE_ENV=production` el
acceso de desarrollo devuelve 404 aunque la variable esté en `true`.

Base de datos y arranque:

```bash
npm run db:migrate    # crea el esquema
npm run db:seed       # áreas, categorías, acuerdos y datos de ejemplo
npm run dev           # http://localhost:3000
```

## Pruebas

```bash
npm test                  # reglas de dominio (estados, permisos, fechas hábiles)
npm run typecheck
npm run test:e2e          # ciclo completo en navegador, con la app levantada
```

La prueba de navegador necesita la aplicación corriendo con `AUTH_DEV_MODE=true`
y los datos de ejemplo cargados. Si el servidor ya tiene un Chromium instalado,
se le puede indicar con `E2E_CHROMIUM_PATH=/ruta/al/chromium npm run test:e2e`;
si no, `npx playwright install chromium` lo descarga.

## Mapa del código

| Carpeta | Qué hay |
| --- | --- |
| `prisma/` | Modelo de datos, migraciones y datos iniciales |
| `src/lib/domain/` | Reglas puras y probadas: estados, permisos, jornada hábil, códigos |
| `src/lib/actions/` | Escrituras: crear, gestionar, comentar, cerrar, administrar |
| `src/lib/queries/` | Lecturas y reglas de visibilidad aplicadas en la consulta |
| `src/lib/auth/` | OIDC con Entra ID, sesión en cookie firmada, guardas de acceso |
| `src/lib/mail/` | Plantillas y envío de notificaciones |
| `src/app/(app)/` | Páginas autenticadas |
| `src/components/` | Componentes de interfaz |

Dos criterios que conviene mantener:

- **La visibilidad se aplica en la consulta**, no en la vista
  (`visibilityWhere`): lo que alguien no puede ver, no sale de la base.
- **Todo cambio de gestión deja evento** en `TicketEvent`. El historial es lo
  que sostiene la promesa de trazabilidad.

## Cambios en el modelo de datos

```bash
# editar prisma/schema.prisma
npm run db:migrate -- --name descripcion_del_cambio
```

La migración queda versionada en `prisma/migrations/` y se aplica sola al
desplegar.
