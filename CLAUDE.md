# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GIMS (Git Made Simple) is an AI-powered Git CLI tool that automatically generates meaningful commit messages from code changes. It's a Node.js package published to npm that integrates with OpenAI GPT-4 and Google Gemini APIs.

## Architecture

- **Single-file CLI**: All functionality is contained in `bin/gims.js`
- **AI Integration**: Supports both OpenAI and Google Gemini APIs with intelligent fallback strategies
- **Git Wrapper**: Built on top of `simple-git` library for Git operations
- **Token Management**: Implements sophisticated content chunking to handle large diffs within AI token limits

## Key Components

- **Command System**: Uses `commander.js` for CLI argument parsing with aliases (e.g., `g o` for `gims online`)
- **AI Message Generation**: Multi-strategy approach that falls back from full diff → summary → status → truncated content
- **Commit Resolution**: Supports both commit hashes and numbered indices for referencing commits
- **Safe Operations**: Includes error handling for empty repositories and edge cases

## Environment Setup

Required environment variables (at least one):
- `OPENAI_API_KEY` - For OpenAI GPT-4o-mini integration
- `GEMINI_API_KEY` - For Google Gemini 2.0 Flash integration

## Common Commands

- **Install globally**: `npm install -g .`
- **Test locally**: `node bin/gims.js --help`
- **Test specific command**: `node bin/gims.js suggest`
- **Run with alias**: `g o` (after global install)

## Development Notes

- No test framework is currently configured (package.json shows placeholder test script)
- Node.js version requirement: >=20.0.0
- Uses CommonJS modules (`require`/`module.exports`)
- Dependencies are minimal and focused on core functionality
- Token estimation uses 4 characters per token approximation
- Maximum context limit set conservatively at 100,000 tokens