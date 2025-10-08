// Désactive les erreurs TS au build (utile pour déploiement rapide)
process.env.TS_NODE_TRANSPILE_ONLY = "true";
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
import path from 'node:path'



export default defineConfig({
  plugins: [react(), tailwind()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
