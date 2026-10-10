// frontend/vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // <- ito ang nagpapagana ng Tailwind CSS
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "https://absenteeism-late-report-and-excuse.onrender.com",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
