import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.cache/**",
      "**/.bun/**",
      "**/uploads/**",
      "**/*.png",
      "**/*.jpg",
      "**/*.jpeg",
      "**/*.webp"
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: false
      }
    },
    plugins: {
      "@typescript-eslint": tseslint
    },
    rules: {}
  }
];
