import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // relative asset paths so the build works from file:// inside Electron
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    port: Number(process.env.PORT) || 5177,
  },
})
