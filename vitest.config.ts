import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    css: false,
    // Exclude backend/mobile — backend runs under Jest with NestJS testing
    // globals; mobile runs under Flutter's flutter_test. Including them here
    // makes Vitest try to parse their specs and fail on missing `jest` globals.
    exclude: ['node_modules', 'e2e', '.next', 'dist', 'backend', 'mobile', '.claude/**'],
    server: {
      deps: {
        // Prisma client is CJS; running it through Vite's transform pipeline
        // strips the enum object and leaves undefined values.  Externalising it
        // forces Node to load it as plain CJS, which works correctly.
        external: ['@prisma/client', '.prisma/client'],
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
