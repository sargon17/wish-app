import { defineConfig } from 'vite-plus'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { nitro } from 'nitro/vite';

const config = defineConfig({
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    nitro()
  ],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})

export default config
