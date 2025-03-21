import { defineConfig } from 'vite'
import path from "path"
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps:{
    exclude:["react-icons"]
  },
  server:{
    port:3000,
  allowedHosts:true
  }, resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  
})
