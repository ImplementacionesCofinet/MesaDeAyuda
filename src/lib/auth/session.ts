import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { env } from "@/lib/env";

export const SESSION_COOKIE = "ma_session";
const SESSION_HOURS = 8;

function key(): Uint8Array {
  return new TextEncoder().encode(env.authSecret);
}

/** La cookie solo guarda el id del usuario: rol y área se leen de la base en cada petición. */
export async function createSession(userId: string): Promise<void> {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(key());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export async function readSession(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return typeof payload.uid === "string" ? payload.uid : null;
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Cookie temporal que transporta state, nonce y verificador PKCE del login. */
const FLOW_COOKIE = "ma_oidc_flow";

export type LoginFlow = { state: string; nonce: string; verifier: string; returnTo: string };

export async function saveLoginFlow(flow: LoginFlow): Promise<void> {
  const token = await new SignJWT({ ...flow })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(key());

  const store = await cookies();
  store.set(FLOW_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    path: "/",
    maxAge: 600,
  });
}

export async function takeLoginFlow(): Promise<LoginFlow | null> {
  const store = await cookies();
  const token = store.get(FLOW_COOKIE)?.value;
  store.delete(FLOW_COOKIE);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    const { state, nonce, verifier, returnTo } = payload as Record<string, unknown>;
    if (typeof state !== "string" || typeof nonce !== "string" || typeof verifier !== "string") return null;
    return { state, nonce, verifier, returnTo: typeof returnTo === "string" ? returnTo : "/" };
  } catch {
    return null;
  }
}
