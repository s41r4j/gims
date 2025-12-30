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

### 🧠 Smart Commands
| Command | Description |
|---------|-------------|
| `g s` | Enhanced status with AI insights |
| `g o` | AI commit + push |
| `g l` | AI commit locally |
| `g wip` | Quick WIP commit |
| `g r` | AI code review |
| `g t` | Show today's commits |
| `g stats` | Personal commit statistics |

### ⚡ Workflow Shortcuts
| Command | What it does |
|---------|--------------|
| `g sp` | **Safe Pull** (Stash → Pull → Pop) |
| `g fix` | **Smart Fix** for branch sync issues |
| `g main` | Switch to main/master + pull |
| `g ss` | Quick stash save |
| `g pop` | Pop latest stash |
| `g us` | Unstage all files |
| `g x` | Discard all changes (with confirm) |

### 🛠️ Helper Commands
| Command | Description |
|---------|-------------|
| `g last` | Show last commit details |
| `g conflicts` | Conflict resolution helper |
| `g clean` | Remove dead local branches |
| `g ls` | Commit history (short) |
| `g a` | Amend previous commit |

## 🤖 AI Models

- **Gemini**: `gemini-2.5-flash` (Free, fast, recommended)
- **OpenAI**: `gpt-5` (High quality)
- **Groq**: `groq/compound` (Ultra fast)

## 📖 Examples

```bash
# Daily workflow
g s              # Check status
g sp             # Safe pull updates
g fix            # Fix any sync issues
g o              # Commit + push

# Power functions
g r              # Review code before commit
g stats          # Check your streak
g split          # Split big changesets
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