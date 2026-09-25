import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// Vite config — https://vitejs.dev/config/
// IMPORTANT: `base` must match the repo name so assets resolve correctly
// at https://sebawa1.github.io/aip-maqueta/
export default defineConfig({
  base: '/aip-maqueta/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
