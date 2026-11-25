import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

const disableHmr = process.env.DISABLE_HMR === "true" || Boolean(process.env.K_SERVICE);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(currentDir, "."),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
    ws: disableHmr ? false : undefined,
    hmr: !disableHmr,
    watch: disableHmr ? null : {},
  },
});
