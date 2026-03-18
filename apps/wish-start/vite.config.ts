import { defineConfig } from 'vite-plus'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

    // devtools(),
import { nitro } from 'nitro/vite';

const config = defineConfig({
  plugins: [
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    nitro()
  ],
  resolve: {
    tsconfigPaths: true,
  },
})

export default config
