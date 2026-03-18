import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    cache: {
      scripts: true,
      tasks: true,
    },
    tasks: {
    },
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
      "**/_generated/*"
    ],
    experimentalTailwindcss: {
      stylesheet: "./layers/ui/assets/css/main.css",
      attributes: ["class", "className"],
      functions: ["clsx", "cn"],
      preserveWhitespace: true,
    },
    bracketSpacing: true,
    experimentalSortImports: {
      groups: [
        ["side-effect"],
        ["builtin"],
        ["external", "external-type"],
        ["internal", "internal-type"],
        ["parent", "parent-type"],
        ["sibling", "sibling-type"],
        ["index", "index-type"],
      ],
    },
  },
});
