import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    pool: "threads",
    env: { EMAIL_PROVIDER: "none" },
    include: ["scripts/*.spec.ts"]
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname)
    }
  }
});
