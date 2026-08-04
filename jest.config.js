/** @type {import("jest").Config} */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/test"],
  // This project names tests test-foo.ts rather than foo.test.ts.
  testMatch: ["<rootDir>/test/test-*.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/test/tsconfig-test.json" }],
  },
};
