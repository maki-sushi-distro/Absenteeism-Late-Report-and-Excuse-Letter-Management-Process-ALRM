// frontend/vite.config.js
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import process from "node:process";
import { cookieGatewayPlugin } from "./server/viteGateway.js";

export default defineConfig(({ mode }) => ({
  plugins: [
    cookieGatewayPlugin(loadEnv(mode, import.meta.dirname, "")),
    react(),
    tailwindcss(), // <- ito ang nagpapagana ng Tailwind CSS
    {
      name: "isolate-middleware-cache",
      config(config) {
        // SSR test servers must never overwrite the running browser server's deps.
        if (config.server?.middlewareMode) {
          return { cacheDir: path.resolve(import.meta.dirname, "node_modules/.vite-tests", String(process.pid)) };
        }
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
}));
