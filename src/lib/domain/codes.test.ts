import { describe, expect, it } from "vitest";
import { formatTicketCode, normalizeTicketCode, parseTicketCode } from "./codes";

describe("códigos de ticket", () => {
  it("formatea con cuatro dígitos", () => {
    expect(formatTicketCode(2026, 1)).toBe("MA-2026-0001");
    expect(formatTicketCode(2026, 1234)).toBe("MA-2026-1234");
    expect(formatTicketCode(2026, 12345)).toBe("MA-2026-12345");
  });

  it("interpreta lo que el usuario escribe en el buscador", () => {
    expect(normalizeTicketCode("MA-2026-0042")).toBe("MA-2026-0042");
    expect(normalizeTicketCode("ma 2026 42")).toBe("MA-2026-0042");
    expect(normalizeTicketCode("2026-42")).toBe("MA-2026-0042");
    expect(normalizeTicketCode("hola")).toBeNull();
  });

  it("parsea y rechaza formatos inválidos", () => {
    expect(parseTicketCode("MA-2026-0042")).toEqual({ year: 2026, sequence: 42 });
    expect(parseTicketCode("XX-2026-0042")).toBeNull();
  });
});
