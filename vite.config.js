import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        projects: resolve(__dirname, 'projects.html'),
        info: resolve(__dirname, 'info.html'),
        wired_rebrand: resolve(__dirname, 'wired_rebrand.html'),
        candor: resolve(__dirname, 'candor.html'),
        twingate: resolve(__dirname, 'twingate.html'),
        tns_commencement: resolve(__dirname, 'tns-commencement-2025.html'),
        parsons_benefit: resolve(__dirname, 'parsons-benefit-2024.html'),
        disciple: resolve(__dirname, 'disciple.html'),
        gundi_studios: resolve(__dirname, 'gundi-studios.html'),
        playground: resolve(__dirname, 'playground.html'),
      },
    },
  },
})
