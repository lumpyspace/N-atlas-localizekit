import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Minimal Vite config. The dev server proxies /api to the backend so the
// frontend can call the REST API without CORS fuss during development.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      "/api": {
        target: "http://localhost:8788",
        changeOrigin: true,
      },
    },
  },
});
