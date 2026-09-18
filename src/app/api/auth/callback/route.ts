import { NextResponse, type NextRequest } from "next/server";
import { exchangeCode, verifyIdToken } from "@/lib/auth/entra";
import { createSession, takeLoginFlow } from "@/lib/auth/session";
import { AuthError, upsertUserFromClaims } from "@/lib/auth/users";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const params = request.nextUrl.searchParams;

  const fail = (message: string) =>
    NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, origin));

  const entraError = params.get("error_description") ?? params.get("error");
  if (entraError) return fail(entraError);

  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state) return fail("La respuesta de Entra ID llegó incompleta.");

  const flow = await takeLoginFlow();
  if (!flow) return fail("La sesión de inicio expiró. Intenta entrar de nuevo.");
  if (flow.state !== state) return fail("El parámetro state no coincide; se descartó la respuesta.");

  try {
    const idToken = await exchangeCode(code, flow.verifier);
    const claims = await verifyIdToken(idToken, flow.nonce);
    const user = await upsertUserFromClaims(claims);
    await createSession(user.id);
    return NextResponse.redirect(new URL(flow.returnTo, origin));
  } catch (error) {
    if (error instanceof AuthError) return fail(error.message);
    console.error("Fallo el inicio de sesion con Entra ID", error);
    return fail("No se pudo completar el inicio de sesión. Revisa la configuración de Entra ID.");
  }
}
