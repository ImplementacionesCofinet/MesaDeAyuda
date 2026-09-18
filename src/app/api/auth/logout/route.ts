import { NextResponse, type NextRequest } from "next/server";
import { logoutUrl } from "@/lib/auth/entra";
import { destroySession } from "@/lib/auth/session";
import { env } from "@/lib/env";

export async function POST(request: NextRequest) {
  await destroySession();
  if (env.devAuthEnabled) {
    return NextResponse.redirect(new URL("/login", request.nextUrl.origin), { status: 303 });
  }
  try {
    return NextResponse.redirect(await logoutUrl(), { status: 303 });
  } catch {
    return NextResponse.redirect(new URL("/login", request.nextUrl.origin), { status: 303 });
  }
}
