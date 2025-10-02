# Project Structure

## Directory Layout
```
gims/
├── bin/
│   └── gims.js              # Main CLI executable and entry point
├── node_modules/            # npm dependencies (auto-generated)
├── .npm-cache/             # npm cache directory (auto-generated)
├── .github/                # GitHub workflows and templates
├── .git/                   # Git repository data
├── .kiro/                  # Kiro AI assistant configuration
│   └── steering/           # AI guidance documents
├── package.json            # Project metadata and dependencies
├── package-lock.json       # Dependency lock file
├── README.md              # Comprehensive project documentation
├── LICENSE                # MIT license
└── .gitignore             # Git ignore patterns
```

## Key Files

### `bin/gims.js`
- **Purpose**: Single-file CLI application containing all functionality
- **Structure**: Monolithic approach with utility functions, command handlers, and AI integration
- **Exports**: Executable binary via shebang (`#!/usr/bin/env node`)
- **Commands**: All CLI commands and subcommands defined in this file

### `package.json`
- **Binary entries**: `gims` and `g` both point to `bin/gims.js`
- **Main entry**: Points to `bin/gims.js`
- **Scripts**: Minimal test script placeholder
- **Keywords**: Focused on git, cli, ai, commit, developer-tools

### Configuration Files
- **`.gimsrc`**: Optional JSON config (project root or home directory)
- **Environment variables**: API keys and default settings
- **Git integration**: Uses existing `.git` directory and configuration

## Architecture Principles

### Single-File Design
- All functionality consolidated in `bin/gims.js` for simplicity
- No separate modules or complex directory structure
- Easy to understand, debug, and maintain
- Reduces complexity for a CLI tool

### Command Structure
- Uses commander.js for CLI parsing and command organization
- Short aliases for all commands (`g o`, `g s`, `g l`, etc.)
- Consistent option patterns across commands
- Global options available to all subcommands

### File Naming Conventions
- Executable files in `bin/` directory
- Configuration files use dotfile convention (`.gimsrc`)
- Standard npm project files (package.json, README.md, LICENSE)
- No custom file extensions or special naming schemes

## Development Guidelines

### Adding New Features
- Add new commands directly to `bin/gims.js`
- Follow existing pattern of command definition with commander.js
- Maintain consistent error handling and logging patterns
- Add appropriate help text and examples

### Configuration Management
- Environment variables for sensitive data (API keys)
- JSON config files for user preferences
- Runtime detection and fallback logic
- Validate configuration at startup when needed