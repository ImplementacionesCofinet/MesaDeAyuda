import { NextResponse, type NextRequest } from "next/server";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

/**
 * Acceso de desarrollo sin Entra ID. Requiere AUTH_DEV_MODE=true y nunca se
 * habilita con NODE_ENV=production.
 */
export async function POST(request: NextRequest) {
  if (!env.devAuthEnabled) {
    return NextResponse.json({ error: "No disponible." }, { status: 404 });
  }

  const form = await request.formData();
  const email = String(form.get("email") ?? "").toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.active) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("Usuario de prueba no encontrado.")}`, request.nextUrl.origin),
      { status: 303 },
    );
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
  await createSession(user.id);
  return NextResponse.redirect(new URL("/", request.nextUrl.origin), { status: 303 });
}
