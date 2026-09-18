import { expect, test, type Page } from "@playwright/test";

/**
 * Recorre el ciclo completo que promete la propuesta: un área registra su
 * requerimiento, Datos y TI lo actualiza y el área ve el avance sin preguntar.
 */

const SOLICITANTE = "demo.contabilidad@cofinet.com.au";
const AGENTE = "demo.analista@cofinet.com.au";

async function entrar(page: Page, email: string) {
  await page.goto("/login");
  await page.selectOption('select[name="email"]', email);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("/");
}

async function salir(page: Page) {
  await page.getByRole("button", { name: "Salir" }).click();
  await page.waitForURL(/\/login/);
}

test("del registro del área al cierre confirmado", async ({ page }) => {
  const asunto = `Reporte de cartera por vendedor ${Date.now()}`;

  // 1. El área registra su requerimiento.
  await entrar(page, SOLICITANTE);
  await page.getByRole("link", { name: "Nuevo requerimiento" }).click();
  await page.getByLabel("Asunto").fill(asunto);
  await page
    .getByLabel("Descripción")
    .fill("Necesitamos un reporte mensual de cartera abierta por vendedor, con corte al último día del mes.");
  await page.selectOption('select[name="categoryId"]', { label: "Reportes e información" });
  await page.getByText("Media", { exact: true }).click();
  await page.getByRole("button", { name: "Registrar requerimiento" }).click();

  await page.waitForURL(/\/tickets\/MA-/);
  const codigo = new URL(page.url()).pathname.split("/").pop()!;
  expect(codigo).toMatch(/^MA-\d{4}-\d{4}$/);

  // El ticket nace visible: estado, fecha de solicitud y ficha completa.
  await expect(page.getByRole("heading", { name: asunto })).toBeVisible();
  await expect(page.getByText("Nuevo", { exact: true })).toBeVisible();
  await expect(page.getByText("Fecha de solicitud")).toBeVisible();
  await salir(page);

  // 2. Datos y TI lo toma, lo mueve de estado y dice en qué va.
  await entrar(page, AGENTE);
  await page.goto(`/tickets/${codigo}`);
  await page.selectOption('select[name="status"]', "EN_ANALISIS");
  await page.getByLabel("Etapa del proceso").fill("Levantando la definición del reporte con Contabilidad");
  await page.getByLabel("Qué falta").fill("Confirmar los cortes de fecha");
  await page.getByLabel("Nota para el área").fill("Arrancamos hoy; te confirmamos el alcance esta semana.");
  await page.getByRole("button", { name: "Guardar y notificar" }).click();
  await expect(page.getByText("Cambios guardados", { exact: false })).toBeVisible();

  // 3. Lo entrega.
  await page.selectOption('select[name="status"]', "ENTREGADO");
  await page.getByRole("button", { name: "Guardar y notificar" }).click();
  await expect(page.getByText("Cambios guardados", { exact: false })).toBeVisible();
  await salir(page);

  // 4. El área ve el avance y confirma la entrega.
  await entrar(page, SOLICITANTE);
  await page.goto(`/tickets/${codigo}`);
  // La etapa aparece en la ficha y en el historial: basta con la primera.
  await expect(page.getByText("Levantando la definición del reporte con Contabilidad").first()).toBeVisible();
  await expect(page.getByText("Entregado al área, pendiente de confirmación")).toBeVisible();

  await page.getByRole("button", { name: "Confirmar la entrega y cerrar" }).click();
  // Al cerrarse, el bloque de confirmación desaparece y la ficha pasa a "Cerrado".
  await expect(page.getByText("Confirmado y cerrado")).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirmar la entrega y cerrar" })).toHaveCount(0);

  // 5. El historial cuenta la trazabilidad completa.
  await page.reload();
  await expect(page.getByText("registró el requerimiento", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("cambió el estado de Nuevo a En análisis", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("cerró el requerimiento", { exact: false }).first()).toBeVisible();
});

test("el área no ve los requerimientos de otras áreas", async ({ page }) => {
  await entrar(page, SOLICITANTE);
  const respuesta = await page.goto(`/tickets/MA-${new Date().getFullYear()}-9001`);
  expect(respuesta?.status()).toBe(404);
});
