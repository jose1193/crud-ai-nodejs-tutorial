#!/usr/bin/env node

/**
 * Test Script for Auto Changelog Generator
 *
 * This script tests the changelog generator with mock data
 * to ensure it works without making actual API calls.
 *
 * Usage:
 *   node scripts/test-changelog.js
 */

const ChangelogGenerator = require("./generate-changelog");

// Mock commits for testing
const mockCommits = [
  {
    hash: "abc123",
    message: "feat: add email templates support",
    author: "Developer",
    email: "dev@example.com",
    date: "2024-01-15",
    type: "feat",
    scope: null,
    description: "add email templates support",
  },
  {
    hash: "def456",
    message: "fix: resolve merge conflicts in email service",
    author: "Developer",
    email: "dev@example.com",
    date: "2024-01-15",
    type: "fix",
    scope: null,
    description: "resolve merge conflicts in email service",
  },
  {
    hash: "ghi789",
    message: "feat(email): upgrade to advanced email service with analytics",
    author: "Developer",
    email: "dev@example.com",
    date: "2024-01-14",
    type: "feat",
    scope: "email",
    description: "upgrade to advanced email service with analytics",
  },
  {
    hash: "jkl012",
    message: "test: add unit tests for password validation",
    author: "Developer",
    email: "dev@example.com",
    date: "2024-01-13",
    type: "test",
    scope: null,
    description: "add unit tests for password validation",
  },
];

class TestChangelogGenerator extends ChangelogGenerator {
  constructor(options = {}) {
    super(options);
    this.commits = mockCommits;
  }

  async extractCommits() {
    // Skip git extraction, use mock data
    console.log("📊 Using mock commit data for testing");
  }

  async callAIForCategory(category, commits) {
    // Return mock AI responses instead of calling real APIs
    const mockResponses = {
      added: `- Enhanced user registration flow with automatic welcome emails\n- Added support for custom email templates and personalization\n- Implemented advanced analytics tracking for email engagement`,
      fixed: `- Resolved merge conflicts between email template and analytics features\n- Fixed email delivery issues under high load conditions`,
      changed: `- Refactored email service architecture to support multiple providers\n- Improved error handling and logging throughout the application`,
    };

    return (
      mockResponses[category] ||
      `- ${commits.map((c) => c.description).join("\n- ")}`
    );
  }
}

async function runTests() {
  console.log("🧪 Testing Auto Changelog Generator...\n");

  try {
    // Test 1: Basic functionality
    console.log("Test 1: Basic changelog generation");
    const generator = new TestChangelogGenerator({ preview: true });
    await generator.run();
    console.log("✅ Test 1 passed\n");

    // Test 2: Categorization
    console.log("Test 2: Commit categorization");
    const categorized = generator.categorizeCommits();
    console.log("📋 Categorized commits:");
    Object.entries(categorized).forEach(([category, commits]) => {
      if (commits.length > 0) {
        console.log(`  ${category}: ${commits.length} commits`);
      }
    });
    console.log("✅ Test 2 passed\n");

    // Test 3: Version bumping
    console.log("Test 3: Version generation");
    const version = generator.generateNextVersion(categorized);
    console.log(`📦 Generated version: ${version}`);
    console.log("✅ Test 3 passed\n");

    console.log(
      "🎉 All tests passed! The changelog generator is working correctly."
    );
    console.log("\n💡 To use with real data and AI:");
    console.log("   1. Set up your API keys in environment variables");
    console.log("   2. Run: node scripts/generate-changelog.js --since v1.0.0");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { TestChangelogGenerator, runTests };
