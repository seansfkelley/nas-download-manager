/** @type {import("jest").Config} */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/test"],
  setupFilesAfterEnv: ["jest-extended/all"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/test/tsconfig.json",
        // TS151002 advises isolatedModules for node16 module resolution, because that resolution
        // decides ESM-vs-CommonJS per file. Setting it would make ts-jest transpile-only and
        // silently stop type checking the tests. Nothing here resolves to ESM anyway: package.json
        // declares no "type": "module" and there are no .mts/.cts files.
        diagnostics: { ignoreCodes: [151002] },
      },
    ],
  },
};
