import path from "path"
import { fileURLToPath } from "url"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  base: command === 'build' ? '/FXRScout/' : '/', // Dynamically set base path for GitHub Pages subdirectory slug compatibility
  server: {
    port: 5001, // Serve the local dashboard on port 5001
  },
}))
