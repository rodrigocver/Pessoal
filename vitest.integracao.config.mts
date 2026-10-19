import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Testes que usam um Postgres real: npm run test:integracao (veja tests/integracao/preparar.ts).
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/integracao/**/*.test.ts"],
    setupFiles: ["tests/integracao/preparar.ts"],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
