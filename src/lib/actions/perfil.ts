"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import type { ActionResult } from "./tickets";

const schema = z.object({ areaId: z.string().min(1, "Selecciona tu área.") });

/**
 * El área se elige una sola vez, en el primer ingreso.
 *
 * No se permite cambiarla después porque el área define qué requerimientos ve
 * cada persona: cambiarla a voluntad sería una forma de ver los de otra área.
 * Los traslados los hace un administrador desde la administración.
 */
export async function elegirArea(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();

  if (user.areaId) {
    return { ok: false, error: "Tu área ya está asignada. Si cambiaste de área, pídele el traslado a Datos y TI." };
  }

  const parsed = schema.safeParse({ areaId: formData.get("areaId") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const area = await prisma.area.findFirst({ where: { id: parsed.data.areaId, active: true } });
  if (!area) {
    return { ok: false, error: "Esa área no está disponible. Elige otra o avísale a Datos y TI." };
  }

  await prisma.user.update({ where: { id: user.id }, data: { areaId: area.id } });

  revalidatePath("/", "layout");
  redirect("/");
}
