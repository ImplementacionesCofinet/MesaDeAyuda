"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import type { ActionResult } from "./tickets";

const nameSchema = z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres.").max(80);

export async function saveArea(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const active = formData.get("active") !== "false";
  try {
    if (id) {
      await prisma.area.update({ where: { id }, data: { name: parsed.data, active } });
    } else {
      await prisma.area.create({ data: { name: parsed.data } });
    }
  } catch {
    return { ok: false, error: "Ya existe un área con ese nombre." };
  }

  revalidatePath("/admin");
  return { ok: true };
}

export async function saveCategory(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const description = String(formData.get("description") ?? "").trim() || null;
  const active = formData.get("active") !== "false";

  try {
    if (id) {
      await prisma.category.update({ where: { id }, data: { name: parsed.data, description, active } });
    } else {
      const last = await prisma.category.findFirst({ orderBy: { position: "desc" }, select: { position: true } });
      await prisma.category.create({
        data: { name: parsed.data, description, position: (last?.position ?? 0) + 1 },
      });
    }
  } catch {
    return { ok: false, error: "Ya existe una categoría con ese nombre." };
  }

  revalidatePath("/admin");
  revalidatePath("/tickets/nuevo");
  return { ok: true };
}

const userSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["SOLICITANTE", "AGENTE", "ADMIN"]),
  areaId: z.string().transform((v) => (v ? v : null)).nullable(),
  active: z.boolean(),
});

export async function saveUser(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = userSchema.safeParse({
    id: formData.get("id"),
    role: formData.get("role"),
    areaId: formData.get("areaId") ?? "",
    active: formData.get("active") !== "false",
  });
  if (!parsed.success) return { ok: false, error: "Revisa los datos del usuario." };

  // Evita que un administrador se quite a sí mismo el acceso y deje la mesa sin quién la administre.
  if (parsed.data.id === admin.id && (parsed.data.role !== "ADMIN" || !parsed.data.active)) {
    return { ok: false, error: "No puedes quitarte a ti mismo el rol de administrador." };
  }

  await prisma.user.update({
    where: { id: parsed.data.id },
    data: { role: parsed.data.role, areaId: parsed.data.areaId, active: parsed.data.active },
  });

  revalidatePath("/admin");
  return { ok: true };
}

const slaSchema = z.object({
  priority: z.enum(["ALTA", "MEDIA", "BAJA"]),
  responseHours: z.coerce.number().int().min(0).max(2000).nullable(),
  resolutionHours: z.coerce.number().int().min(0).max(2000).nullable(),
  agreed: z.boolean(),
});

/**
 * Acuerdos de tiempo por prioridad. Mientras `agreed` sea false la mesa muestra
 * "Por acordar" y no compromete fechas automáticas.
 */
export async function saveSla(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const rawResponse = String(formData.get("responseHours") ?? "").trim();
  const rawResolution = String(formData.get("resolutionHours") ?? "").trim();

  const parsed = slaSchema.safeParse({
    priority: formData.get("priority"),
    responseHours: rawResponse === "" ? null : rawResponse,
    resolutionHours: rawResolution === "" ? null : rawResolution,
    agreed: formData.get("agreed") === "on",
  });
  if (!parsed.success) return { ok: false, error: "Las horas deben ser números enteros." };

  if (parsed.data.agreed && !parsed.data.resolutionHours) {
    return { ok: false, error: "Para formalizar el acuerdo indica las horas de solución." };
  }

  await prisma.slaPolicy.update({
    where: { priority: parsed.data.priority },
    data: {
      responseHours: parsed.data.responseHours,
      resolutionHours: parsed.data.resolutionHours,
      agreed: parsed.data.agreed,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/tickets");
  return { ok: true };
}
