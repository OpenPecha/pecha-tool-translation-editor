import { defineConfig, loadEnv } from "vite";
import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const target_url = env.VITE_SERVER_URL || "http://localhost:9000";

  return {
    plugins: [react(), tailwindcss()],
    optimizeDeps: {
      exclude: ["react-icons"],
    },
    server: {
      port: 3000,
      allowedHosts: true,
      proxy: {
        "/api": {
          target: target_url,
          changeOrigin: true,
          secure: false,
        },
        "/projects": {
          target: target_url,
          changeOrigin: true,
          secure: false,
        },
        "/users": {
          target: target_url,
          changeOrigin: true,
          secure: false,
        },
        "/comments": {
          target: target_url,
          changeOrigin: true,
          secure: false,
        },
        "/versions": {
          target: target_url,
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
  };
});
