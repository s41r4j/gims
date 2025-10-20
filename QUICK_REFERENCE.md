# 🚀 GIMS Quick Reference

## Single-Letter Workflow Commands

```bash
g s    # Status - Enhanced git status with AI insights
g i    # Init - Initialize a new Git repository
g p    # Preview - See what will be committed
g l    # Local - AI commit locally
g o    # Online - AI commit + push
g ls   # List - Short commit history
g ll   # Large List - Detailed commit history  
g h    # History - Alias for list
g a    # Amend - Merge changes into previous commit (keeps message)
g u    # Undo - Undo last commit
```

## Quick Setup

```bash
# Choose your AI provider (one-time setup)
g setup --api-key gemini    # 🚀 Recommended: Fast & free
g setup --api-key openai    # 💎 High quality
g setup --api-key groq      # ⚡ Ultra fast

# Or run full setup wizard
g setup
```

## Essential Workflow

```bash
# 1. Check what's changed
g s

# 2. Commit with AI (choose one)
g int        # Interactive mode (guided)
g o          # One-command: commit + push
g l          # Local commit only

# 3. View history
g ls         # Recent commits (short)
g ll         # Recent commits (detailed)
g h          # Same as g ls
```

## Default AI Models

- **Gemini**: `gemini-2.5-flash` (Fast, free, recommended)
- **OpenAI**: `gpt-5` (Latest GPT model)
- **Groq**: `groq/compound` (Ultra-fast inference)

## Pro Tips

```bash
g sg --multiple    # Get 3 AI suggestions
g p               # Preview before committing
g a               # Amend: merge changes to previous commit (keeps message)
g a --edit        # Amend with new AI-generated message
g sync --rebase   # Smart sync with rebase
g stash           # Stash with AI description
```

## Configuration

```bash
g config --list                    # View all settings
g config --set conventional=true   # Enable conventional commits
g config --set autoStage=true      # Auto-stage changes
g config --set provider=gemini     # Set AI provider
```

## Help

```bash
g --help          # All commands
g q               # This quick reference
```