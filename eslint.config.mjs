import js from "@eslint/js";
import { includeIgnoreFile } from "eslint/config";
import prettier from "eslint-config-prettier/flat";
import importX from "eslint-plugin-import-x";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  includeIgnoreFile(`${import.meta.dirname}/.gitignore`),
  { ignores: ["vendor/"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  // Must come last: turns off every rule prettier already decides.
  prettier,
  {
    plugins: { "import-x": importX },
    languageOptions: { globals: { ...globals.browser, ...globals.webextensions } },
    rules: {
      "import-x/order": ["error", { alphabetize: { order: "asc" }, "newlines-between": "always" }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { varsIgnorePattern: "^_", argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "off", // TODO
      "@typescript-eslint/no-empty-object-type": "off", // TODO
      "@typescript-eslint/no-namespace": "off", // TODO
    },
  },
  {
    files: ["jest.config.js"],
    languageOptions: { sourceType: "commonjs", globals: globals.node },
  },
  {
    files: ["test/**"],
    languageOptions: { globals: globals.jest },
  },
);
