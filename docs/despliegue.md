# Despliegue en el servidor interno

La mesa corre en dos contenedores: la aplicación y PostgreSQL. Los datos no
salen de la red de Cofinet.

## Requisitos

- Un servidor Linux en la red interna con Docker y el plugin `compose`.
- Un nombre DNS interno apuntando a ese servidor (ej. `mesadeayuda.cofinet.local`).
- Una cuenta de correo con envío SMTP (la misma que usa la empresa).
- El registro de la aplicación en Entra ID hecho ([docs/entra-id.md](entra-id.md)).

## Instalación

```bash
git clone https://github.com/ImplementacionesCofinet/MesaDeAyuda.git
cd MesaDeAyuda
cp .env.example .env
```

Completar `.env`. Lo mínimo para arrancar:

```bash
POSTGRES_PASSWORD=<clave larga y aleatoria>
APP_URL=https://mesadeayuda.cofinet.local
AUTH_SECRET=<openssl rand -base64 48>
ENTRA_TENANT_ID=<del portal>
ENTRA_CLIENT_ID=<del portal>
ENTRA_CLIENT_SECRET=<del portal>
ADMIN_EMAILS=<tu correo>
SMTP_HOST=smtp.office365.com
SMTP_USER=mesadeayuda@cofinet.com.au
SMTP_PASSWORD=<clave de la cuenta de envío>
```

Antes de levantar, comprobar que la configuración sirve:

```bash
npm install          # solo para esta comprobación, no hace falta para operar
npm run verificar
```

Revisa contra los servicios reales el inquilino de Entra ID, la aplicación y su
secreto, la base de datos y el servidor de correo, y dice qué arreglar en cada
caso. Luego:

```bash
docker compose up -d --build
```

Al arrancar, el contenedor aplica las migraciones y carga las áreas,
categorías y niveles de prioridad iniciales. Ambas cosas son idempotentes: se
pueden repetir sin duplicar nada.

Comprobar que quedó arriba:

```bash
docker compose ps
curl http://localhost:3000/api/health   # {"estado":"ok","base":"conectada"}
```

## HTTPS

La aplicación escucha en HTTP dentro de la red de Docker. El certificado se
termina en el proxy interno (Nginx, Traefik o el que ya use el servidor), que
publica el nombre DNS y reenvía a `http://127.0.0.1:3000`. Ejemplo mínimo con
Nginx:

```nginx
server {
    listen 443 ssl;
    server_name mesadeayuda.cofinet.local;

    ssl_certificate     /etc/ssl/cofinet/mesadeayuda.crt;
    ssl_certificate_key /etc/ssl/cofinet/mesadeayuda.key;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

`APP_URL` debe quedar con `https://` y coincidir con la URI de redirección
registrada en Entra ID; de lo contrario el inicio de sesión falla.

## Primeros pasos dentro de la mesa

1. Entrar con el correo que quedó en `ADMIN_EMAILS`.
2. **Administración → Áreas**: dejar las áreas reales de Cofinet.
3. **Administración → Categorías**: ajustar lo que entra por el canal.
4. **Administración → Usuarios**: asignarle su área a cada persona que entre.
   (Cada quien aparece después de su primer inicio de sesión.)
5. **Administración → Acuerdos de tiempo**: cuando se pacten los tiempos con
   las áreas, poner las horas y marcar *Acordado*. Desde ese momento la mesa
   propone la fecha estimada de cierre al registrar cada requerimiento.

## Actualizar a una versión nueva

```bash
git pull
docker compose up -d --build
```

Las migraciones nuevas se aplican solas al arrancar.

## Respaldos

El volumen `datos-postgres` guarda toda la información. Respaldo diario:

```bash
docker compose exec -T db pg_dump -U mesa mesadeayuda | gzip > /respaldos/mesa-$(date +%F).sql.gz
```

El `docker-compose.yml` monta `./respaldos` dentro del contenedor de base de
datos para que el respaldo caiga en una carpeta que el servidor ya respalda.

Restaurar:

```bash
gunzip -c /respaldos/mesa-2026-09-18.sql.gz | docker compose exec -T db psql -U mesa -d mesadeayuda
```

## Redes que inspeccionan el tráfico HTTPS

Si la empresa intercepta HTTPS con su propio certificado (Zscaler, Fortinet,
Netskope y similares), la construcción falla al descargar paquetes:

```
TLS: server certificate not trusted
```

No es un problema del proyecto: el contenedor no conoce la autoridad
certificadora de la empresa. La solución es dejarla en `docker/certs/`, de
donde cada etapa de la imagen la toma. Desde un equipo Windows que ya confía en
ella, en PowerShell y dentro de la carpeta del proyecto:

```powershell
$pem = foreach ($c in Get-ChildItem Cert:\LocalMachine\Root) {
  "-----BEGIN CERTIFICATE-----"
  [Convert]::ToBase64String($c.RawData, 'InsertLineBreaks')
  "-----END CERTIFICATE-----"
}
$pem | Set-Content docker\certs\empresa.crt -Encoding ascii
```

Desde un servidor Linux, el certificado suele estar en
`/usr/local/share/ca-certificates/` o lo entrega el área de infraestructura.
Después, reconstruir:

```bash
docker compose build --no-cache
docker compose up -d
```

Los archivos `.crt` no se versionan: cada red tiene los suyos.

## Revisar problemas

```bash
docker compose logs -f app     # errores de la aplicación y envíos de correo
docker compose logs -f db
```

Los envíos de correo quedan registrados en la tabla `EmailLog` con su estado
(`ENVIADO`, `FALLIDO`, `OMITIDO`) y el error, si lo hubo:

```bash
docker compose exec db psql -U mesa -d mesadeayuda \
  -c 'SELECT "createdAt", event, status, "to", error FROM "EmailLog" ORDER BY "createdAt" DESC LIMIT 20;'
```

Un envío `FALLIDO` no bloquea nada: el ticket se guarda igual y el cambio
queda visible en la mesa.

Si al arrancar el contenedor aparece un error de Prisma sobre `libssl.so.3`,
la imagen base necesita OpenSSL explícito: agregar `RUN apk add --no-cache
openssl` en las etapas del `Dockerfile` (requiere que la red permita descargar
paquetes de Alpine, o el certificado de la sección anterior).
