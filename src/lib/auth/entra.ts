import { createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "@/lib/env";

/**
 * Inicio de sesión contra Microsoft Entra ID con el flujo Authorization Code +
 * PKCE. Solo se piden los alcances de identidad (openid, profile, email); la
 * mesa de ayuda nunca pide permisos sobre datos del usuario.
 */

type Discovery = {
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  issuer: string;
  end_session_endpoint?: string;
};

let discoveryCache: { value: Discovery; fetchedAt: number } | null = null;
const DISCOVERY_TTL_MS = 12 * 60 * 60 * 1000;

export async function discover(): Promise<Discovery> {
  if (discoveryCache && Date.now() - discoveryCache.fetchedAt < DISCOVERY_TTL_MS) {
    return discoveryCache.value;
  }
  const url = `https://login.microsoftonline.com/${env.entra.tenantId}/v2.0/.well-known/openid-configuration`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo leer la configuración de Entra ID (HTTP ${response.status}).`);
  }
  const value = (await response.json()) as Discovery;
  discoveryCache = { value, fetchedAt: Date.now() };
  return value;
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

async function keySet() {
  if (!jwks) {
    const { jwks_uri } = await discover();
    jwks = createRemoteJWKSet(new URL(jwks_uri));
  }
  return jwks;
}

export function redirectUri(): string {
  return `${env.appUrl}/api/auth/callback`;
}

export function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

export function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export async function authorizeUrl(params: { state: string; nonce: string; verifier: string }): Promise<string> {
  const { authorization_endpoint } = await discover();
  const url = new URL(authorization_endpoint);
  url.searchParams.set("client_id", env.entra.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri());
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", "openid profile email");
  url.searchParams.set("state", params.state);
  url.searchParams.set("nonce", params.nonce);
  url.searchParams.set("code_challenge", pkceChallenge(params.verifier));
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export async function exchangeCode(code: string, verifier: string): Promise<string> {
  const { token_endpoint } = await discover();
  const body = new URLSearchParams({
    client_id: env.entra.clientId,
    client_secret: env.entra.clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(),
    code_verifier: verifier,
    scope: "openid profile email",
  });

  const response = await fetch(token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const payload = (await response.json()) as { id_token?: string; error_description?: string };
  if (!response.ok || !payload.id_token) {
    throw new Error(payload.error_description ?? "Entra ID no devolvió un id_token válido.");
  }
  return payload.id_token;
}

export type EntraClaims = { oid: string; email: string; name: string };

export async function verifyIdToken(idToken: string, nonce: string): Promise<EntraClaims> {
  const { issuer } = await discover();
  const { payload } = await jwtVerify(idToken, await keySet(), {
    issuer,
    audience: env.entra.clientId,
  });

  if (payload.nonce !== nonce) {
    throw new Error("El nonce del id_token no coincide con el de la solicitud.");
  }

  const claims = payload as Record<string, unknown>;
  const email =
    (typeof claims.email === "string" && claims.email) ||
    (typeof claims.preferred_username === "string" && claims.preferred_username) ||
    (typeof claims.upn === "string" && claims.upn) ||
    "";

  if (!email) {
    throw new Error("La cuenta no expone un correo electrónico; revisa los claims opcionales de la aplicación en Entra ID.");
  }

  return {
    oid: typeof claims.oid === "string" ? claims.oid : String(payload.sub),
    email: email.toLowerCase(),
    name: typeof claims.name === "string" ? claims.name : email,
  };
}

export async function logoutUrl(): Promise<string> {
  const discovery = await discover();
  const base =
    discovery.end_session_endpoint ??
    `https://login.microsoftonline.com/${env.entra.tenantId}/oauth2/v2.0/logout`;
  return `${base}?post_logout_redirect_uri=${encodeURIComponent(env.appUrl + "/login")}`;
}
