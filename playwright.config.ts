import { defineConfig } from "@playwright/test";

/**
 * Prueba de humo sobre la aplicación real. Requiere la base de datos con los
 * datos de ejemplo (npm run db:seed con SEED_DEMO=true) y AUTH_DEV_MODE=true,
 * porque entra sin pasar por Entra ID.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    locale: "es-CO",
    // E2E_CHROMIUM_PATH permite usar un Chromium ya instalado en el servidor
    // en vez de descargarlo con `npx playwright install`.
    launchOptions: process.env.E2E_CHROMIUM_PATH ? { executablePath: process.env.E2E_CHROMIUM_PATH } : {},
  },
});
