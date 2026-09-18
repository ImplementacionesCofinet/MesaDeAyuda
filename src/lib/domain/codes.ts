/** Prefijo de los códigos de ticket: MA-2026-0042. */
export const TICKET_PREFIX = "MA";

export function formatTicketCode(year: number, sequence: number): string {
  return `${TICKET_PREFIX}-${year}-${String(sequence).padStart(4, "0")}`;
}

export function parseTicketCode(code: string): { year: number; sequence: number } | null {
  const match = /^MA-(\d{4})-(\d{1,6})$/i.exec(code.trim());
  if (!match) return null;
  return { year: Number(match[1]), sequence: Number(match[2]) };
}

/** Normaliza lo que el usuario escribe en el buscador ("ma 2026 42" → MA-2026-0042). */
export function normalizeTicketCode(input: string): string | null {
  const digits = input.trim().replace(/^ma[\s-]*/i, "").replace(/[\s-]+/g, "-");
  const parsed = parseTicketCode(`MA-${digits}`) ?? parseTicketCode(input);
  return parsed ? formatTicketCode(parsed.year, parsed.sequence) : null;
}
