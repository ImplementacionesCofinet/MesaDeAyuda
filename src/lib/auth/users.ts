import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import type { EntraClaims } from "./entra";

export class AuthError extends Error {}

/** Rol que corresponde a un correo según la configuración del despliegue. */
export function roleForEmail(email: string): Role | null {
  const normalized = email.toLowerCase();
  if (env.adminEmails.includes(normalized)) return "ADMIN";
  if (env.agentEmails.includes(normalized)) return "AGENTE";
  return null;
}

function domainAllowed(email: string): boolean {
  const domains = env.allowedDomains;
  if (domains.length === 0) return true;
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return domains.includes(domain);
}

/**
 * Crea o actualiza al usuario después de un inicio de sesión válido.
 * El rol configurado (ADMIN/AGENTE) siempre gana sobre el almacenado, para que
 * dar o quitar acceso al equipo sea un cambio de variable de entorno.
 */
export async function upsertUserFromClaims(claims: EntraClaims) {
  if (!domainAllowed(claims.email)) {
    throw new AuthError("Tu cuenta no pertenece a un dominio autorizado para la mesa de ayuda.");
  }

  const existing =
    (await prisma.user.findUnique({ where: { entraOid: claims.oid } })) ??
    (await prisma.user.findUnique({ where: { email: claims.email } }));

  const configuredRole = roleForEmail(claims.email);

  if (!existing) {
    if (!env.autoProvision) {
      throw new AuthError("Tu usuario no está dado de alta en la mesa de ayuda. Solicítalo al área de Datos y TI.");
    }
    return prisma.user.create({
      data: {
        email: claims.email,
        name: claims.name,
        entraOid: claims.oid,
        role: configuredRole ?? "SOLICITANTE",
        lastLogin: new Date(),
      },
    });
  }

  if (!existing.active) {
    throw new AuthError("Tu usuario está inactivo en la mesa de ayuda. Contacta al área de Datos y TI.");
  }

  return prisma.user.update({
    where: { id: existing.id },
    data: {
      name: claims.name,
      email: claims.email,
      entraOid: claims.oid,
      lastLogin: new Date(),
      ...(configuredRole ? { role: configuredRole } : {}),
    },
  });
}
