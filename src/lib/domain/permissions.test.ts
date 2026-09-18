import { describe, expect, it } from "vitest";
import { canCreateInternalTicket, canEditRequest, canManageTicket, canSeeInternalNotes, canViewTicket, type Actor, type TicketRef } from "./permissions";

const agente: Actor = { id: "u-ti", role: "AGENTE", areaId: "a-ti" };
const admin: Actor = { id: "u-admin", role: "ADMIN", areaId: "a-ti" };
const contable: Actor = { id: "u-conta", role: "SOLICITANTE", areaId: "a-conta" };
const companero: Actor = { id: "u-conta-2", role: "SOLICITANTE", areaId: "a-conta" };
const comercial: Actor = { id: "u-com", role: "SOLICITANTE", areaId: "a-com" };
const sinArea: Actor = { id: "u-sin", role: "SOLICITANTE", areaId: null };

const ticket: TicketRef = { requesterId: "u-conta", areaId: "a-conta", assigneeId: "u-ti", origin: "AREA" };
const interno: TicketRef = { requesterId: "u-ti", areaId: "a-ti", assigneeId: "u-ti", origin: "INTERNO" };

describe("visibilidad", () => {
  it("Datos y TI ve todo", () => {
    expect(canViewTicket(agente, ticket)).toBe(true);
    expect(canViewTicket(admin, ticket)).toBe(true);
  });

  it("el solicitante y su área ven el ticket", () => {
    expect(canViewTicket(contable, ticket)).toBe(true);
    expect(canViewTicket(companero, ticket)).toBe(true);
  });

  it("otra área no ve el ticket", () => {
    expect(canViewTicket(comercial, ticket)).toBe(false);
  });

  it("una persona sin área no ve tickets ajenos", () => {
    expect(canViewTicket(sinArea, ticket)).toBe(false);
  });

  it("las iniciativas internas son visibles para todos: muestran la carga del área", () => {
    expect(canViewTicket(comercial, interno)).toBe(true);
    expect(canViewTicket(sinArea, interno)).toBe(true);
  });
});

describe("gestión", () => {
  it("solo Datos y TI mueve el ticket", () => {
    expect(canManageTicket(agente, ticket)).toBe(true);
    expect(canManageTicket(contable, ticket)).toBe(false);
  });

  it("el solicitante corrige su solicitud solo mientras está nueva", () => {
    expect(canEditRequest(contable, ticket, "NUEVO")).toBe(true);
    expect(canEditRequest(contable, ticket, "EN_DESARROLLO")).toBe(false);
    expect(canEditRequest(companero, ticket, "NUEVO")).toBe(false);
    expect(canEditRequest(agente, ticket, "EN_DESARROLLO")).toBe(true);
  });

  it("las notas internas no salen de Datos y TI", () => {
    expect(canSeeInternalNotes(agente)).toBe(true);
    expect(canSeeInternalNotes(contable)).toBe(false);
  });

  it("solo Datos y TI registra iniciativas internas", () => {
    expect(canCreateInternalTicket(agente)).toBe(true);
    expect(canCreateInternalTicket(contable)).toBe(false);
  });
});
