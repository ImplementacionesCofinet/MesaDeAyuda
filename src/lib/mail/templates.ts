import { env } from "@/lib/env";
import { PRIORITY_LABEL, STATUS_HINT, STATUS_LABEL } from "@/lib/domain/status";
import type { Priority, TicketStatus } from "@prisma/client";

export type TicketMailData = {
  code: string;
  title: string;
  status: TicketStatus;
  priority: Priority;
  stage: string | null;
  pendingAction: string | null;
  areaName: string;
  categoryName: string;
  requesterName: string;
  assigneeName: string | null;
  requestedAt: Date;
  dueDate: Date | null;
};

// Paleta institucional de Cofinet, en línea con la interfaz.
const BG = "#F0E7DF";
const INK = "#2D3733";
const ACCENT = "#0F4B42";
const ACCENT_ALT = "#671741";
const MUTED = "#4E5D59";

export function formatDate(date: Date | null): string {
  if (!date) return "Por definir";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: process.env.APP_DISPLAY_TIMEZONE ?? "America/Bogota",
  }).format(date);
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 16px 6px 0;color:${MUTED};font-size:13px;white-space:nowrap;vertical-align:top">${label}</td>
    <td style="padding:6px 0;color:${INK};font-size:14px;font-weight:600">${escape(value)}</td>
  </tr>`;
}

export function escape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Cuerpo común: encabezado, mensaje, ficha del ticket y enlace. */
export function ticketEmail(params: {
  headline: string;
  intro: string;
  ticket: TicketMailData;
  extra?: { label: string; body: string };
}): { html: string; text: string } {
  const { headline, intro, ticket, extra } = params;
  const url = `${env.appUrl}/tickets/${ticket.code}`;

  const extraBlock = extra
    ? `<div style="margin:20px 0;padding:14px 16px;background:#FDFAF7;border-left:3px solid ${ACCENT_ALT};border-radius:4px">
         <div style="color:${MUTED};font-size:12px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">${escape(extra.label)}</div>
         <div style="color:${INK};font-size:14px;line-height:1.5;white-space:pre-wrap">${escape(extra.body)}</div>
       </div>`
    : "";

  const html = `<!doctype html>
<html lang="es"><body style="margin:0;padding:24px;background:${BG};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" style="max-width:620px;margin:0 auto;background:#FDFAF7;border:1px solid #E0D2C4;border-radius:10px">
    <tr><td style="padding:28px 32px">
      <div style="color:${ACCENT_ALT};font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:700">Mesa de ayuda · Datos y TI</div>
      <h1 style="margin:10px 0 4px;color:${INK};font-size:21px;font-weight:600">${escape(headline)}</h1>
      <p style="margin:0 0 18px;color:${MUTED};font-size:14px;line-height:1.5">${escape(intro)}</p>

      <div style="padding:14px 16px;background:${BG};border-radius:8px">
        <div style="color:${ACCENT};font-size:13px;font-weight:700">${escape(ticket.code)}</div>
        <div style="color:${INK};font-size:16px;font-weight:600;margin-top:2px">${escape(ticket.title)}</div>
      </div>

      ${extraBlock}

      <table role="presentation" style="margin-top:18px;width:100%;border-collapse:collapse">
        ${row("Estado", `${STATUS_LABEL[ticket.status]} — ${STATUS_HINT[ticket.status]}`)}
        ${row("Etapa del proceso", ticket.stage ?? "Sin detallar")}
        ${row("Qué falta", ticket.pendingAction ?? "Nada pendiente del área")}
        ${row("Prioridad", PRIORITY_LABEL[ticket.priority])}
        ${row("Categoría", ticket.categoryName)}
        ${row("Área solicitante", ticket.areaName)}
        ${row("Solicitante", ticket.requesterName)}
        ${row("Responsable", ticket.assigneeName ?? "Por asignar")}
        ${row("Fecha de solicitud", formatDate(ticket.requestedAt))}
        ${row("Fecha estimada de cierre", formatDate(ticket.dueDate))}
      </table>

      <p style="margin:26px 0 0">
        <a href="${url}" style="display:inline-block;background:${ACCENT};color:#FFFFFF;text-decoration:none;padding:11px 20px;border-radius:6px;font-size:14px;font-weight:600">Ver el requerimiento</a>
      </p>
      <p style="margin:22px 0 0;color:${MUTED};font-size:12px;line-height:1.5">
        Este mensaje se generó automáticamente desde la mesa de ayuda. No respondas a este correo: escribe en el ticket para que quede en el historial.
      </p>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    headline,
    intro,
    "",
    `${ticket.code} — ${ticket.title}`,
    `Estado: ${STATUS_LABEL[ticket.status]}`,
    `Etapa del proceso: ${ticket.stage ?? "Sin detallar"}`,
    `Qué falta: ${ticket.pendingAction ?? "Nada pendiente del área"}`,
    `Prioridad: ${PRIORITY_LABEL[ticket.priority]}`,
    `Categoría: ${ticket.categoryName}`,
    `Área solicitante: ${ticket.areaName}`,
    `Solicitante: ${ticket.requesterName}`,
    `Responsable: ${ticket.assigneeName ?? "Por asignar"}`,
    `Fecha de solicitud: ${formatDate(ticket.requestedAt)}`,
    `Fecha estimada de cierre: ${formatDate(ticket.dueDate)}`,
    extra ? `\n${extra.label}:\n${extra.body}` : "",
    "",
    url,
  ]
    .filter(Boolean)
    .join("\n");

  return { html, text };
}
