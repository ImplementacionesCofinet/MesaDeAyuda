import { describe, expect, it } from "vitest";
import { codigoEntra, explicarErrorEntra } from "./errores";

describe("errores de Entra ID", () => {
  it("encuentra el código dentro del texto de Microsoft", () => {
    expect(codigoEntra("AADSTS50011: The redirect URI ... Trace ID: abc")).toBe("AADSTS50011");
    expect(codigoEntra("algo sin código")).toBeNull();
  });

  it("explica en español y dice quién lo arregla", () => {
    const mensaje = explicarErrorEntra("AADSTS50011: The redirect URI specified does not match");
    expect(mensaje).toContain("no está registrada en Entra ID");
    expect(mensaje).toContain("Para el área de Datos y TI");
    expect(mensaje).toContain("AADSTS50011");
  });

  it("distingue el secreto incorrecto del secreto vencido", () => {
    expect(explicarErrorEntra("AADSTS7000215: Invalid client secret provided")).toContain("columna Valor");
    expect(explicarErrorEntra("AADSTS7000222: The provided client secret keys are expired")).toContain("vencido");
  });

  it("no oculta la causa cuando el código no está contemplado", () => {
    const mensaje = explicarErrorEntra("AADSTS99999: algo inesperado ocurrió\nTrace ID: x");
    expect(mensaje).toContain("algo inesperado ocurrió");
    expect(mensaje).toContain("AADSTS99999");
  });

  it("se queda con la primera línea y acota la longitud", () => {
    const mensaje = explicarErrorEntra(`${"x".repeat(400)}\nsegunda línea`);
    expect(mensaje.length).toBeLessThanOrEqual(200);
    expect(mensaje).not.toContain("segunda línea");
  });
});
