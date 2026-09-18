import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { isAdmin, isAgent, type Actor } from "@/lib/domain/permissions";
import { readSession } from "./session";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Actor["role"];
  areaId: string | null;
  areaName: string | null;
};

/**
 * Usuario de la petición actual. Se lee de la base en cada petición (y se
 * memoiza por render) para que un cambio de rol o una baja surtan efecto sin
 * esperar a que expire la cookie.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const userId = await readSession();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { area: { select: { name: true } } },
  });

  if (!user || !user.active) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    areaId: user.areaId,
    areaName: user.area?.name ?? null,
  };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAgent(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isAgent(user)) redirect("/?error=sin-permiso");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isAdmin(user)) redirect("/?error=sin-permiso");
  return user;
}
