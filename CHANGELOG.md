# Changelog

## [0.8.1] - 2025-12-19

### 🚀 Smart Sync Fix
New `g fix` command to handle branch sync issues (diverged/ahead/behind):

| Option | What it does |
|--------|--------------|
| `g fix` | Show status and available options |
| `g fix --ai` | Get AI recommendation for best approach |
| `g fix --merge` | Merge remote into local |
| `g fix --rebase` | Rebase local onto remote |
| `g fix --local --yes` | Force push local to remote |
| `g fix --remote --yes` | Reset to remote, discard local |

### 🔧 Conflict Helper
New `g conflicts` command shows conflicted files and how to resolve them.

---

## [0.8.0] - 2025-12-19

### 🚀 New Workflow Shorthand Commands
Multi-step git workflows simplified to single commands:

| Command | Alias | What it does |
|---------|-------|--------------|
| `safe-pull` | `sp` | Stash → Pull → Stash pop (safe pull with uncommitted changes) |
| `main` | - | Switch to main/master and pull latest |
| `unstage` | `us` | Unstage all staged files |
| `discard` | `x` | Discard all changes (with --yes confirmation) |
| `stash-save` | `ss` | Quick stash all changes with auto-generated name |
| `stash-pop` | `pop` | Pop the latest stash |
| `delete-branch` | `del` | Delete branch locally and remotely |
| `cleanup` | `clean` | Remove local branches deleted from remote |
| `last` | - | Show last commit details and diff |

---

## [0.7.2] - 2025-12-18

### 🐛 Bug Fix
- **Fixed progress spinner garbage output**: Spinner now properly clears the line when stopping, preventing partial text artifacts like ` (1ms)rating AI review ⠋`

---

## [0.7.1] - 2025-12-18

### 🐛 Bug Fix
- **Fixed AI suggestions in interactive mode**: Multiple suggestions now correctly display message strings instead of `[object Object]`

---

## [0.7.0] - 2025-12-18

### 🚀 New Intelligent Commands
- **`g wip`**: Quick work-in-progress commit - stage all and commit instantly
- **`g today` / `g t`**: Show all commits made today with timestamps
- **`g stats`**: Personal commit statistics with streak tracking, type breakdown, and style analysis
- **`g review` / `g r`**: AI code review before committing - shows complexity, detected patterns, and suggested message
- **`g split`**: Smart suggestions for splitting large changesets into atomic commits

### ✨ Enhanced Status
- **File type emojis**: 📄 JS, 🎨 CSS, 🧪 tests, ⚙️ config, 📦 package.json, etc.
- **Session awareness**: Shows time since last commit and daily commit count
- **Branch context**: Detects branch type from naming patterns (feat/, fix/, etc.)
- **Smarter insights**: Suggests staging, split commits, and more

### 🧠 Intelligence Module
- **Commit pattern analysis**: Learns your style from git history
- **Semantic change detection**: Identifies breaking changes, new features, bug fixes
- **Complexity analysis**: Visual indicators for simple/moderate/complex changes

### 📊 UX Improvements
- **Time elapsed display**: Shows how long operations take
- **Random tips**: Contextual tips to help learn GIMS features
- **Cached response indicators**: Know when AI cache is used
- **Better quick-help**: Reorganized command reference with new commands

---

## [0.6.7] - 2025-10-26

### 🔧 Fixes
- **Added `-v` flag for version**: Now `g -v` or `gims -v` shows the version number
- **Renamed command**: Changed `help-quick` to `quick-help` (alias `q` still works)
- **Added `push` command**: Now `g push` or `gims push` works as a standalone command

---

## [0.6.6] - 2025-10-26

### 🔧 Improvements
- **Removed commit message length restriction**: AI can now generate commit messages of any length (no more `...` truncation at 72 chars)
- **Added confirmation prompt for local heuristics**: When no AI provider is configured, the tool now asks for confirmation `[Y/n]` before committing
  - Default is `Y` (just press Enter to accept)
  - Warning message clearly indicates "local heuristics" instead of AI
  - Can be bypassed with `--yes` flag for automation
- **Better user awareness**: Users are now informed when local heuristics are used instead of AI

### 📚 User Experience
- More transparent about when AI is used vs. local pattern matching
- Safer commits when API keys are not configured

---

## [0.6.5] - 2025-10-20

### 🔧 Command Behavior Updated
- **`g a` (amend) default behavior changed**: Now keeps the original commit message by default (`--no-edit`)
- **New `--edit` flag**: Use `g a --edit` to generate a new AI commit message
- **Simpler workflow**: `g a` simply merges current changes into previous commit without editing the message

### 📚 Documentation Updates
- Updated all documentation to reflect the new amend behavior
- Clarified that `g a` merges changes while keeping the original message

---

## [0.6.4] - 2025-10-19

### 🔧 Command Aliases Fixed
- **Fixed `g i` alias**: Now correctly initializes a git repository (was incorrectly mapped to interactive mode)
- **Updated `g interactive` alias**: Changed from `g i` to `g int` to avoid conflicts
- **Verified `g ls` and `g ll`**: Both commands working correctly (short and detailed commit history)

### 📚 Documentation Updates
- Updated `QUICK_REFERENCE.md` to reflect correct command aliases
- Updated help output (`g q`) to show correct mappings

---

## [0.6.2] - 2024-12-19

### 🚀 AI Model Updates
- **Updated to latest AI models**:
  - Gemini: `gemini-2.5-flash` (latest and fastest)
  - OpenAI: `gpt-5` (latest GPT model)
  - Groq: `groq/compound` (latest Groq model)

### 📚 Documentation
- **Simplified README**: Reduced from verbose to concise format
- **Focused on essentials**: Quick start, main commands, examples
- **Better readability**: Easier to scan and understand

### 🧹 Repository Cleanup
- Removed development-specific files (.kiro/, .github/, coverage/)
- Updated .gitignore to exclude dev directories
- Cleaner package for npm distribution

---

## [0.6.1] - 2024-12-19

### ✨ Enhanced User Experience
- **Single-letter aliases** for main workflow commands
- **Quick API setup**: `g setup --api-key <provider>`
- **Better onboarding**: Clear setup instructions with direct links
- **Quick help**: `g q` command for instant reference

### 🔧 Improved Commands
- `g s` - Status (enhanced git status)
- `g i` - Interactive (guided commit wizard)
- `g p` - Preview (see what will be committed)
- `g l` - Local (AI commit locally)
- `g o` - Online (AI commit + push)
- `g h` - History (numbered commit log)
- `g a` - Amend (smart amend with AI)
- `g u` - Undo (undo last commit)

---

## [0.6.0] - 2024-12-19

### 🚀 Major Enhanced Release
- **Interactive commit wizard** with multiple AI suggestions
- **Enhanced git status** with AI insights and project analysis
- **Modular architecture** for better performance and maintainability
- **Smart configuration** with project type detection
- **Progress indicators** and better error handling
- **Caching system** for improved AI response times

---

## [0.5.4] - Previous Version
- Basic AI-powered commit messages
- Simple configuration
- Core git operations