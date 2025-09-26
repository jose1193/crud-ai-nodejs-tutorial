module.exports = {
  // Entorno de testing
  testEnvironment: "node",

  // Directorios de tests
  testMatch: ["**/__tests__/**/*.js", "**/?(*.)+(spec|test).js"],

  // Coverage
  collectCoverage: false,
  collectCoverageFrom: [
    "controllers/**/*.js",
    "models/**/*.js",
    "services/**/*.js",
    "middleware/**/*.js",
    "routes/**/*.js",
    "!node_modules/**",
    "!coverage/**",
    "!**/*.test.js",
    "!**/*.spec.js",
  ],

  // Setup y teardown
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],

  // Timeout para tests
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Reporters simples
  reporters: ["default"],
};
