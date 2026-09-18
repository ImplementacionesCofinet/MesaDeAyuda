import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Sonda para el monitoreo del servidor: responde 200 solo si la base responde. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ estado: "ok", base: "conectada" });
  } catch {
    return NextResponse.json({ estado: "error", base: "sin conexión" }, { status: 503 });
  }
}
