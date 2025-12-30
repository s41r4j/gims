<div align="center">

# 🚀 GIMS - Git Made Simple

[![npm version](https://img.shields.io/npm/v/gims.svg)](https://npmjs.org/package/gims)
[![npm downloads](https://img.shields.io/npm/dm/gims.svg)](https://npmjs.org/package/gims)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![AI Powered](https://img.shields.io/badge/AI-Powered-blueviolet.svg)](https://github.com/s41r4j/gims)
[![Node.js](https://img.shields.io/badge/Node.js->=18.18.0-green.svg)](https://nodejs.org)

**AI-powered Git CLI that writes your commit messages for you**

*Because life's too short for "fix stuff" commits* 🎯

[Installation](#-installation) • [Quick Start](#-quick-start) • [Commands](#-commands) • [AI Setup](#-ai-providers) • [Configuration](#-configuration)

</div>

---

## ✨ Features

- 🤖 **AI-Generated Commits** — Let AI analyze your changes and write meaningful commit messages
- 📊 **Smart Status** — Enhanced git status with file type detection and insights
- 🔄 **Workflow Shortcuts** — Common multi-step operations condensed to single commands
- 📈 **Commit Analytics** — Track your commit streak, patterns, and statistics
- 🔍 **Code Review** — Get AI-powered code review before committing
- 🛡️ **Safe Operations** — Built-in safeguards for destructive commands
- ⚡ **Lightning Fast** — Optimized for speed with intelligent caching

---

## 📦 Installation

```bash
npm install -g gims
```

**Requirements:** Node.js >= 18.18.0

---

## ⚡ Quick Start

```bash
# 1. Setup AI provider (choose one)
g setup --api-key gemini    # 🆓 Free & fast (recommended)
g setup --api-key openai    # 🎯 High quality
g setup --api-key groq      # ⚡ Ultra fast

# 2. Start using it!
g s                         # Check status with AI insights
g o                         # AI commit + push (one command!)
```

### Your New Workflow

```bash
# Before (traditional git)
git add .
git commit -m "trying to think of message..."
git push

# After (with GIMS)
g o                         # That's it. AI handles the rest.
```

---

## 📚 Commands

### 🧠 Core Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `g status` | `g s` | Enhanced status with AI insights & file type emojis |
| `g oneshot` | `g o` | Stage all → AI commit → Push (full workflow) |
| `g local` | `g l` | Stage all → AI commit (no push) |
| `g suggest` | `g sg` | Get AI commit message suggestions |
| `g wip` | — | Quick work-in-progress commit |

### 📊 Analytics & Review

| Command | Alias | Description |
|---------|-------|-------------|
| `g review` | `g r` | AI code review with complexity analysis |
| `g today` | `g t` | Show all commits made today |
| `g stats` | — | Personal statistics: streak, patterns, style |
| `g split` | — | AI suggestions for splitting large changesets |

### ⚡ Workflow Shortcuts

| Command | Alias | What it does |
|---------|-------|--------------|
| `g safe-pull` | `g sp` | Stash → Pull → Pop (safe pull with uncommitted changes) |
| `g fix` | — | Smart fix for diverged/ahead/behind branches |
| `g main` | — | Switch to main/master + pull latest |
| `g stash-save` | `g ss` | Quick stash with auto-generated name |
| `g stash-pop` | `g pop` | Pop the latest stash |
| `g unstage` | `g us` | Unstage all staged files |
| `g discard` | `g x` | Discard all changes (requires `--yes`) |

### 🛠️ Git Helpers

| Command | Alias | Description |
|---------|-------|-------------|
| `g last` | — | Show last commit details with diff |
| `g conflicts` | — | Conflict resolution helper |
| `g cleanup` | `g clean` | Remove local branches deleted from remote |
| `g list` | `g ls` | Compact commit history |
| `g amend` | `g a` | Amend the previous commit |
| `g undo` | `g u` | Undo last commit (keep changes) |
| `g delete-branch` | `g del` | Delete branch locally and remotely |

### 🔧 Setup & Config

| Command | Description |
|---------|-------------|
| `g setup` | Interactive setup wizard |
| `g setup --api-key <provider>` | Quick API key setup |
| `g config --list` | View all settings |
| `g config --set key=value` | Update configuration |
| `g quick-help` / `g q` | Quick command reference |

---

## 🤖 AI Providers

GIMS supports multiple AI providers. Choose based on your needs:

| Provider | Model | Speed | Quality | Cost |
|----------|-------|-------|---------|------|
| **Gemini** | `gemini-3-flash-preview` | ⚡⚡⚡ | ⭐⭐⭐ | 🆓 Free |
| **Groq** | `groq/compound` | ⚡⚡⚡⚡ | ⭐⭐⭐ | 🆓 Free tier |
| **OpenAI** | `gpt-5.2-2025-12-11` | ⚡⚡ | ⭐⭐⭐⭐ | 💰 Paid |

### Setting Up API Keys

#### Option 1: Interactive Setup (Recommended)

```bash
g setup --api-key gemini    # Guided setup with instructions
g setup --api-key openai
g setup --api-key groq
```

#### Option 2: Environment Variables (Auto-detected)

GIMS automatically detects API keys from environment variables. Add to your shell profile (`~/.zshrc`, `~/.bashrc`, etc.):

```bash
# Gemini (recommended - free)
export GEMINI_API_KEY="your-api-key-here"

# OpenAI
export OPENAI_API_KEY="your-api-key-here"

# Groq
export GROQ_API_KEY="your-api-key-here"
```

Then reload your shell: `source ~/.zshrc`

> **💡 Tip:** If multiple API keys are set, GIMS auto-selects in order: Gemini → OpenAI → Groq

### Getting API Keys

<details>
<summary><b>🔷 Gemini (Recommended)</b></summary>

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Set it: `export GEMINI_API_KEY="your-key"` or run `g setup --api-key gemini`

</details>

<details>
<summary><b>🟢 Groq</b></summary>

1. Visit [Groq Console](https://console.groq.com/keys)
2. Create a new API key
3. Set it: `export GROQ_API_KEY="your-key"` or run `g setup --api-key groq`

</details>

<details>
<summary><b>🟡 OpenAI</b></summary>

1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Set it: `export OPENAI_API_KEY="your-key"` or run `g setup --api-key openai`

</details>

---

## 🔧 Configuration

```bash
# View current settings
g config --list

# Enable conventional commits (feat:, fix:, etc.)
g config --set conventional=true

# Auto-stage all changes before commit
g config --set autoStage=true

# Disable clipboard copy
g config --set copy=false

# Show/hide progress indicators
g config --set progressIndicators=true
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `provider` | string | `auto` | AI provider: `gemini`, `openai`, `groq`, `auto`, `none` |
| `model` | string | — | Override default model for provider |
| `conventional` | boolean | `false` | Use Conventional Commits format |
| `autoStage` | boolean | `false` | Auto-stage all changes |
| `copy` | boolean | `true` | Copy suggestions to clipboard |
| `progressIndicators` | boolean | `true` | Show progress spinners |

---

## 📖 Usage Examples

### Daily Workflow

```bash
g s              # Check what's changed
g sp             # Safe pull (won't lose uncommitted work)
# ... do your work ...
g o              # Commit everything with AI message + push
```

### Code Review Before Commit

```bash
g r              # Get AI review of your changes
g o              # Commit if review looks good
```

### Handling Branch Issues

```bash
g fix            # See sync status and options
g fix --ai       # Get AI recommendation
g fix --merge    # Merge remote changes
g fix --rebase   # Rebase onto remote
```

### Working with Stashes

```bash
g ss             # Quick stash
g main           # Switch to main and pull
# ... check something ...
g pop            # Get your work back
```

### Large Changeset

```bash
g split          # Get suggestions for splitting changes
g sg --multiple  # Get multiple commit message options
```

---

## 🆚 GIMS vs Plain Git

| Task | Git | GIMS |
|------|-----|------|
| Commit & push | `git add . && git commit -m "msg" && git push` | `g o` |
| Pull with uncommitted changes | `git stash && git pull && git stash pop` | `g sp` |
| Check status | `git status` | `g s` (+ AI insights) |
| Fix diverged branch | Multiple commands + decisions | `g fix --ai` |
| Code review | External tool | `g r` |

---

## 🆘 Getting Help

```bash
g --help         # Full command list with descriptions
g q              # Quick reference card
g <command> -h   # Help for specific command
```

---

## 🤝 Contributing

Contributions are welcome! Feel free to:

- 🐛 Report bugs
- 💡 Suggest features
- 🔧 Submit pull requests

---

## 📄 License

MIT © [S41R4J](https://github.com/s41r4j)

---

<div align="center">

**[⬆ Back to Top](#-gims---git-made-simple)**

Made with ❤️ for developers who'd rather code than write commit messages

</div>