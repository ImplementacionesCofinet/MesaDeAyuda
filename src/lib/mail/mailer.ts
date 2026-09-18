import nodemailer, { type Transporter } from "nodemailer";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    const { host, port, secure, user, password } = env.smtp;
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass: password } : undefined,
    });
  }
  return transporter;
}

export type Mail = {
  to: string[];
  subject: string;
  html: string;
  text: string;
  /** Nombre del evento que originó el correo; queda en la bitácora. */
  event: string;
  ticketId?: string;
};

/**
 * Envía el correo y deja registro del resultado. Nunca lanza: una falla de SMTP
 * no puede tumbar la operación que la disparó (crear o actualizar un ticket).
 */
export async function sendMail(mail: Mail): Promise<void> {
  const recipients = [...new Set(mail.to.filter(Boolean))];
  if (recipients.length === 0) return;

  if (!env.mailEnabled) {
    await logMail(mail, recipients, "OMITIDO", "MAIL_ENABLED=false o SMTP_HOST sin configurar");
    return;
  }

  try {
    await getTransporter().sendMail({
      from: env.smtp.from,
      to: recipients.join(", "),
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
    await logMail(mail, recipients, "ENVIADO");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`No se pudo enviar el correo "${mail.subject}":`, message);
    await logMail(mail, recipients, "FALLIDO", message);
  }
}

async function logMail(
  mail: Mail,
  recipients: string[],
  status: "ENVIADO" | "FALLIDO" | "OMITIDO",
  error?: string,
): Promise<void> {
  try {
    await prisma.emailLog.create({
      data: {
        ticketId: mail.ticketId ?? null,
        to: recipients.join(", "),
        subject: mail.subject,
        event: mail.event,
        status,
        error: error ?? null,
      },
    });
  } catch (logError) {
    console.error("No se pudo registrar el envío de correo:", logError);
  }
}
