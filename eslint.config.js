import js from "@eslint/js";
import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";
import unicornPlugin from "eslint-plugin-unicorn";
import sonarjsPlugin from "eslint-plugin-sonarjs";
import perfectionistPlugin from "eslint-plugin-perfectionist";
import prettierPlugin from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: ["node_modules", "dist", "build", "public"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      import: importPlugin,
      unicorn: unicornPlugin,
      sonarjs: sonarjsPlugin,
      perfectionist: perfectionistPlugin,
      prettier: prettierPlugin,
    },
    languageOptions: {
      parserOptions: {
        project: true,
      },
    },
    rules: {
      ...prettierConfig.rules,
      "prettier/prettier": [
        "error",
        {
          arrowParens: "always",
          endOfLine: "auto",
          tabWidth: 2,
          semi: true,
          singleQuote: true,
          bracketSpacing: true,
          trailingComma: "all",
          printWidth: 120,
          useTabs: true,
        },
      ],
      "unicorn/no-for-loop": "error",
      "sonarjs/no-duplicate-string": "warn",
      "perfectionist/sort-objects": "error",
      "no-console": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-empty-object-type": "off",
      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal"],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
    },
  }
);