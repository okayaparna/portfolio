import { defineConfig } from 'vite'
import { resolve } from 'path'

// Standalone preview for framer/AboutAvatar.tsx: `npx vite --config avatar/preview/vite.config.js`
export default defineConfig({
  root: resolve(__dirname, '..'),
  resolve: {
    alias: {
      'react/jsx-dev-runtime': resolve(__dirname, 'stubs/jsx-runtime.js'),
      'react/jsx-runtime': resolve(__dirname, 'stubs/jsx-runtime.js'),
      react: resolve(__dirname, 'stubs/react.js'),
      framer: resolve(__dirname, 'stubs/framer.js'),
    },
  },
  server: { port: 5190, fs: { allow: [resolve(__dirname, '../..')] } },
})
