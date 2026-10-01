import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Express serves this build at /admin (server/src/static/serveApps.js), so asset
// URLs carry that prefix. In dev, /api is proxied to the Express server.
export default defineConfig({
  base: "/admin/",
  plugins: [react()],
  build: { outDir: "dist", emptyOutDir: true },
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:5060", "/files": "http://localhost:5060" },
  },
});
