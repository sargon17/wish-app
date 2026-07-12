import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
// devtools(),
import { nitro } from "nitro/vite";
import { defineConfig } from "vite-plus";

const config = defineConfig({
  plugins: [tailwindcss(), tanstackStart(), viteReact(), nitro()],
  resolve: {
    tsconfigPaths: true,
  },
});

export default config;
