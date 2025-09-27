#!/usr/bin/env node

/**
 * Auto Changelog Generator with AI
 *
 * This script analyzes git commits and uses AI to generate professional changelogs
 * following Keep a Changelog format and semantic versioning.
 *
 * Usage:
 *   node scripts/generate-changelog.js [options]
 *
 * Options:
 *   --since <tag>        Generate changelog since specific tag
 *   --from <date>        Generate changelog from specific date (YYYY-MM-DD)
 *   --to <date>          Generate changelog to specific date (YYYY-MM-DD)
 *   --type <type>        Filter by commit type (feat, fix, docs, etc.)
 *   --ai-provider <prov> AI provider to use (openai, anthropic, gemini)
 *   --preview           Show preview without writing to file
 *   --help              Show this help
 *
 * Environment Variables:
 *   OPENAI_API_KEY      For OpenAI provider
 *   ANTHROPIC_API_KEY   For Anthropic provider
 *   GEMINI_API_KEY      For Google Gemini provider
 *
 * Examples:
 *   node scripts/generate-changelog.js --since v1.0.0
 *   node scripts/generate-changelog.js --from 2024-01-01 --preview
 *   node scripts/generate-changelog.js --type feat --ai-provider openai
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

class ChangelogGenerator {
  constructor(options = {}) {
    this.options = {
      since: options.since || null,
      from: options.from || null,
      to: options.to || null,
      type: options.type || null,
      aiProvider: options.aiProvider || "openai",
      preview: options.preview || false,
      help: options.help || false,
      ...options,
    };

    this.commits = [];
    this.changelog = "";
  }

  showHelp() {
    console.log(`
🤖 Auto Changelog Generator with AI

Usage:
  node scripts/generate-changelog.js [options]

Options:
  --since <tag>           Generate changelog since specific tag
  --from <date>           Generate changelog from specific date (YYYY-MM-DD)
  --to <date>             Generate changelog to specific date (YYYY-MM-DD)
  --type <type>           Filter by commit type (feat, fix, docs, etc.)
  --ai-provider <prov>    AI provider: openai, anthropic, gemini (default: openai)
  --preview              Show preview without writing to file
  --help                 Show this help

Environment Variables:
  OPENAI_API_KEY         For OpenAI GPT models
  ANTHROPIC_API_KEY      For Anthropic Claude models
  GEMINI_API_KEY         For Google Gemini models

Examples:
  # Generate changelog since last release
  node scripts/generate-changelog.js --since v1.0.0

  # Preview changes from last month
  node scripts/generate-changelog.js --from 2024-01-01 --preview

  # Generate only feature-related changes
  node scripts/generate-changelog.js --type feat

  # Use different AI provider
  node scripts/generate-changelog.js --ai-provider anthropic
`);
    process.exit(0);
  }

  async run() {
    if (this.options.help) {
      this.showHelp();
      return;
    }

    console.log("🚀 Starting Auto Changelog Generation...\n");

    try {
      // Step 1: Extract commits
      await this.extractCommits();
      console.log(`📊 Found ${this.commits.length} commits to analyze`);

      if (this.commits.length === 0) {
        console.log("⚠️  No commits found. Nothing to generate.");
        return;
      }

      // Step 2: Categorize commits
      const categorizedCommits = this.categorizeCommits();
      console.log("📋 Categorized commits by type");

      // Step 3: Generate AI-powered descriptions
      console.log("🤖 Generating AI-powered descriptions...");
      const enhancedChanges = await this.generateAIDescriptions(
        categorizedCommits
      );

      // Step 4: Format changelog
      this.formatChangelog(enhancedChanges);

      // Step 5: Output result
      if (this.options.preview) {
        console.log("\n📖 CHANGELOG PREVIEW:\n");
        console.log("=".repeat(50));
        console.log(this.changelog);
        console.log("=".repeat(50));
      } else {
        this.writeChangelog();
        console.log("✅ Changelog generated successfully!");
        console.log("📝 File: CHANGELOG.md");
      }
    } catch (error) {
      console.error("❌ Error generating changelog:", error.message);
      process.exit(1);
    }
  }

  async extractCommits() {
    let gitCommand =
      'git log --oneline --pretty=format:"%H|%s|%an|%ae|%ad" --date=short';

    // Add filters
    if (this.options.since) {
      gitCommand += ` ${this.options.since}..HEAD`;
    }

    if (this.options.from) {
      gitCommand += ` --since="${this.options.from}"`;
    }

    if (this.options.to) {
      gitCommand += ` --until="${this.options.to}"`;
    }

    try {
      const output = execSync(gitCommand, { encoding: "utf8" });
      const lines = output.trim().split("\n");

      this.commits = lines
        .map((line) => {
          const [hash, message, author, email, date] = line.split("|");
          return {
            hash,
            message: message.trim(),
            author,
            email,
            date,
            type: this.parseCommitType(message),
            scope: this.parseCommitScope(message),
            description: this.cleanCommitMessage(message),
          };
        })
        .filter((commit) => commit.hash); // Filter out empty lines
    } catch (error) {
      throw new Error(`Failed to extract commits: ${error.message}`);
    }
  }

  parseCommitType(message) {
    const typeMatch = message.match(/^(\w+)(?:\([^)]+\))?:/);
    return typeMatch ? typeMatch[1] : "other";
  }

  parseCommitScope(message) {
    const scopeMatch = message.match(/^\w+\(([^)]+)\):/);
    return scopeMatch ? scopeMatch[1] : null;
  }

  cleanCommitMessage(message) {
    // Remove conventional commit prefix
    return message.replace(/^(\w+)(?:\([^)]+\))?:\s*/, "");
  }

  categorizeCommits() {
    const categories = {
      added: [],
      changed: [],
      deprecated: [],
      removed: [],
      fixed: [],
      security: [],
    };

    const typeMapping = {
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
    };

    this.commits.forEach((commit) => {
      let category = "changed"; // default

      // Check commit type
      if (typeMapping[commit.type]) {
        category = typeMapping[commit.type];
      }

      // Check keywords in description
      const description = commit.description.toLowerCase();
      for (const [keyword, cat] of Object.entries(typeMapping)) {
        if (description.includes(keyword) && keyword !== commit.type) {
          category = cat;
          break;
        }
      }

      categories[category].push(commit);
    });

    return categories;
  }

  async generateAIDescriptions(categorizedCommits) {
    const enhanced = {};

    for (const [category, commits] of Object.entries(categorizedCommits)) {
      if (commits.length === 0) continue;

      console.log(`  📝 Processing ${commits.length} ${category} commits...`);

      try {
        const description = await this.callAIForCategory(category, commits);
        enhanced[category] = {
          commits,
          description: description.trim(),
        };
      } catch (error) {
        console.warn(
          `  ⚠️  AI generation failed for ${category}, using basic format`
        );
        enhanced[category] = {
          commits,
          description: this.generateBasicDescription(category, commits),
        };
      }
    }

    return enhanced;
  }

  async callAIForCategory(category, commits) {
    const prompt = this.buildAIPrompt(category, commits);

    switch (this.options.aiProvider) {
      case "openai":
        return await this.callOpenAI(prompt);
      case "anthropic":
        return await this.callAnthropic(prompt);
      case "gemini":
        return await this.callGemini(prompt);
      default:
        throw new Error(`Unknown AI provider: ${this.options.aiProvider}`);
    }
  }

  buildAIPrompt(category, commits) {
    const categoryLabels = {
      added: "Added",
      changed: "Changed",
      fixed: "Fixed",
      security: "Security",
      removed: "Removed",
      deprecated: "Deprecated",
    };

    const commitMessages = commits.map((c) => `- ${c.description}`).join("\n");

    return `Analyze these git commits and generate a professional changelog entry for the "${categoryLabels[category]}" section. Focus on what users and developers would care about.

COMMITS:
${commitMessages}

REQUIREMENTS:
- Write in a professional, clear manner
- Focus on functionality and impact, not implementation details
- Group similar changes together
- Use bullet points for multiple items
- Keep it concise but informative
- Write from the perspective of what was added/changed/fixed

EXAMPLE FORMAT:
- Enhanced user registration flow with automatic welcome emails
- Added support for custom email templates
- Improved error handling for email delivery failures

Generate only the bullet points, no section headers:`;
  }

  async callOpenAI(prompt) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  async callAnthropic(prompt) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is required");
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  async callGemini(prompt) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }

  generateBasicDescription(category, commits) {
    const descriptions = commits.map((commit) => {
      let desc = commit.description;

      // Capitalize first letter
      desc = desc.charAt(0).toUpperCase() + desc.slice(1);

      // Add period if missing
      if (!desc.endsWith(".") && !desc.endsWith("!") && !desc.endsWith("?")) {
        desc += ".";
      }

      return desc;
    });

    return descriptions.join("\n- ");
  }

  formatChangelog(enhancedChanges) {
    const now = new Date();
    const version = this.generateNextVersion(enhancedChanges);
    const date = now.toISOString().split("T")[0];

    let changelog = `## [${version}] - ${date}\n\n`;

    const sectionOrder = [
      "added",
      "changed",
      "deprecated",
      "removed",
      "fixed",
      "security",
    ];
    const sectionTitles = {
      added: "Added",
      changed: "Changed",
      deprecated: "Deprecated",
      removed: "Removed",
      fixed: "Fixed",
      security: "Security",
    };

    for (const category of sectionOrder) {
      if (enhancedChanges[category]) {
        changelog += `### ${sectionTitles[category]}\n`;
        changelog += enhancedChanges[category].description;
        changelog += "\n\n";
      }
    }

    this.changelog = changelog.trim();
  }

  generateNextVersion(enhancedChanges) {
    // Read current version from package.json
    try {
      const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
      const currentVersion = packageJson.version;
      const [major, minor, patch] = currentVersion.split(".").map(Number);

      // Determine version bump based on changes
      if (enhancedChanges.removed || enhancedChanges.deprecated) {
        return `${major + 1}.0.0`; // Major version bump
      } else if (enhancedChanges.added) {
        return `${major}.${minor + 1}.0`; // Minor version bump
      } else {
        return `${major}.${minor}.${patch + 1}`; // Patch version bump
      }
    } catch (error) {
      console.warn("⚠️  Could not read package.json, using default version");
      return "1.0.0";
    }
  }

  writeChangelog() {
    const changelogPath = path.join(process.cwd(), "CHANGELOG.md");

    // Read existing changelog
    let existingContent = "";
    if (fs.existsSync(changelogPath)) {
      existingContent = fs.readFileSync(changelogPath, "utf8");

      // Remove the header if it exists
      const headerEnd = existingContent.indexOf("## [");
      if (headerEnd !== -1) {
        existingContent = existingContent.substring(headerEnd);
      }
    }

    // Combine new entry with existing content
    const newContent =
      `# Changelog\n\nAll notable changes to this project will be documented in this file.\n\nThe format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),\nand this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).\n\n${this.changelog}\n\n${existingContent}`.trim();

    fs.writeFileSync(changelogPath, newContent + "\n");
  }
}

// CLI Interface
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const value =
        args[i + 1] && !args[i + 1].startsWith("--") ? args[++i] : true;
      options[key] = value;
    }
  }

  return options;
}

// Main execution
if (require.main === module) {
  const options = parseArgs();
  const generator = new ChangelogGenerator(options);
  generator.run().catch(console.error);
}

module.exports = ChangelogGenerator;
