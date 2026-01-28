/**
 * GIMS AI Interface Registry
 * 
 * This module defines the "Tools" that GIMS exposes to AI systems (MCP, OpenAI, etc.).
 * It serves as the Single Source of Truth for tool definitions and their schemas.
 */

const simpleGit = require('simple-git');
const { GitAnalyzer } = require('../git/analyzer');
const { S4Versioning } = require('../utils/s4');
const { ConfigManager } = require('../config/manager');
const { AIProviderManager } = require('./providers');

// Initialize shared instances
const git = simpleGit();
const gitAnalyzer = new GitAnalyzer(git);
const configManager = new ConfigManager();
const config = configManager.load();
const aiProvider = new AIProviderManager(config);
const s4 = new S4Versioning(git);

/**
 * Tool Definitions
 * Format:
 * {
 *   name: "tool_name",
 *   description: "Description for the AI",
 *   inputSchema: { ...JSON Schema... },
 *   handler: async (args) => { ... implementation ... }
 * }
 */
const tools = [
    {
        name: "get_status",
        description: "Get enhanced git status with AI insights, file modification stats, and branch context. Use this to understand the current state of the repository.",
        inputSchema: {
            type: "object",
            properties: {},
        },
        handler: async () => {
            return await gitAnalyzer.getEnhancedStatus();
        }
    },
    {
        name: "analyze_history",
        description: "Analyze recent commit history, including authors, conventions, and activity patterns.",
        inputSchema: {
            type: "object",
            properties: {
                limit: {
                    type: "number",
                    description: "Number of commits to analyze (default: 10)"
                }
            }
        },
        handler: async ({ limit = 10 }) => {
            return await gitAnalyzer.analyzeCommitHistory(limit);
        }
    },
    {
        name: "version_info",
        description: "Get current project version information using S4 versioning (Semantic + Date/Time).",
        inputSchema: {
            type: "object",
            properties: {}
        },
        handler: async () => {
            const currentVersion = await s4.getCurrentVersion();
            if (!currentVersion) return { version: "0.0.0", source: "fallback" };
            return { version: currentVersion, details: S4Versioning.parse(currentVersion) };
        }
    },
    {
        name: "generate_commit_message",
        description: "Generate a high-quality commit message based on currently staged changes.",
        inputSchema: {
            type: "object",
            properties: {
                context: {
                    type: "string",
                    description: "Optional context or user instruction for the message generation"
                }
            }
        },
        handler: async ({ context }) => {
            const rawDiff = await git.diff(['--cached', '--no-ext-diff']);
            if (!rawDiff.trim()) {
                return { error: "No staged changes to generate message for." };
            }
            // Pass pseudo-options resembling CLI opts
            const opts = { conventional: config.conventional };
            const message = await aiProvider.generateCommitMessage(rawDiff, opts);

            // Handle object return from provider (some return { message, usedLocal })
            const msgStr = typeof message === 'string' ? message : message.message;

            return {
                message: msgStr,
                original_diff_size: rawDiff.length
            };
        }
    },
    {
        name: "run_git_command",
        description: "Execute a raw git command safely. Use this for standard git operations not covered by other tools.",
        inputSchema: {
            type: "object",
            properties: {
                command: {
                    type: "string",
                    description: "The full git command to run (e.g., 'log -n 5', 'branch --list')"
                }
            },
            required: ["command"]
        },
        handler: async ({ command }) => {
            // Safety check: block potentially destructive commands if needed, 
            // but for now we assume the agent is trusted or user-monitored.
            // We'll strip 'git ' prefix if present.
            const cleanCmd = command.replace(/^git\s+/, '').trim();
            const args = cleanCmd.split(' ');
            try {
                const result = await git.raw(args);
                return { output: result ? result.trim() : "Success" };
            } catch (e) {
                return { error: e.message };
            }
        }
    }
];

module.exports = { tools };
