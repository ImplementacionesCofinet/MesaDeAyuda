/**
 * Revisión previa al despliegue: comprueba contra los servicios reales que la
 * configuración del archivo .env sirve, antes de levantar la aplicación.
 *
 *   npm run verificar
 *
 * No modifica nada y no imprime secretos.
 */
import nodemailer from "nodemailer";
import { PrismaClient } from "@prisma/client";

const VERDE = "\u001b[32m";
const ROJO = "\u001b[31m";
const AMARILLO = "\u001b[33m";
const GRIS = "\u001b[90m";
const FIN = "\u001b[0m";

let fallas = 0;
let avisos = 0;

function ok(titulo: string, detalle?: string) {
  console.log(`${VERDE}  ✓${FIN} ${titulo}${detalle ? `${GRIS} — ${detalle}${FIN}` : ""}`);
}

function error(titulo: string, detalle: string, arreglo?: string) {
  fallas++;
  console.log(`${ROJO}  ✗${FIN} ${titulo}${GRIS} — ${detalle}${FIN}`);
  if (arreglo) console.log(`${GRIS}     → ${arreglo}${FIN}`);
}

function aviso(titulo: string, detalle: string) {
  avisos++;
  console.log(`${AMARILLO}  !${FIN} ${titulo}${GRIS} — ${detalle}${FIN}`);
}

function seccion(nombre: string) {
  console.log(`\n${nombre}`);
}

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function revisarVariables(): Promise<boolean> {
  seccion("Variables de entorno");

  const faltantes = ["DATABASE_URL", "APP_URL", "AUTH_SECRET", "ENTRA_TENANT_ID", "ENTRA_CLIENT_ID", "ENTRA_CLIENT_SECRET"]
    .filter((nombre) => !process.env[nombre]);

  if (faltantes.length > 0) {
    error("Faltan variables", faltantes.join(", "), "Complétalas en el archivo .env (plantilla en .env.example)");
    return false;
  }
  ok("Todas las variables obligatorias están definidas");

  if ((process.env.AUTH_SECRET ?? "").length < 32) {
    error("AUTH_SECRET demasiado corto", "necesita 32 caracteres o más", "Genera uno con: openssl rand -base64 48");
  } else {
    ok("AUTH_SECRET tiene longitud suficiente");
  }

  const appUrl = process.env.APP_URL ?? "";
  if (!/^https?:\/\//.test(appUrl)) {
    error("APP_URL inválida", appUrl, "Debe empezar por http:// o https://");
  } else if (appUrl.endsWith("/")) {
    aviso("APP_URL termina en barra", "se ignora, pero conviene quitarla");
  } else if (appUrl.startsWith("http://") && !appUrl.includes("localhost")) {
    aviso("APP_URL sin HTTPS", "en producción la sesión debe viajar cifrada");
  } else {
    ok("APP_URL bien formada", appUrl);
  }

  for (const nombre of ["ENTRA_TENANT_ID", "ENTRA_CLIENT_ID"]) {
    if (!GUID.test(process.env[nombre] ?? "")) {
      error(`${nombre} no parece un identificador válido`, "se espera un GUID del portal de Entra ID");
    }
  }

  if (process.env.AUTH_DEV_MODE === "true" && process.env.NODE_ENV === "production") {
    ok("El acceso de desarrollo está desactivado", "NODE_ENV=production lo bloquea aunque la variable esté en true");
  }

  return true;
}

