import { NextResponse, type NextRequest } from "next/server";
import { authorizeUrl, randomToken } from "@/lib/auth/entra";
import { saveLoginFlow } from "@/lib/auth/session";

/** Solo se aceptan destinos internos, para no convertir el login en un redirector abierto. */
function safeReturnTo(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export async function GET(request: NextRequest) {
  const returnTo = safeReturnTo(request.nextUrl.searchParams.get("returnTo"));
  const flow = {
    state: randomToken(),
    nonce: randomToken(),
    verifier: randomToken(),
    returnTo,
  };

  try {
    const url = await authorizeUrl(flow);
    await saveLoginFlow(flow);
    return NextResponse.redirect(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, request.nextUrl.origin));
  }
}
