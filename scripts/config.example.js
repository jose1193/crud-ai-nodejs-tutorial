/**
 * 🤖 Auto Changelog Generator - Configuration Example
 *
 * Copy this file to config.js and fill in your settings
 */

module.exports = {
  // AI Provider Configuration
  ai: {
    // Choose your preferred provider: 'openai', 'anthropic', 'gemini'
    defaultProvider: "openai",

    // API Keys for each provider
    providers: {
      openai: {
        apiKey: process.env.OPENAI_API_KEY || "your-openai-api-key-here",
        model: "gpt-3.5-turbo", // or 'gpt-4' for better results
        maxTokens: 500,
        temperature: 0.3,
      },

      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY || "your-anthropic-api-key-here",
        model: "claude-3-haiku-20240307",
        maxTokens: 500,
      },

      gemini: {
        apiKey: process.env.GEMINI_API_KEY || "your-gemini-api-key-here",
        model: "gemini-pro",
      },
    },
  },

  // Git Configuration
  git: {
    // Conventional commit types mapping
    commitTypes: {
      feat: "added",
      add: "added",
      new: "added",
      create: "added",
      implement: "added",
      build: "added",

      change: "changed",
      update: "changed",
      refactor: "changed",
      improve: "changed",
      modify: "changed",
      enhance: "changed",

      fix: "fixed",
      bug: "fixed",
      issue: "fixed",
      resolve: "fixed",
      patch: "fixed",

      security: "security",
      secure: "security",
      auth: "security",
      vuln: "security",

      remove: "removed",
      delete: "removed",
      drop: "removed",

      deprecate: "deprecated",
      deprecation: "deprecated",
    },

    // Date formats
    dateFormat: "YYYY-MM-DD",
  },

  // Output Configuration
  output: {
    // Changelog file path
    filePath: "CHANGELOG.md",

    // Section order (keep a changelog standard)
    sectionOrder: [
      "added",
      "changed",
      "deprecated",
      "removed",
      "fixed",
      "security",
    ],

    // Section titles
    sectionTitles: {
      added: "Added",
      changed: "Changed",
      deprecated: "Deprecated",
      removed: "Removed",
      fixed: "Fixed",
      security: "Security",
    },
  },

  // Logging Configuration
  logging: {
    level: "info", // 'debug', 'info', 'warn', 'error'
    verbose: false,
  },
};
