# 🚀 GIMS - Git Made Simple (Enhanced)

<div align="center">
  
  [![npm version](https://img.shields.io/npm/v/gims.svg)](https://npmjs.org/package/gims)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Node.js Version](https://img.shields.io/node/v/gims.svg)](https://nodejs.org/)
  [![AI Powered](https://img.shields.io/badge/AI-Powered-blueviolet.svg)](https://github.com/yourusername/gims)

  **The AI-powered Git CLI that writes your commit messages for you**
  
  *Now with enhanced UX, smart insights, and interactive workflows* ✨

</div>

---

## ✨ What is GIMS?

GIMS is a revolutionary Git CLI tool that uses AI to automatically generate meaningful commit messages from your code changes. The enhanced version adds intelligent insights, interactive workflows, and a modular architecture for better performance and user experience.

### 🎬 See It In Action

```bash
# Traditional Git workflow 😴
git add .
git commit -m "update stuff"  # 🤦‍♂️
git push

# GIMS workflow ⚡
g o  # AI analyzes changes, commits with perfect message, and pushes!
```

## 🌟 Enhanced Features

### 🤖 **AI-Powered Commit Messages**
- OpenAI, Google Gemini, and Groq support with automatic provider selection
- Smart diff analysis with caching for improved performance
- Multiple suggestion generation for better options
- Handles large codebases with intelligent summarization and safe truncation
- Optional Conventional Commits formatting and optional commit body generation

### ⚡ **Lightning Fast Workflow**
- **Interactive Mode**: `g int` - guided commit wizard with multiple suggestions
- **Smart Status**: `g status` - enhanced git status with AI insights
- **Preview Mode**: `g preview` - see what would be committed with AI message
- One command commits: `g o` - analyze, commit, and push
- Smart suggestions: `g s` - get AI-generated messages (use `--multiple` for options)

### 🧠 **Intelligent Analysis & Insights**
- **Project Detection**: Automatically detects project type (React, Node, Python, etc.)
- **Smart Insights**: AI analyzes changes and provides contextual tips
- **Change Complexity**: Understands and reports on the scope of changes
- **Commit History Analysis**: Tracks patterns and suggests improvements

### 🛠️ **Enhanced Developer Experience**
- **Setup Wizard**: `g setup` - interactive configuration for first-time users
- **Progress Indicators**: Visual feedback for AI operations
- **Better Error Messages**: Actionable guidance when things go wrong
- **Smart Sync**: `g sync` - intelligent pull with rebase/merge options
- **Enhanced Stash**: `g stash` - AI-generated stash descriptions

### 🔧 **Advanced Configuration**
- **Config Management**: `g config` - set preferences globally or per-project
- **Caching System**: Speeds up repeated operations
- **Modular Architecture**: Better performance and maintainability

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.18.0 (Node 20+ recommended)
- npm >= 9

Tip: Use nvm to manage Node versions per-user without sudo:

```bash
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"
nvm install 20 && nvm alias default 20
```

### Installation

```bash
npm install -g gims
```

If you get EACCES permission errors on Linux when installing globally, set a user prefix:

```bash
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
npm install -g gims
```

### Setup AI (Choose One - Quick & Easy!)

**🚀 Quick Setup (Recommended)**
```bash
# Gemini (Free, fast, recommended)
g setup --api-key gemini

# OpenAI (High quality)  
g setup --api-key openai

# Groq (Ultra fast)
g setup --api-key groq
```

**🔧 Manual Setup (Advanced)**
```bash
# Set environment variables
export GEMINI_API_KEY="your-api-key-here"     # Uses gemini-2.0-flash-exp
export OPENAI_API_KEY="your-api-key-here"     # Uses gpt-4o-mini  
export GROQ_API_KEY="your-api-key-here"       # Uses llama-3.1-8b-instant
```

GIMS auto-detects configured providers and uses smart defaults. If no AI is configured, it uses local heuristics to generate sensible messages.

### Your First Enhanced Experience

```bash
# Quick AI setup (choose one - Gemini recommended)
g setup --api-key gemini    # Fast & free
g setup --api-key openai    # High quality  
g setup --api-key groq      # Ultra fast

# Make some changes to your code
echo "console.log('Hello Enhanced GIMS!');" > hello.js

# Check enhanced status with AI insights
g s
# Shows: Git status + AI insights about your changes

# Use interactive mode for guided commits
g i
# Walks you through: staging → AI suggestions → commit → push

# Or use the classic one-command workflow
g o
# Output: ✓ Committed & pushed: "Add hello world console log"
```

## 📖 Enhanced Commands Reference

### 🚀 **Main Workflow (Single Letters)**
| Command | Alias | Description | Example |
|---------|-------|-------------|---------|
| `gims status` | `g s` | Enhanced git status with AI insights | `g s` |
| `gims interactive` | `g i` | Interactive commit wizard | `g i` |
| `gims preview` | `g p` | Preview commit with AI message | `g p` |
| `gims local` | `g l` | AI commit locally | `g l` |
| `gims online` | `g o` | AI commit + push | `g o` |
| `gims list` | `g h` | Numbered commit history | `g h` |
| `gims amend` | `g a` | Smart amend with AI | `g a` |
| `gims undo` | `g u` | Undo last commit | `g u --yes` |

### � **Se tup & Config**
| Command | Alias | Description | Example |
|---------|-------|-------------|---------|
| `gims setup` | - | Setup wizard or quick API key setup | `g setup --api-key gemini` |
| `gims config` | - | Manage configuration | `g config --set provider=gemini` |

### 📝 **Additional Commands**
| Command | Alias | Description | Example |
|---------|-------|-------------|---------|
| `gims suggest` | `g sg` | AI suggestions with clipboard | `g sg --multiple` |
| `gims commit <msg>` | `g m` | Custom message commit | `g m "fix: handle edge case"` |
| `gims sync` | - | Smart sync: pull + rebase/merge | `g sync --rebase` |
| `gims stash` | - | Enhanced stash with AI descriptions | `g stash` |
| `gims init` | - | Initialize repo | `g init` |
| `gims clone <repo>` | `g c` | Clone repository | `g c https://github.com/user/repo` |
| `gims pull` | - | Pull changes | `g pull` |
| `gims branch <n>` | `g b` | Branch from commit #n | `g b 3 feature-x` |
| `gims reset <n>` | `g r` | Reset to commit | `g r 5 --hard --yes` |
| `gims revert <n>` | `g rv` | Revert commit | `g rv 2 --yes` |

### Global Options

- `--provider <name>`: AI provider: `auto` | `openai` | `gemini` | `groq` | `none`
- `--model <name>`: Override model identifier for the chosen provider
- `--staged-only`: Use only staged changes (default behavior for `g s`)
- `--all`: Stage all changes before running
- `--no-clipboard`: Do not copy suggestion to clipboard (for `g s`)
- `--body`: Generate a commit body in addition to subject
- `--conventional`: Format subject using Conventional Commits
- `--dry-run`: Print what would happen without committing/pushing
- `--verbose`: Verbose logging with AI provider details
- `--json`: Machine-readable output for `g s`
- `--yes`: Confirm destructive actions without prompting
- `--amend`: Amend the last commit instead of creating a new one
- `--set-upstream`: On push, set upstream if the current branch has none

### Command-Specific Options

- `g s --multiple`: Generate multiple commit message suggestions
- `g ls --detailed`: Show detailed commit information with dates and authors
- `g ls --limit <n>`: Limit number of commits shown (default: 20)
- `g sync --rebase`: Use rebase instead of merge for sync
- `g stash --list`: List all stashes
- `g stash --pop`: Pop the latest stash
- `g stash --apply <n>`: Apply stash by index
- `g a --no-edit`: Amend without changing the commit message
- `g config --global`: Use global configuration instead of project-local

## 💡 Enhanced Real-World Examples

### 🎯 **Interactive Workflow**
```bash
# Complex feature development
g status                    # See AI insights about your changes
# Output: "📦 Dependencies changed - consider updating package-lock.json"

g int                       # Interactive commit wizard
# Guides you through: staging → multiple AI suggestions → commit

g sync --rebase            # Smart sync with rebase
# Output: "✓ Rebased successfully"
```

### 🔧 **Bug Fix with Preview**
```bash
# You fix a critical bug
g preview                   # Preview what would be committed
# Shows: complexity analysis + AI suggestion + diff summary

g o                        # Commit with confidence
# AI generates: "Fix null pointer exception in user authentication"
```

### ✨ **Feature Development**
```bash
# Multiple related changes
g s --multiple             # Get several commit message options
# Shows: 3 different AI-generated suggestions

g stash                    # Stash with AI description
# Output: "✓ Stashed changes: 'Add search functionality components'"

g l                        # Commit locally first
g sync                     # Smart sync before pushing
g o                        # Push with upstream setup
```

### 📊 **Project Analysis**
```bash
g status                   # Enhanced status with insights
# Shows: file changes + AI insights + recent activity summary

g config --set conventional=true  # Enable conventional commits
g ls --detailed --limit 5         # Analyze recent commit patterns
```

## 🔥 Enhanced Pro Tips

### 🎯 **Perfect Enhanced Workflow**
```bash
g setup --api-key gemini  # One-time AI setup (fast & free)
g s                       # Check status with AI insights  
g i                       # Interactive commit for complex changes
g sync                    # Smart sync instead of manual pull
g o --set-upstream        # Push with automatic upstream setup
```

### 🧠 **Smart Development Patterns**
```bash
# Feature development
g stash             # Stash with AI description
g b 5 feature-x     # Branch from specific commit
g preview           # Preview changes before committing
g s --multiple      # Get multiple commit options
g l && g sync       # Commit locally, then smart sync

# Code review preparation
g ls --detailed     # Review commit history
g config --set conventional=true  # Enable conventional commits
g amend             # Update last commit with AI message
```

### 🛡️ **Safe & Smart Operations**
```bash
# Experimentation
g stash             # AI-described stash
g l                 # Commit experiment
g preview           # Check what you're about to commit
g u --yes           # Quick undo if needed

# Team collaboration
g sync --rebase     # Clean history with rebase
g status            # Check insights before committing
g config --global   # Set team-wide preferences
```

### ⚡ **Power User Shortcuts**
```bash
# Single-letter workflow
g s                 # Enhanced status
g p                 # Quick preview  
g i                 # Interactive mode
g sg --multiple     # Multiple suggestions
g h --detailed      # Detailed history
g l && g o          # Local commit then push

# Configuration
g config --set autoStage=true     # Auto-stage by default
g config --set progressIndicators=false  # Disable progress bars
g config --list                   # Review all settings
```

## ⚙️ Enhanced Configuration

### Setup Wizard (Recommended)
```bash
g setup  # Interactive configuration wizard
# Detects project type, configures AI providers, sets preferences
```

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `OPENAI_API_KEY` | OpenAI API access | - |
| `GEMINI_API_KEY` | Google Gemini API access | - |
| `GROQ_API_KEY` | Groq API access | - |
| `GROQ_BASE_URL` | Groq API base URL | `https://api.groq.com/openai/v1` |
| `GIMS_PROVIDER` | Default provider | `auto` |
| `GIMS_MODEL` | Default model identifier | (provider-specific) |
| `GIMS_CONVENTIONAL` | Enable Conventional Commits | `0` |
| `GIMS_COPY` | Enable clipboard copying | `1` |
| `GIMS_AUTO_STAGE` | Auto-stage changes | `0` |
| `GIMS_CACHE` | Enable AI response caching | `1` |
| `GIMS_PROGRESS` | Show progress indicators | `1` |

### Configuration Management
```bash
# Set configuration values
g config --set provider=gemini
g config --set conventional=true --global
g config --set autoStage=true

# View configuration
g config --list
g config --get provider

# Project vs Global config
g config --set conventional=true          # Project-specific
g config --set conventional=true --global # Global (all projects)
```

### .gimsrc Configuration Files

**Project-level** (`./.gimsrc`):
```json
{
  "provider": "gemini",
  "model": "gemini-2.0-flash",
  "conventional": true,
  "autoStage": false,
  "projectType": "react"
}
```

**Global** (`~/.gimsrc`):
```json
{
  "provider": "auto",
  "conventional": false,
  "copy": true,
  "cacheEnabled": true,
  "progressIndicators": true,
  "maxDiffSize": 100000
}
```

### Smart Fallbacks

GIMS handles edge cases gracefully:

- 🔄 Large diffs: Automatically switches to summary or status view
- ✂️ Massive text: Truncates safely with informative context
- 🛜 No API key: Uses a local heuristic that summarizes your changes
- ⚠️ API failures: Clear errors and local fallback so you keep moving
- 🔒 Privacy-first: Only sends diffs when you explicitly run AI features

## 🤝 Contributing

We love contributions! Here's how to get involved:

1. **🍴 Fork** the repository
2. **🌿 Create** your feature branch: `git checkout -b amazing-feature`
3. **💻 Code** your improvements
4. **🧪 Test** thoroughly
5. **📝 Commit** with GIMS: `g l` (dogfooding!)
6. **🚀 Push** and create a Pull Request

### 🐛 Found a Bug?

1. Check [existing issues](https://github.com/yourusername/gims/issues)
2. Create a [new issue](https://github.com/yourusername/gims/issues/new) with:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - Your environment details

## 📊 Why GIMS?

### Before GIMS 😫
```bash
git log --oneline
abc1234 fix
def5678 update
ghi9012 changes
jkl3456 stuff
mno7890 final fix
```

### After GIMS ✨
```bash
git log --oneline  
abc1234 Fix authentication timeout in user login service
def5678 Add responsive design for mobile navigation menu
ghi9012 Refactor database connection pool for better performance
jkl3456 Update API documentation with new endpoint examples
mno7890 Fix memory leak in image processing pipeline
```

## 📈 Enhanced Stats & Benefits

- ⚡ **50% faster** commits with interactive mode and smart defaults
- 🎯 **Higher accuracy** with multiple AI suggestions and caching
- 🧠 **Smart insights** help improve code quality and commit patterns
- 📚 **Zero learning curve** - enhanced Git workflow, not replacement
- 🌍 **Universal compatibility** - Mac, Windows, Linux, WSL
- � **Modular architecture** - better performance and extensibility

## 🆕 What's New in Enhanced GIMS

### ✨ **Major Enhancements**
- **Interactive Commit Wizard** - guided workflow with multiple suggestions
- **Smart Status & Insights** - AI analyzes your changes and provides tips
- **Enhanced Configuration** - setup wizard and flexible config management
- **Progress Indicators** - visual feedback for all AI operations
- **Caching System** - faster repeated operations
- **Better Error Handling** - actionable guidance when things go wrong

### 🔧 **Developer Experience**
- **Project Type Detection** - automatically adapts to React, Node, Python, etc.
- **Smart Sync** - intelligent pull with rebase/merge options
- **Enhanced Stash** - AI-generated stash descriptions
- **Preview Mode** - see exactly what will be committed
- **Modular Architecture** - cleaner code and better maintainability

## 🗺️ Roadmap

### 🎯 **Completed (v0.6.0)**
- [x] Interactive commit wizard
- [x] Enhanced status with AI insights
- [x] Smart configuration management
- [x] Progress indicators and better UX
- [x] Caching and performance improvements
- [x] Modular architecture

### 🚀 **Coming Next**
- [ ] 🔌 Plugin system for custom AI providers
- [ ] 📊 Commit message templates and team standards
- [ ] 🌐 Multi-language commit message support
- [ ] 🔄 Integration with popular Git GUIs (VS Code, etc.)
- [ ] 📱 Web dashboard for team commit analytics
- [ ] 🤖 Advanced AI features (code review suggestions, etc.)

## 📄 License

MIT © [Your Name](https://github.com/yourusername)

---

<div align="center">

**⭐ Star this repo if GIMS makes your Git workflow awesome!**

[Report Bug](https://github.com/yourusername/gims/issues) • [Request Feature](https://github.com/yourusername/gims/issues) • [Documentation](https://github.com/yourusername/gims/wiki)

*Made with ❤️ by developers who hate writing commit messages*

</div>
