# 🚀 GIMS - Git Made Simple

<div align="center">
  
  [![npm version](https://img.shields.io/npm/v/gims.svg)](https://npmjs.org/package/gims)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Node.js Version](https://img.shields.io/node/v/gims.svg)](https://nodejs.org/)
  [![AI Powered](https://img.shields.io/badge/AI-Powered-blueviolet.svg)](https://github.com/yourusername/gims)

  **The AI-powered Git CLI that writes your commit messages for you**
  
  *Because life's too short for "fix stuff" commits* 🎯

</div>

---

## ✨ What is GIMS?

GIMS is a revolutionary Git CLI tool that uses AI to automatically generate meaningful commit messages from your code changes. Say goodbye to generic "update code" commits and hello to descriptive, professional commit messages that actually tell a story.

### 🎬 See It In Action

```bash
# Traditional Git workflow 😴
git add .
git commit -m "update stuff"  # 🤦‍♂️
git push

# GIMS workflow ⚡
g o  # AI analyzes changes, commits with perfect message, and pushes!
```

## 🌟 Features

### 🤖 **AI-Powered Commit Messages**
- OpenAI, Google Gemini, and Groq support with automatic provider selection
- Smart diff analysis that understands your code changes
- Handles large codebases with intelligent summarization and safe truncation
- Optional Conventional Commits formatting and optional commit body generation (`--conventional`, `--body`)

### ⚡ **Lightning Fast Workflow**
- One command commits: `g o` - analyze, commit, and push
- Smart suggestions: `g s` - get AI-generated messages copied to clipboard
- Local commits: `g l` - commit locally with AI messages
- Staged-only by default for suggestions for precise control (use `--all` to stage everything)

### 🧠 **Intelligent Code Analysis**
- Analyzes actual code changes, not just file names
- Understands context from function changes, imports, and logic
- Graceful fallbacks for extremely large changesets and offline use

### 🛠️ **Developer-Friendly**
- Numbered commit history with `g ls` / `g ll` and index-aware commands
- Smart branching: `g b 5` creates branch from commit #5
- Safe operations with confirmations and dry-run support
- JSON output for editor integrations
- Quality-of-life: `--amend`, `undo` command, and automatic upstream setup on push
- Manual commit command for custom messages: `g m "your message"`

## 🚀 Quick Start

### Installation

```bash
npm install -g gims
```

### Setup AI (Choose One)

**Option 1: OpenAI**
```bash
export OPENAI_API_KEY="your-api-key-here"
```

**Option 2: Google Gemini**
```bash
export GEMINI_API_KEY="your-api-key-here"
```

**Option 3: Groq**
```bash
export GROQ_API_KEY="your-api-key-here"
# Optional, if self-hosting/proxying
export GROQ_BASE_URL="https://api.groq.com/openai/v1"
```

GIMS auto-detects configured providers. If none are configured, it uses a local heuristic to generate sensible messages.

### Your First AI Commit

```bash
# Make some changes to your code
echo "console.log('Hello GIMS!');" > hello.js

# Let AI commit it for you
g o
# Output: Committed & pushed: "Add hello world console log"
```

## 📖 Commands Reference

| Command | Alias | Description | Example |
|---------|-------|-------------|---------|
| `gims init` | `g i` | Initialize new Git repo | `g i` |
| `gims clone <repo>` | `g c` | Clone repository | `g c https://github.com/user/repo` |
| `gims suggest` | `g s` | Generate & copy commit message from staged changes (use `--all` to stage) | `g s --all` |
| `gims local` | `g l` | AI commit locally | `g l` |
| `gims online` | `g o` | AI commit + push (use `--set-upstream` on first push) | `g o --set-upstream` |
| `gims commit <message...>` | `g m` | Commit with a custom message (no AI) | `g m "fix: handle empty input"` |
| `gims pull` | `g p` | Pull latest changes | `g p` |
| `gims amend` | `g a` | Stage all changes and amend the last commit (reuse message) | `g a` |
| `gims list` | `g ls` | Show numbered commit history | `g ls` |
| `gims largelist` | `g ll` | Detailed commit history | `g ll` |
| `gims branch <n>` | `g b` | Branch from commit #n | `g b 3 feature-x` |
| `gims reset <n>` | `g r` | Reset to commit #n (`--hard` needs `--yes`) | `g r 5 --hard --yes` |
| `gims revert <n>` | `g rv` | Safely revert commit #n (requires `--yes`) | `g rv 2 --yes` |
| `gims undo` | `g u` | Undo last commit (soft reset by default) | `g u` or `g u --hard --yes` |

### Global Options

- `--provider <name>`: AI provider: `auto` | `openai` | `gemini` | `groq` | `none`
- `--model <name>`: Override model identifier for the chosen provider
- `--staged-only`: Use only staged changes (default behavior for `g s`)
- `--all`: Stage all changes before running
- `--no-clipboard`: Do not copy suggestion to clipboard (for `g s`)
- `--body`: Generate a commit body in addition to subject
- `--conventional`: Format subject using Conventional Commits
- `--dry-run`: Print what would happen without committing/pushing
- `--verbose`: Verbose logging
- `--json`: Machine-readable output for `g s`
- `--yes`: Confirm destructive actions without prompting (e.g., reset/revert/undo)
- `--amend`: Amend the last commit instead of creating a new one
- `--set-upstream`: On push, set upstream if the current branch has none

## 💡 Real-World Examples

### 🔧 Bug Fix
```bash
# You fix a null pointer exception
g o
# AI generates: "Fix null pointer exception in user authentication"
```

### ✨ New Feature
```bash
# You add a search function
g o  
# AI generates: "Add search functionality with pagination support"
```

### 📚 Documentation
```bash
# You update README and add comments
g o
# AI generates: "Update documentation and add inline code comments"
```

### 🎨 Refactoring
```bash
# You clean up code structure
g o
# AI generates: "Refactor authentication module for better maintainability"
```

## 🔥 Pro Tips

### 🎯 Perfect Workflow
```bash
g p                 # Pull latest changes
# ... code your features ...
g s                 # Preview AI suggestion from staged changes
g s --all           # Or stage everything and suggest
g l                 # Commit locally first
# ... test your changes ...
g o --set-upstream  # Push with automatic upstream setup on first push
```

### 🧠 Smart Branching
```bash
g ls                # See numbered history
g b 5 hotfix        # Branch from commit #5
g l                 # Make changes and commit
g checkout main && g pull  # Back to main
```

### 🛡️ Safe Experimentation
```bash
g l                 # Commit your experiment
# ... code breaks something ...
g r 1 --soft --yes  # Soft reset to previous commit (confirmed)
# ... or ...
g u --yes           # Undo last commit (soft)
```

## ⚙️ Configuration

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | OpenAI API access |
| `GEMINI_API_KEY` | Google Gemini API access |
| `GROQ_API_KEY` | Groq API access (OpenAI-compatible) |
| `GROQ_BASE_URL` | Groq API base URL (optional) |
| `GIMS_PROVIDER` | Default provider: `auto` | `openai` | `gemini` | `groq` | `none` |
| `GIMS_MODEL` | Default model identifier for provider |
| `GIMS_CONVENTIONAL` | `1` to enable Conventional Commits by default |
| `GIMS_COPY` | `0` to disable clipboard copying in `g s` by default |

### .gimsrc (optional)

Place a `.gimsrc` JSON file in your repo root or home directory to set defaults:

```json
{
  "provider": "auto",
  "model": "gpt-4o-mini",
  "conventional": true,
  "copy": true
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

## 📈 Stats

- ⚡ Faster commits than traditional Git workflow
- 🎯 High accuracy in commit message relevance
- 📚 Zero learning curve - if you know Git, you know GIMS
- 🌍 Works everywhere - Mac, Windows, Linux, WSL

## 🗺️ Roadmap

- [ ] 🔌 Plugin system for custom AI providers
- [ ] 📊 Commit message templates and customization
- [ ] 🌐 Multi-language commit message support
- [ ] 🔄 Integration with popular Git GUIs
- [ ] 📱 Mobile companion app

## 📄 License

MIT © [Your Name](https://github.com/yourusername)

---

<div align="center">

**⭐ Star this repo if GIMS makes your Git workflow awesome!**

[Report Bug](https://github.com/yourusername/gims/issues) • [Request Feature](https://github.com/yourusername/gims/issues) • [Documentation](https://github.com/yourusername/gims/wiki)

*Made with ❤️ by developers who hate writing commit messages*

</div>
