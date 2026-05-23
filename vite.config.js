import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: '/portfolio/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        projects: resolve(__dirname, 'projects.html'),
        info: resolve(__dirname, 'info.html'),
        align_with_ash: resolve(__dirname, 'align-with-ash.html'),
        phia_rewards: resolve(__dirname, 'phia-rewards.html'),
        disciple: resolve(__dirname, 'disciple.html'),
        tns_commencement: resolve(__dirname, 'tns-commencement-2025.html'),
        parsons_benefit: resolve(__dirname, 'parsons-benefit-2024.html'),
        wired_rebrand: resolve(__dirname, 'wired-rebrand.html'),
        twingate: resolve(__dirname, 'twingate.html'),
        gundi_studios: resolve(__dirname, 'gundi-studios.html'),
        ash_configurations: resolve(__dirname, 'ash-configurations.html'),
      },
    },
  },
})
