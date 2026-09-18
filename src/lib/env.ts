/**
 * Lectura de configuración. Se evalúa de forma perezosa para que `next build`
 * no exija las credenciales reales: solo se validan cuando se usan.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. Revisa el archivo .env (hay una plantilla en .env.example).`,
    );
  }
  return value;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  get appUrl() {
    return optional("APP_URL", "http://localhost:3000").replace(/\/$/, "");
  },
  get appName() {
    return optional("APP_NAME", "Mesa de ayuda · Cofinet");
  },
  get authSecret() {
    const secret = required("AUTH_SECRET");
    if (secret.length < 32) {
      throw new Error("AUTH_SECRET debe tener al menos 32 caracteres.");
    }
    return secret;
  },
  get entra() {
    return {
      tenantId: required("ENTRA_TENANT_ID"),
      clientId: required("ENTRA_CLIENT_ID"),
      clientSecret: required("ENTRA_CLIENT_SECRET"),
    };
  },
  /** Correos que reciben rol ADMIN automáticamente al iniciar sesión. */
  get adminEmails(): string[] {
    return optional("ADMIN_EMAILS")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  },
  /** Correos que reciben rol AGENTE (equipo de Datos y TI) al iniciar sesión. */
  get agentEmails(): string[] {
    return optional("AGENT_EMAILS")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  },
  /** Dominios permitidos. Vacío = cualquier cuenta del tenant. */
  get allowedDomains(): string[] {
    return optional("ALLOWED_EMAIL_DOMAINS")
      .split(",")
      .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
      .filter(Boolean);
  },
  /** Crea el usuario en el primer inicio de sesión. */
  get autoProvision() {
    return optional("AUTH_AUTO_PROVISION", "true") === "true";
  },
  /** Acceso sin Entra ID, solo para desarrollo local. */
  get devAuthEnabled() {
    return optional("AUTH_DEV_MODE") === "true" && process.env.NODE_ENV !== "production";
  },
  get smtp() {
    return {
      host: optional("SMTP_HOST"),
      port: Number(optional("SMTP_PORT", "587")),
      secure: optional("SMTP_SECURE", "false") === "true",
      user: optional("SMTP_USER"),
      password: optional("SMTP_PASSWORD"),
      from: optional("SMTP_FROM", "Mesa de ayuda <mesadeayuda@cofinet.com.au>"),
    };
  },
  get mailEnabled() {
    return optional("MAIL_ENABLED", "true") === "true" && Boolean(optional("SMTP_HOST"));
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
};
