import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: { 
    historyApiFallback: true,
    allowedHosts: ['openmedat.rndserver.cc'] // Falls im Dev-Modus blockiert
  },
  preview: {
    allowedHosts: ['openmedat.rndserver.cc'] // Falls im Preview-Modus blockiert
  }
})
