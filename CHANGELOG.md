# Changelog

## [0.6.0] - Enhanced GIMS - 2024-12-19

### 🚀 Major Features Added

#### **Interactive & Enhanced UX**
- **Interactive Commit Wizard** (`g int`) - Guided workflow with multiple AI suggestions
- **Enhanced Status** (`g status`) - Git status with AI insights and project analysis
- **Preview Mode** (`g preview`) - See commit preview with AI message and diff analysis
- **Setup Wizard** (`g setup`) - Interactive first-time configuration
- **Progress Indicators** - Visual feedback for all AI operations

#### **Smart Configuration Management**
- **Config Command** (`g config`) - Manage settings with `--set`, `--get`, `--list`
- **Project Type Detection** - Automatically detects React, Node, Python, etc.
- **Enhanced .gimsrc** - More configuration options and better validation
- **Global vs Local Config** - Project-specific or user-wide settings

#### **Advanced Git Operations**
- **Smart Sync** (`g sync`) - Intelligent pull with rebase/merge options
- **Enhanced Stash** (`g stash`) - AI-generated stash descriptions
- **Better Amend** (`g amend`) - Smart amend with AI message generation or `--no-edit`
- **Enhanced List** (`g ls`) - Unified list command with `--detailed` and `--limit` options

#### **AI & Performance Improvements**
- **Multiple Suggestions** (`g s --multiple`) - Generate 3 different commit message options
- **Caching System** - Cache AI responses for faster repeated operations
- **Provider Fallback Chain** - Automatic fallback between AI providers
- **Better Error Handling** - Actionable guidance and helpful suggestions

### 🔧 Architecture Improvements

#### **Modular Design**
- Split monolithic `gims.js` into focused modules:
  - `lib/utils/` - Colors, progress indicators
  - `lib/config/` - Configuration management
  - `lib/git/` - Git analysis and insights
  - `lib/ai/` - AI provider management
  - `lib/commands/` - Interactive commands

#### **Enhanced Components**
- **GitAnalyzer** - Smart git status analysis with insights
- **AIProviderManager** - Improved AI handling with caching and fallbacks
- **ConfigManager** - Comprehensive configuration with validation
- **InteractiveCommands** - User interaction and guided workflows
- **Progress** - Visual feedback system

### 📊 User Experience Enhancements

#### **Better Feedback**
- Progress spinners for AI operations
- Success/warning/error indicators with colors
- Actionable error messages with suggestions
- Step-by-step guidance in interactive mode

#### **Smart Defaults**
- Auto-detection of project type and commit style
- Intelligent provider selection
- Context-aware configuration suggestions

#### **Enhanced Commands**
- All existing commands improved with progress indicators
- Better error handling and user guidance
- Consistent color coding and formatting
- More informative output

### 🛠️ Configuration Options Added

#### **New Environment Variables**
- `GIMS_AUTO_STAGE` - Auto-stage changes by default
- `GIMS_CACHE` - Enable/disable AI response caching
- `GIMS_PROGRESS` - Show/hide progress indicators
- `GIMS_MAX_DIFF_SIZE` - Maximum diff size for AI processing

#### **New .gimsrc Options**
```json
{
  "autoStage": false,
  "cacheEnabled": true,
  "progressIndicators": true,
  "maxDiffSize": 100000,
  "projectType": "react"
}
```

### 📈 Performance Improvements
- **Caching**: AI responses cached for 1 hour
- **Modular Loading**: Components loaded on-demand
- **Better Memory Management**: Efficient diff processing
- **Faster Startup**: Optimized initialization

### 🔄 Breaking Changes
- Removed `largelist` command (merged into `list --detailed`)
- Changed some internal APIs (affects programmatic usage only)
- Updated minimum Node.js version recommendation to 20+

### 🐛 Bug Fixes
- Fixed git status parsing for different git versions
- Improved error handling for large diffs
- Better clipboard handling across platforms
- Fixed configuration file validation

### 📚 Documentation
- Completely updated README with new features
- Added comprehensive examples for all new commands
- Enhanced configuration documentation
- Added troubleshooting guide

---

## [0.5.4] - Previous Version
- Basic AI-powered commit messages
- Simple configuration
- Core git operations
- Single-file architecture