import js from "@eslint/js";
import { includeIgnoreFile } from "eslint/config";
import prettier from "eslint-config-prettier/flat";
import importX from "eslint-plugin-import-x";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

const ENTRY_POINTS = ["background", "content", "popup", "settings"];
const NON_REACT_ENTRY_POINTS = ["background", "content"];
const REACT_COMMON = ["components", "hooks"];

export default tseslint.config(
  includeIgnoreFile(`${import.meta.dirname}/.gitignore`),
  { ignores: ["vendor/"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  // Must come last: turns off every rule prettier already decides.
  prettier,
  {
    plugins: {
      "import-x": importX,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.webextensions,
      },
    },
    settings: {
      // no-restricted-paths silently passes everything unless specifiers resolve to real files.
      "import-x/resolver-next": [
        importX.createNodeResolver({ extensions: [".ts", ".tsx", ".js", ".jsx"] }),
      ],
    },
    rules: {
      "import-x/order": [
        "error",
        {
          alphabetize: { order: "asc" },
          "newlines-between": "always",
        },
      ],
      "import-x/no-restricted-paths": [
        "error",
        {
          zones: [
            {
              target: "./src/common",
              from: "./src",
              except: ["./common"],
            },
            ...ENTRY_POINTS.map((entryPoint) => ({
              target: `./src/${entryPoint}`,
              from: "./src",
              except: [`./${entryPoint}`, "./common"],
            })),
            ...NON_REACT_ENTRY_POINTS.flatMap((entryPoint) =>
              REACT_COMMON.map((directory) => ({
                target: `./src/${entryPoint}`,
                from: `./src/common/${directory}`,
              })),
            ),
          ],
        },
      ],
      // import-x/order alphabetizes the declarations; this alphabetizes the names inside the braces.
      "sort-imports": ["error", { ignoreDeclarationSort: true }],
      // "never" inverts the rule against null, where == is the only way to catch undefined too.
      eqeqeq: ["error", "always", { null: "never" }],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            'MemberExpression[property.name="remove"][object.object.object.name="browser"][object.object.property.name="storage"]',
          message: "Don't remove storage keys; set them to null (not undefined) instead.",
        },
        {
          selector: 'CallExpression[callee.property.name="forEach"]',
          message: "Use a for-of loop instead of forEach.",
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "off", // TODO
      "@typescript-eslint/no-empty-object-type": "off", // TODO
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
