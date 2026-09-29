import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'exercises.json'],
      manifest: {
        name: 'GymTracker - Scheda Allenamento',
        short_name: 'GymTracker',
        description: 'Gestisci le tue schede di allenamento e registra i tuoi carichi in palestra.',
        theme_color: '#030712',
        background_color: '#030712',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'https://cdn-icons-png.flaticon.com/512/2964/2964514.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'https://cdn-icons-png.flaticon.com/512/2964/2964514.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})