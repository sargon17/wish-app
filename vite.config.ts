import { defineConfig } from 'vite-plus'

export default defineConfig({
  run: {
    cache: {
      scripts: true,
      tasks: true,
    },
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
})
