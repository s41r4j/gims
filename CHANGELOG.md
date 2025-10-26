# Changelog

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