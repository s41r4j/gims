# 🚀 GIMS - Git Made Simple

[![npm version](https://img.shields.io/npm/v/gims.svg)](https://npmjs.org/package/gims)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![AI Powered](https://img.shields.io/badge/AI-Powered-blueviolet.svg)](https://github.com/s41r4j/gims)

**AI-powered Git CLI that writes your commit messages for you**

*Because life's too short for "fix stuff" commits* 🎯

## ⚡ Quick Start

```bash
# Install
npm install -g gims

# Setup AI (choose one)
g setup --api-key gemini    # Free & fast (recommended)
g setup --api-key openai    # High quality
g setup --api-key groq      # Ultra fast

# Use it
g s    # Check status with AI insights
g o    # AI commit + push
```

## 🎯 Main Commands

| Command | Description |
|---------|-------------|
| `g s` | Enhanced status with AI insights |
| `g i` | Interactive commit wizard |
| `g o` | AI commit + push |
| `g l` | AI commit locally |
| `g h` | Commit history |
| `g a` | Smart amend |

## 🤖 AI Models

- **Gemini**: `gemini-2.5-flash` (Free, fast, recommended)
- **OpenAI**: `gpt-5` (High quality)
- **Groq**: `groq/compound` (Ultra fast)

## 📖 Examples

```bash
# Daily workflow
g s              # Check what changed
g i              # Interactive commit
g o              # Quick commit + push

# Advanced
g sg --multiple  # Get 3 AI suggestions
g h --detailed   # Detailed history
g sync --rebase  # Smart sync
```

## 🔧 Configuration

```bash
g config --set conventional=true   # Enable conventional commits
g config --set autoStage=true      # Auto-stage changes
g config --list                    # View all settings
```

## 🆘 Help

```bash
g --help    # All commands
g q         # Quick reference
```

## 📄 License

MIT © [S41R4J](https://github.com/s41r4j)