import { defineConfig, devices } from "@playwright/test";

// Testes de ponta a ponta: npm run test:e2e (prepara o banco de teste, faz o build e roda os testes).
const BANCO = process.env.DATABASE_URL_TESTE ?? "postgres://fiscaliza:fiscaliza@localhost:5432/fiscaliza_teste";
const PORTA = 3210;

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { baseURL: `http://localhost:${PORTA}`, trace: "retain-on-failure" },
  projects: [{ name: "celular", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command: `npx next start -p ${PORTA}`,
    url: `http://localhost:${PORTA}`,
    timeout: 60_000,
    reuseExistingServer: false,
    env: { DATABASE_URL: BANCO, AUTH_SECRET: "e2e", AUTH_TRUST_HOST: "true", APP_URL: `http://localhost:${PORTA}` },
  },
});
