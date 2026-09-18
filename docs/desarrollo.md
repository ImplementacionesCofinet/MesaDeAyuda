# Desarrollo local

## Requisitos

- Node.js 20.9 o superior
- PostgreSQL 16 (local o en Docker)

O, más simple: **solo Docker**. Ver "Probar sin instalar Node" más abajo.

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

## Probar sin instalar Node (Docker Desktop)

Levanta la aplicación completa con su base de datos, sin npm ni PostgreSQL en
el equipo. Útil para probar el inicio de sesión antes de tener servidor.

```bash
cp .env.example .env
```

En `.env` basta con:

```bash
POSTGRES_PASSWORD=una-clave-cualquiera-local
APP_URL=http://localhost:3000
AUTH_SECRET=<32 caracteres o más>
ENTRA_TENANT_ID=...
ENTRA_CLIENT_ID=...
ENTRA_CLIENT_SECRET=...
ADMIN_EMAILS=tu.correo@cofinet.com.au
MAIL_ENABLED=false
```

```bash
docker compose up --build
```

Al arrancar aplica las migraciones y carga áreas, categorías y niveles de
prioridad. La mesa queda en http://localhost:3000. Para detenerla, `Ctrl+C`;
para borrar también los datos, `docker compose down -v`.

Requiere que `http://localhost:3000/api/auth/callback` esté registrada como URI
de redirección en Entra ID.

## Si `npm install` falla en Windows

El error `npm error Exit handler never called!` no viene del proyecto: es un
fallo de npm al escribir `node_modules`. Las tres causas habituales, en orden:

1. **La carpeta está en OneDrive.** El escritorio corporativo suele estar
   sincronizado, y OneDrive intenta subir los miles de archivos de
   `node_modules` mientras npm los escribe. Mueve el proyecto a una ruta local:
   `C:\dev\mesadeayuda`.
2. **La ruta tiene tildes o es muy larga.** Rutas con `García`, espacios o más
   de 260 caracteres rompen herramientas de Node. La misma solución: una ruta
   corta y sin acentos.
3. **Caché de npm dañada.** `npm cache clean --force` y reintentar.

```powershell
cd C:\dev
git clone -b claude/cofinet-help-desk-chl4dc https://github.com/ImplementacionesCofinet/MesaDeAyuda.git mesadeayuda
cd mesadeayuda
npm cache clean --force
npm install --no-audit --no-fund
```

Si vuelve a fallar, el detalle está en el archivo que el propio error indica
(`...\npm-cache\_logs\<fecha>-debug-0.log`); las últimas líneas dicen en qué
paquete se cayó. El antivirus corporativo bloqueando escrituras en
`node_modules` es la otra causa frecuente.

## Pruebas

```bash
npm run verificar         # configuración: Entra ID, base de datos y correo
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
