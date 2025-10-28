/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Look for files with .test.ts or .spec.ts extension in the top-level tests directory
  testMatch: ['**/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  // Root directory where the tests should be run from
  rootDir: './',
  // Tell Jest where the configuration for module resolution is
  moduleNameMapper: {
    // Allows absolute path imports if configured in tsconfig.json (optional but good practice)
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Setup file for TypeORM mocking/initialization
  setupFilesAfterEnv: [],
  // Coverage reporting
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.ts', '!src/server.ts', '!src/app.ts', '!src/config/**/*.ts', '!src/routes/**/*.ts'],
};
