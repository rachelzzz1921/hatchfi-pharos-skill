import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "web",
  // Served at <pages>/console/ in production; "./" keeps dev + file:// working.
  base: process.env.PAGES_BASE || "./",
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    fs: {
      allow: [".."],
    },
  },
  build: {
    outDir: "../dist-web",
    emptyOutDir: true,
  },
});
