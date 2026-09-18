/**
 * Traduce los errores de Microsoft Entra ID a algo que se pueda accionar.
 *
 * Entra devuelve descripciones largas, en inglés y con identificadores de
 * traza. Quien llega a la pantalla de inicio de sesión necesita saber qué pasó
 * y quién lo arregla, no el texto original.
 */

type Explicacion = { mensaje: string; paraElAdministrador?: string };

const EXPLICACIONES: Record<string, Explicacion> = {
  AADSTS50011: {
    mensaje: "La dirección de retorno de la mesa de ayuda no está registrada en Entra ID.",
    paraElAdministrador:
      "Agrega la URI de redirección (APP_URL + /api/auth/callback) en Entra ID → la aplicación → Autenticación.",
  },
  AADSTS7000215: {
    mensaje: "La mesa de ayuda no pudo autenticarse ante Entra ID.",
    paraElAdministrador:
      "El secreto de cliente es incorrecto: debe ser la columna Valor del secreto, no el Id. Revisa ENTRA_CLIENT_SECRET.",
  },
  AADSTS700026: {
    mensaje: "La mesa de ayuda no pudo autenticarse ante Entra ID.",
    paraElAdministrador: "La aplicación no tiene un secreto de cliente configurado en Entra ID.",
  },
  AADSTS7000222: {
    mensaje: "La mesa de ayuda no pudo autenticarse ante Entra ID.",
    paraElAdministrador:
      "El secreto de cliente está vencido. Genera uno nuevo en Certificados y secretos y actualiza ENTRA_CLIENT_SECRET.",
  },
  AADSTS700016: {
    mensaje: "La mesa de ayuda no está registrada en este directorio.",
    paraElAdministrador: "Revisa ENTRA_CLIENT_ID y ENTRA_TENANT_ID: no corresponden a una aplicación de este inquilino.",
  },
  AADSTS50020: {
    mensaje: "Tu cuenta no pertenece al directorio de Cofinet.",
    paraElAdministrador: "La aplicación está restringida a cuentas del inquilino de la empresa.",
  },
  AADSTS50105: {
    mensaje: "Tu cuenta no tiene asignado el acceso a la mesa de ayuda.",
    paraElAdministrador:
      "La aplicación exige asignación de usuarios: agrega a la persona o al grupo en Aplicaciones empresariales → Usuarios y grupos.",
  },
  AADSTS65001: {
    mensaje: "Falta autorizar la aplicación en el directorio.",
    paraElAdministrador: "Da el consentimiento del administrador en Entra ID → la aplicación → Permisos de API.",
  },
  AADSTS50058: {
    mensaje: "No se completó el inicio de sesión. Intenta de nuevo.",
  },
  AADSTS50076: {
    mensaje: "Tu cuenta requiere verificación en dos pasos. Complétala e intenta de nuevo.",
  },
  AADSTS90072: {
    mensaje: "Tu cuenta no tiene acceso a esta aplicación en el directorio de Cofinet.",
  },
};

/** Extrae el código AADSTS de la respuesta de Entra, si lo trae. */
export function codigoEntra(texto: string): string | null {
  return /AADSTS\d+/.exec(texto)?.[0] ?? null;
}

/**
 * Convierte la respuesta de Entra en un mensaje en español. Si el código no
 * está contemplado, devuelve el texto original recortado: es preferible a
 * ocultar la causa real.
 */
export function explicarErrorEntra(texto: string): string {
  const codigo = codigoEntra(texto);
  const explicacion = codigo ? EXPLICACIONES[codigo] : undefined;

  if (!explicacion) {
    const limpio = texto.split(/\r?\n/)[0].trim();
    return codigo ? `${limpio.slice(0, 200)} (${codigo})` : limpio.slice(0, 200);
  }

  const partes = [explicacion.mensaje];
  if (explicacion.paraElAdministrador) {
    partes.push(`Para el área de Datos y TI: ${explicacion.paraElAdministrador}`);
  }
  return `${partes.join(" ")} (${codigo})`;
}
