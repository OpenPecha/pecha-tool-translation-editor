import { defineConfig } from "vite";
import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    exclude: ["react-icons"],
  },
  server: {
    port: 3000,
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      "/projects": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      "/documents": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      "/users": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      "/comments": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      "/versions": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
