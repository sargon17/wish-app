import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    cache: {
      scripts: true,
      tasks: true,
    },
    tasks: {},
  },
  lint: {
    plugins: ["node", "jsdoc", "import", "unicorn", "react"],
    ignorePatterns: [
      "**/dist/**",
      "**/.output/**",
      "**/node_modules/**",
      "**/components/ui/**",
      "**/_generated/*",
    ],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {
    ignorePatterns: [
      "**/dist/**",
      "**/.output/**",
      "**/node_modules/**",
      "**/components/ui/**",
      "**/_generated/*",
    ],
    experimentalTailwindcss: {
      stylesheet: "./apps/wish-start/src/styles.css",
      attributes: ["class", "className"],
      functions: ["clsx", "cn"],
      preserveWhitespace: true,
    },
    bracketSpacing: true,
    experimentalSortImports: {
      groups: [
        ["builtin", "type-builtin"],
        ["external", "type-external"],
        ["internal", "type-internal"],
        ["parent", "type-parent"],
        ["sibling", "type-sibling"],
        ["index", "type-index"],
      ],
    },
  },
});