async function revisarEntra() {
  seccion("Microsoft Entra ID");

  const tenant = process.env.ENTRA_TENANT_ID!;
  const clientId = process.env.ENTRA_CLIENT_ID!;
  const secret = process.env.ENTRA_CLIENT_SECRET!;
  const redirectUri = `${(process.env.APP_URL ?? "").replace(/\/$/, "")}/api/auth/callback`;

  // 1. El tenant existe y publica su configuración OpenID.
  let tokenEndpoint = "";
  try {
    const respuesta = await fetch(`https://login.microsoftonline.com/${tenant}/v2.0/.well-known/openid-configuration`);
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
    const config = (await respuesta.json()) as { token_endpoint: string };
    tokenEndpoint = config.token_endpoint;
    ok("El inquilino responde", tenant);
  } catch (e) {
    error("No se pudo leer la configuración del inquilino", String(e), "Revisa ENTRA_TENANT_ID y la salida a internet del servidor");
    return;
  }

  // 2. El secreto de cliente sirve y la aplicación existe. Se comprueba contra
  //    el endpoint de token: es la única llamada que Entra valida sin que haya
  //    una persona autenticándose. Cada código de error dice qué está mal.
  try {
    const respuesta = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: secret,
        grant_type: "client_credentials",
        scope: "https://graph.microsoft.com/.default",
      }),
    });
    const datos = (await respuesta.json()) as { error?: string; error_description?: string };

    const descripcion = (datos.error_description ?? "").split("\n")[0];
    const codigo = /AADSTS\d+/.exec(descripcion)?.[0] ?? "";

    if (codigo === "AADSTS700016") {
      error("La aplicación no existe en este inquilino", codigo, "Revisa ENTRA_CLIENT_ID");
    } else if (codigo === "AADSTS7000222") {
      error("El secreto de cliente está vencido", codigo,
        "Genera uno nuevo en Entra ID → tu aplicación → Certificados y secretos");
    } else if (codigo === "AADSTS7000215" || codigo === "AADSTS700026") {
      error("El secreto de cliente no es válido", codigo,
        "Copia la columna Valor del secreto, no el Id. secreto. Si ya se ocultó, genera otro");
    } else if (datos.error === "invalid_client") {
      error("Entra ID rechazó las credenciales de la aplicación", descripcion.slice(0, 120));
    } else {
      // Cualquier otra respuesta (incluido un token) significa que el par
      // client_id + secreto es correcto; los permisos de Graph no importan aquí.
      ok("La aplicación existe y su secreto es válido");
    }
  } catch (e) {
    aviso("No se pudo comprobar el secreto de cliente", String(e));
  }

  // La URI de redirección solo la valida Entra cuando alguien inicia sesión de
  // verdad, así que aquí únicamente se recuerda cuál debe estar registrada.
  console.log(`${GRIS}  · Debe estar registrada en Entra ID → Autenticación: ${redirectUri}${FIN}`);
  console.log(`${GRIS}    (Entra solo la valida al iniciar sesión: si falta, el login falla con AADSTS50011)${FIN}`);
}

async function revisarBaseDeDatos() {
  seccion("Base de datos");
  const prisma = new PrismaClient({ log: [] });
  try {
    await prisma.$queryRaw`SELECT 1`;
    ok("Conexión establecida");

    const [areas, categorias, acuerdos] = await Promise.all([
      prisma.area.count(),
      prisma.category.count(),
      prisma.slaPolicy.count(),
    ]);

    if (areas === 0 || categorias === 0 || acuerdos === 0) {
      aviso("Faltan datos iniciales", `${areas} áreas, ${categorias} categorías, ${acuerdos} niveles de prioridad`);
      console.log(`${GRIS}     → Cárgalos con: npm run db:seed${FIN}`);
    } else {
      ok("Datos iniciales cargados", `${areas} áreas, ${categorias} categorías, ${acuerdos} niveles de prioridad`);
    }

    const admins = await prisma.user.count({ where: { role: "ADMIN", active: true } });
    if (admins === 0) {
      aviso("No hay administradores activos", "el primero se crea al iniciar sesión con un correo de ADMIN_EMAILS");
    } else {
      ok(`${admins} administrador(es) activo(s)`);
    }
  } catch (e) {
    error("No se pudo conectar", String(e).split("\n")[0], "Revisa DATABASE_URL y que PostgreSQL esté arriba");
  } finally {
    await prisma.$disconnect();
  }
}

async function revisarCorreo() {
  seccion("Correo saliente");

  if (process.env.MAIL_ENABLED !== "true") {
    aviso("Notificaciones desactivadas", "MAIL_ENABLED no está en true: los envíos quedarán como OMITIDO");
    return;
  }
  if (!process.env.SMTP_HOST) {
    error("Falta SMTP_HOST", "no hay servidor de correo configurado");
    return;
  }

  try {
    const transporte = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
      connectionTimeout: 10_000,
    });
    await transporte.verify();
    ok("El servidor de correo acepta la conexión y las credenciales", `${process.env.SMTP_HOST}:${process.env.SMTP_PORT ?? 587}`);
  } catch (e) {
    error("No se pudo conectar al servidor de correo", String(e).split("\n")[0],
      "Revisa host, puerto y credenciales. Con Microsoft 365 suele requerirse SMTP AUTH habilitado en la cuenta");
  }
}

async function main() {
  console.log("\nRevisión de la configuración de la mesa de ayuda");

  const completo = await revisarVariables();
  if (completo) await revisarEntra();
  await revisarBaseDeDatos();
  await revisarCorreo();

  console.log("");
  if (fallas > 0) {
    console.log(`${ROJO}${fallas} problema(s) por resolver${FIN}${avisos ? `${GRIS}, ${avisos} aviso(s)${FIN}` : ""}\n`);
    process.exit(1);
  }
  console.log(`${VERDE}Todo en orden${FIN}${avisos ? `${GRIS}, con ${avisos} aviso(s)${FIN}` : ""}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
