import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/KeyTrack/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg'],
      workbox: {
        maximumFileSizeToCacheInBytes: 4000000, // Aumenta o limite para ~4MB para evitar o erro do PWA
      },
      manifest: {
        name: 'KeyTrack SENAI',
        short_name: 'KeyTrack',
        description: 'Sistema de gestão de chaves multi-tenant para unidades do SENAI.',
        theme_color: '#0f766e',
        background_color: '#f4f4ec',
        display: 'standalone',
        start_url: '/KeyTrack/',
        icons: [
          {
            src: 'vite.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ]
      }
    })
  ]
})