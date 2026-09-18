import { describe, expect, it } from "vitest";
import { allowedTransitions, canTransition, isOpen, STATUS_LABEL, STATUS_ORDER } from "./status";

describe("transiciones de estado", () => {
  it("permite quedarse en el mismo estado", () => {
    expect(canTransition("EN_DESARROLLO", "EN_DESARROLLO")).toBe(true);
  });

  it("bloquea saltos que dejarían el historial sin sentido", () => {
    expect(canTransition("NUEVO", "ENTREGADO")).toBe(false);
    expect(canTransition("NUEVO", "CERRADO")).toBe(false);
    expect(canTransition("CERRADO", "CANCELADO")).toBe(false);
  });

  it("permite el avance normal del flujo", () => {
    expect(canTransition("NUEVO", "EN_ANALISIS")).toBe(true);
    expect(canTransition("EN_ANALISIS", "EN_DESARROLLO")).toBe(true);
    expect(canTransition("EN_DESARROLLO", "EN_PRUEBAS")).toBe(true);
    expect(canTransition("EN_PRUEBAS", "ENTREGADO")).toBe(true);
    expect(canTransition("ENTREGADO", "CERRADO")).toBe(true);
  });

  it("permite reabrir un ticket cerrado o cancelado", () => {
    expect(canTransition("CERRADO", "EN_ANALISIS")).toBe(true);
    expect(canTransition("CANCELADO", "EN_ANALISIS")).toBe(true);
  });

  it("nunca ofrece el estado actual entre las transiciones", () => {
    for (const status of STATUS_ORDER) {
      expect(allowedTransitions(status)).not.toContain(status);
    }
  });

  it("solo cerrado y cancelado dejan de estar abiertos", () => {
    expect(isOpen("ENTREGADO")).toBe(true);
    expect(isOpen("CERRADO")).toBe(false);
    expect(isOpen("CANCELADO")).toBe(false);
  });

  it("cada estado tiene etiqueta en español", () => {
    for (const status of STATUS_ORDER) {
      expect(STATUS_LABEL[status]).toBeTruthy();
    }
  });
});
