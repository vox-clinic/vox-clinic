import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    environmentMatchGlobs: [
      ["src/server/**/*.test.ts", "node"],
      ["src/lib/**/*.test.ts", "node"],
      ["src/test/**/*.test.ts", "node"],
    ],
    coverage: {
      reporter: ["text", "html"],
      include: ["src/server/actions/**", "src/lib/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
