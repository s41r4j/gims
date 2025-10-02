# Technology Stack

## Runtime & Language
- **Node.js**: >= 18.18.0 (Node 20+ recommended)
- **JavaScript**: CommonJS modules (`"type": "commonjs"`)
- **Package Manager**: npm (with package-lock.json)

## Core Dependencies
- **commander**: CLI framework for command parsing and structure
- **simple-git**: Git operations and repository management
- **clipboardy**: Cross-platform clipboard operations
- **@google/genai**: Google Gemini AI integration
- **openai**: OpenAI API client

## Architecture Patterns
- Single-file CLI application (`bin/gims.js`)
- Functional programming approach with utility functions
- Configuration via environment variables and `.gimsrc` JSON files
- Graceful fallbacks and error handling throughout
- ANSI color utilities without external dependencies

## Code Style Conventions
- Use `const` for immutable values, avoid `var`
- Prefer template literals for string interpolation
- Use async/await for asynchronous operations
- Implement comprehensive error handling with try/catch
- Keep functions focused and modular
- Use descriptive variable names (e.g., `rawDiff`, `prefProvider`)
- Comment complex logic and AI prompt engineering sections

## Common Commands

### Development
```bash
# Install dependencies
npm install

# Test installation
npm test  # Currently returns "No tests yet"

# Global installation for testing
npm install -g .
```

### Publishing
```bash
# Update version
npm version patch|minor|major

# Publish to npm
npm publish
```

### Local Development Testing
```bash
# Link for local testing
npm link

# Test CLI commands
gims --help
g --help
```

## Configuration Management
- Environment variables for API keys (`OPENAI_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`)
- Optional `.gimsrc` JSON config in project root or home directory
- Runtime provider detection and fallback logic
- Support for custom models and base URLs