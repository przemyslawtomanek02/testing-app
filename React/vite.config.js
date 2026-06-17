import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  esbuild: {
    drop: process.env.NODE_ENV === "production" ? ["console", "debugger"] : [],
  },
  publicDir: "public",
  root: ".",
  base: `./`,
  server: {
    allowedHosts: true,
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:443",
        changeOrigin: true,
      },
      "/avatars": {
        target: "http://localhost:443",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "../Server/fastapi_app/frontend",
    emptyOutDir: true,
    minify: true,
  },
});
