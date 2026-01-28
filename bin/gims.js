#!/usr/bin/env node

/*
  gims (Git Made Simple) CLI - Enhanced Version
*/
const { Command } = require('commander');
const simpleGit = require('simple-git');
const clipboard = require('clipboardy');
const process = require('process');

// Enhanced modular imports
const { color } = require('./lib/utils/colors');
const { Progress } = require('./lib/utils/progress');
const { ConfigManager } = require('./lib/config/manager');
const { GitAnalyzer } = require('./lib/git/analyzer');
const { AIProviderManager } = require('./lib/ai/providers');
const { InteractiveCommands } = require('./lib/commands/interactive');
const { Intelligence } = require('./lib/utils/intelligence');
const { VersionCommand } = require('./lib/commands/version');
const { WhoAmICommand } = require('./lib/commands/whoami');

const program = new Command();
const git = simpleGit();

// Initialize enhanced components
const configManager = new ConfigManager();
const gitAnalyzer = new GitAnalyzer(git);
let aiProvider;
let interactive;
let versionCmd;
let whoAmI;

// ... (getOpts function remains) ...

function initializeComponents() {
  const config = configManager.load();
  aiProvider = new AIProviderManager(config);
  interactive = new InteractiveCommands(git, aiProvider, gitAnalyzer);
  versionCmd = new VersionCommand(git, configManager);
  whoAmI = new WhoAmICommand(git);
}

function getOpts() {
  const cfg = configManager.load();
  const cli = program.opts();
  return {
    provider: cli.provider || cfg.provider,
    model: cli.model || cfg.model,
    stagedOnly: !!cli.stagedOnly,
    all: !!cli.all || cfg.autoStage,
    noClipboard: !!cli.noClipboard || cfg.copy === false,
    body: !!cli.body,
    conventional: !!cli.conventional || cfg.conventional,
    dryRun: !!cli.dryRun,
    verbose: !!cli.verbose,
    json: !!cli.json,
    yes: !!cli.yes,
    amend: !!cli.amend,
    setUpstream: !!cli.setUpstream,
    progressIndicators: cfg.progressIndicators !== false,
  };
}



async function ensureRepo() {
  const isRepo = await git.checkIsRepo();
  if (!isRepo) {
    Progress.error('Not a git repository (or any of the parent directories).');
    console.log(`\nTo initialize a new repository, run: ${color.cyan('g init')}`);
    process.exit(1);
  }
}

function handleError(prefix, err) {
  const msg = err && err.message ? err.message : String(err);
  Progress.error(`${prefix}: ${msg}`);

  // Provide helpful suggestions based on error type
  if (msg.includes('not found') || msg.includes('does not exist')) {
    console.log(`\nTip: Check if the file/branch exists with: ${color.cyan('g status')}`);
  } else if (msg.includes('permission') || msg.includes('access')) {
    console.log(`\nTip: Check file permissions or authentication`);
  } else if (msg.includes('merge') || msg.includes('conflict')) {
    console.log(`\nTip: Resolve conflicts and try again`);
  }

  process.exit(1);
}

// Safe log: returns { all: [] } on empty repo
async function safeLog() {
  try {
    return await git.log();
  } catch (e) {
    if (/does not have any commits/.test(e.message)) return { all: [] };
    throw e;
  }
}



async function generateCommitMessage(rawDiff, options = {}) {
  const result = await aiProvider.generateCommitMessage(rawDiff, options);
  // Return both message and whether local heuristics were used
  return result;
}

async function confirmCommit(message, isLocalHeuristic) {
  if (!isLocalHeuristic) return true; // No confirmation needed for AI-generated messages

  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log(color.yellow('\n⚠️  No AI provider configured - using local heuristics'));
  console.log(`Suggested commit: "${message}"`);

  return new Promise((resolve) => {
    rl.question('Proceed with this commit? [Y/n]: ', (answer) => {
      rl.close();
      const trimmed = answer.trim().toLowerCase();
      // Default to 'yes' if empty (just Enter pressed)
      resolve(trimmed === '' || trimmed === 'y' || trimmed === 'yes');
    });
  });
}

async function resolveCommit(input) {
  if (/^\d+$/.test(input)) {
    const { all } = await safeLog();
    // Align with list/largelist which show oldest -> newest
    const ordered = [...all].reverse();
    const idx = Number(input) - 1;
    if (idx < 0 || idx >= ordered.length) throw new Error('Index out of range');
    return ordered[idx].hash;
  }
  return input;
}

async function hasChanges() {
  const status = await git.status();
  return status.files.length > 0;
}

program
  .name('gims')
  .alias('g')
  .version(require('../package.json').version, '--version', 'Output the version number') // Removed -v
  .option('--provider <name>', 'AI provider: auto|openai|gemini|groq|none')
  .option('--model <name>', 'Model identifier for provider')
  .option('--staged-only', 'Use only staged changes (default for suggest)')
  .option('--all', 'Stage all changes before running')
  .option('--no-clipboard', 'Do not copy suggestions to clipboard')
  .option('--body', 'Generate a commit body in addition to subject')
  .option('--conventional', 'Format messages using Conventional Commits')
  .option('--dry-run', 'Do not perform writes (no commit or push)')
  .option('--verbose', 'Verbose logging')
  .option('--json', 'JSON output for suggest')
  .option('--yes', 'Assume yes for confirmations')
  .option('--amend', 'Amend the last commit instead of creating a new one')
  .option('--set-upstream', 'Set upstream on push if missing')
  .hook('preAction', () => {
    initializeComponents();
  });

program.command('setup')
  .description('Run interactive setup wizard')
  .option('--api-key <provider>', 'Quick API key setup (openai|gemini|groq)')
  .action(async (options) => {
    try {
      if (options.apiKey) {
        await setupApiKey(options.apiKey);
      } else {
        await configManager.runSetupWizard();
      }
    } catch (e) {
      handleError('Setup error', e);
    }
  });

async function setupApiKey(provider) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => new Promise(resolve => {
    rl.question(prompt, answer => {
      resolve(answer.trim());
    });
  });

  console.log(color.bold(`\n🔑 ${provider.toUpperCase()} API Key Setup\n`));

  const envVars = {
    'openai': 'OPENAI_API_KEY',
    'gemini': 'GEMINI_API_KEY',
    'groq': 'GROQ_API_KEY'
  };

  const envVar = envVars[provider.toLowerCase()];
  if (!envVar) {
    console.log(color.red('Invalid provider. Use: openai, gemini, or groq'));
    rl.close();
    return;
  }

  console.log(`To get your ${provider.toUpperCase()} API key:`);
  if (provider === 'openai') {
    console.log('1. Go to: https://platform.openai.com/api-keys');
    console.log('2. Create a new API key');
  } else if (provider === 'gemini') {
    console.log('1. Go to: https://aistudio.google.com/app/apikey');
    console.log('2. Create a new API key');
  } else if (provider === 'groq') {
    console.log('1. Go to: https://console.groq.com/keys');
    console.log('2. Create a new API key');
  }

  const apiKey = await question(`\nEnter your ${provider.toUpperCase()} API key: `);

  if (!apiKey) {
    console.log(color.yellow('No API key provided. Setup cancelled.'));
    rl.close();
    return;
  }

  rl.close();

  // Show how to set the environment variable
  console.log(`\n${color.green('✓')} API key received!`);
  console.log('\nTo use this API key, set the environment variable:');
  console.log(color.cyan(`export ${envVar}="${apiKey}"`));
  console.log('\nOr add it to your shell profile (~/.bashrc, ~/.zshrc, etc.):');
  console.log(color.cyan(`echo 'export ${envVar}="${apiKey}"' >> ~/.zshrc`));

  // Set provider in config
  const config = configManager.load();
  config.provider = provider;
  configManager.save(config);

  console.log(`\n${color.green('✓')} Provider set to ${provider} in local config`);
  console.log('\nRestart your terminal and try:');
  console.log(`  ${color.cyan('g sg')} - Get AI suggestions`);
  console.log(`  ${color.cyan('g o')} - AI commit and push`);
}

program.command('status').alias('s')
  .description('Enhanced git status with AI insights')
  .action(async () => {
    await ensureRepo();
    try {
      const enhancedStatus = await gitAnalyzer.getEnhancedStatus();
      console.log(gitAnalyzer.formatStatusOutput(enhancedStatus));

      // Show commit history summary
      const history = await gitAnalyzer.analyzeCommitHistory(5);
      if (history.totalCommits > 0) {
        console.log(`\n${color.bold('Recent Activity:')}`);
        console.log(`${history.recentActivity.last24h} commits in last 24h, ${history.recentActivity.lastWeek} in last week`);
        if (history.conventionalCommits > 0) {
          const percentage = Math.round((history.conventionalCommits / history.totalCommits) * 100);
          console.log(`${percentage}% of recent commits use Conventional Commits format`);
        }
      }
    } catch (e) {
      handleError('Status error', e);
    }
  });

program.command('interactive').alias('int')
  .description('Interactive commit wizard')
  .action(async () => {
    await ensureRepo();
    const opts = getOpts();
    try {
      await interactive.runInteractiveCommit(opts);
    } catch (e) {
      handleError('Interactive commit error', e);
    }
  });

program.command('preview').alias('p')
  .description('Preview commit with AI-generated message')
  .action(async () => {
    await ensureRepo();
    const opts = getOpts();
    try {
      await interactive.showCommitPreview(opts);
    } catch (e) {
      handleError('Preview error', e);
    }
  });

program.command('config')
  .description('Manage GIMS configuration')
  .option('--set <key=value>', 'Set configuration value')
  .option('--get <key>', 'Get configuration value')
  .option('--list', 'List all configuration')
  .option('--global', 'Use global configuration')
  .action(async (options) => {
    try {
      if (options.set) {
        const [key, value] = options.set.split('=');
        if (!key || value === undefined) {
          console.log('Usage: --set key=value');
          return;
        }
        const result = configManager.set(key, value, options.global);
        Progress.success(`Set ${result.key}=${result.value} in ${result.savedPath}`);
      } else if (options.get) {
        const value = configManager.get(options.get);
        console.log(value !== undefined ? value : 'Not set');
      } else if (options.list) {
        const config = configManager.get();
        console.log(color.bold('Current Configuration:'));
        Object.entries(config).forEach(([key, value]) => {
          if (key !== '_source') {
            console.log(`  ${color.cyan(key)}: ${value}`);
          }
        });
        console.log(`\n${color.dim('Source: ' + config._source)}`);
      } else {
        console.log('Use --set, --get, or --list');
      }
    } catch (e) {
      handleError('Config error', e);
    }
  });

program.command('help', { isDefault: true })
  .description('Show structured help menu')
  .action(() => {
    console.log(color.bold('\n🚀 GIMS - Git Made Simple\n'));

    const sections = [
      {
        title: '🤖 AI & Core Workflow',
        cmds: [
          { name: 'g s | status', desc: 'Status with AI insights' },
          { name: 'g o | online', desc: 'Auto-stage + AI commit + Push' },
          { name: 'g l | local', desc: 'Auto-stage + AI commit (local)' },
          { name: 'g r | review', desc: 'AI Code Review detected changes' },
          { name: 'g sg | suggest', desc: 'Get AI message suggestions' },
          { name: 'g int | interactive', desc: 'Interactive commit wizard' }
        ]
      },
      {
        title: '🔄 Sync & Maintenance',
        cmds: [
          { name: 'g sp | safe-pull', desc: 'Safe pull (stash -> pull -> pop)' },
          { name: 'g sync', desc: 'Smart sync (pull + rebase/merge)' },
          { name: 'g f | fix', desc: 'Fix branch sync issues' },
          { name: 'g main', desc: 'Switch to main & pull latest' },
          { name: 'g clean | cleanup', desc: 'Remove dead local branches' },
          { name: 'g del', desc: 'Delete branch (local + remote)' },
          { name: 'g pull', desc: 'Standard git pull' },
          { name: 'g push', desc: 'Standard git push' }
        ]
      },
      {
        title: '📜 History & Inspection',
        cmds: [
          { name: 'g ls | list', desc: 'Compact commit history' },
          { name: 'g ll | largelist', desc: 'Detailed commit history' },
          { name: 'g last', desc: 'Show last commit diff' },
          { name: 'g t | today', desc: 'Show commits made today' },
          { name: 'g stats', desc: 'Personal commit statistics' },
          { name: 'g w | whoami', desc: 'Show system identity' },
          { name: 'g p | preview', desc: 'Preview commit message' }
        ]
      },
      {
        title: '📦 Stashing & Work-in-Progress',
        cmds: [
          { name: 'g ss | stash-save', desc: 'Quick stash save' },
          { name: 'g pop | stash-pop', desc: 'Pop latest stash' },
          { name: 'g stash', desc: 'Enhanced stash management' },
          { name: 'g wip', desc: 'Quick work-in-progress commit' },
          { name: 'g split', desc: 'Split large changesets' },
          { name: 'g us | unstage', desc: 'Unstage all files' },
          { name: 'g x | discard', desc: 'Discard all changes' }
        ]
      },
      {
        title: '🌿 Branching & Undo',
        cmds: [
          { name: 'g b | branch', desc: 'List or create branches' },
          { name: 'g u | undo', desc: 'Undo last commit' },
          { name: 'g a | amend', desc: 'Amend last commit' },
          { name: 'g rs | reset', desc: 'Reset branch to commit' },
          { name: 'g rv | revert', desc: 'Revert commit safely' },
          { name: 'g conflicts', desc: 'Resolve merge conflicts' }
        ]
      },
      {
        title: '🔧 Config & Utilities',
        cmds: [
          { name: 'g v | version', desc: 'S4 Version management' },
          { name: 'g setup', desc: 'Run setup wizard' },
          { name: 'g config', desc: 'Manage configuration' },
          { name: 'g init', desc: 'Initialize new repo' },
          { name: 'g clone', desc: 'Clone a repository' },
          { name: 'g m | commit', desc: 'Commit with custom message' }
        ]
      }
    ];

    sections.forEach(section => {
      console.log(color.cyan(color.bold(section.title)));
      // Calculate padding dynamically based on longest command name in this section
      const maxLen = Math.max(...section.cmds.map(c => c.name.length)) + 4;

      section.cmds.forEach(cmd => {
        console.log(`  ${cmd.name.padEnd(maxLen)} ${color.dim(cmd.desc)}`);
      });
      console.log('');
    });

    console.log(color.dim('Use "g <command> --help" for more details on any command.'));
  });

program.command('init').alias('i')
  .description('Initialize a new Git repository')
  .action(async () => {
    try {
      await git.init();
      Progress.success('Initialized git repository');
      console.log(`\nNext steps:`);
      console.log(`  ${color.cyan('g setup')} - Configure GIMS`);
      console.log(`  ${color.cyan('g s')} - Check repository status`);
    }
    catch (e) { handleError('Init error', e); }
  });

program.command('clone <repo>').alias('c')
  .description('Clone a Git repository')
  .action(async (repo) => {
    try { await git.clone(repo); console.log(`Cloned ${repo}`); }
    catch (e) { handleError('Clone error', e); }
  });

program.command('suggest').alias('sg')
  .description('Suggest commit message and copy to clipboard')
  .option('--multiple', 'Generate multiple suggestions')
  .action(async (cmdOptions) => {
    await ensureRepo();
    const opts = getOpts();

    try {
      if (opts.all) {
        Progress.info('Staging all changes...');
        await git.add('.');
      }

      // Use staged changes only; do not auto-stage unless --all
      const rawDiff = await git.diff(['--cached', '--no-ext-diff']);
      if (!rawDiff.trim()) {
        if (opts.all) {
          Progress.warning('No changes to suggest');
          return;
        }
        Progress.warning('No staged changes. Use --all to stage everything or stage files manually');
        return;
      }

      if (cmdOptions.multiple) {
        if (opts.progressIndicators) Progress.start('🤖 Generating multiple suggestions');
        const suggestions = await aiProvider.generateMultipleSuggestions(rawDiff, opts, 3);
        if (opts.progressIndicators) Progress.stop('');

        console.log(color.bold('\n📝 Suggested commit messages:\n'));
        suggestions.forEach((msg, i) => {
          console.log(`${color.cyan((i + 1).toString())}. ${msg}`);
        });

        if (!opts.noClipboard && suggestions.length > 0) {
          try {
            clipboard.writeSync(suggestions[0]);
            console.log(`\n${color.green('✓')} First suggestion copied to clipboard`);
          } catch (_) {
            console.log(`\n${color.yellow('⚠')} Clipboard copy failed`);
          }
        }
      } else {
        if (opts.progressIndicators) Progress.start('🤖 Analyzing changes');
        const result = await generateCommitMessage(rawDiff, opts);
        if (opts.progressIndicators) Progress.stop('');

        const msg = result.message || result; // Handle both old and new format
        const usedLocal = result.usedLocal || false;

        // Warn if using local heuristics
        if (usedLocal) {
          console.log(color.yellow('⚠️  No AI provider configured - using local heuristics'));
        }

        if (opts.json) {
          const out = { message: msg, usedLocalHeuristics: usedLocal };
          console.log(JSON.stringify(out));
          return;
        }

        if (!opts.noClipboard) {
          try {
            clipboard.writeSync(msg);
            Progress.success(`"${msg}" (copied to clipboard)`);
          } catch (_) {
            console.log(`Suggested: "${msg}" ${color.yellow('(clipboard copy failed)')}`);
          }
        } else {
          console.log(`Suggested: "${msg}"`);
        }
      }
    } catch (e) {
      handleError('Suggest error', e);
    }
  });

program.command('local').alias('l')
  .description('AI-powered local commit')
  .action(async () => {
    await ensureRepo();
    const opts = getOpts();

    try {
      if (!(await hasChanges()) && !opts.all) {
        Progress.warning('No changes to commit');
        return;
      }

      if (opts.all) {
        Progress.info('Staging all changes...');
        await git.add('.');
      }

      let rawDiff = await git.diff(['--cached', '--no-ext-diff']);
      if (!rawDiff.trim()) {
        Progress.info('No staged changes found; staging all changes...');
        await git.add('.');
        rawDiff = await git.diff(['--cached', '--no-ext-diff']);
        if (!rawDiff.trim()) {
          Progress.warning('No changes to commit');
          return;
        }
      }

      if (opts.progressIndicators) Progress.start('🤖 Generating commit message');
      const result = await generateCommitMessage(rawDiff, opts);
      if (opts.progressIndicators) Progress.stop('');

      const msg = result.message || result; // Handle both old and new format
      const usedLocal = result.usedLocal || false;

      if (opts.dryRun) {
        console.log(color.yellow('[dry-run] Would commit with message:'));
        console.log(msg);
        return;
      }

      // Ask for confirmation if using local heuristics (unless --yes flag is set)
      if (usedLocal && !opts.yes) {
        const confirmed = await confirmCommit(msg, true);
        if (!confirmed) {
          Progress.info('Commit cancelled');
          return;
        }
      }

      if (opts.amend) {
        await git.raw(['commit', '--amend', '-m', msg]);
        Progress.success(`Amended commit: "${msg}"`);
      } else {
        await git.commit(msg);
        Progress.success(`Committed locally: "${msg}"`);
      }
    } catch (e) {
      handleError('Local commit error', e);
    }
  });

program.command('online').alias('o')
  .description('AI commit + push')
  .action(async () => {
    await ensureRepo();
    const opts = getOpts();

    try {
      if (!(await hasChanges()) && !opts.all) {
        Progress.warning('No changes to commit');
        return;
      }

      if (opts.all) {
        Progress.info('Staging all changes...');
        await git.add('.');
      }

      let rawDiff = await git.diff(['--cached', '--no-ext-diff']);
      if (!rawDiff.trim()) {
        Progress.info('No staged changes found; staging all changes...');
        await git.add('.');
        rawDiff = await git.diff(['--cached', '--no-ext-diff']);
        if (!rawDiff.trim()) {
          Progress.warning('No changes to commit');
          return;
        }
      }

      if (opts.progressIndicators) Progress.start('🤖 Generating commit message');
      const result = await generateCommitMessage(rawDiff, opts);
      if (opts.progressIndicators) Progress.stop('');

      const msg = result.message || result; // Handle both old and new format
      const usedLocal = result.usedLocal || false;

      if (opts.dryRun) {
        console.log(color.yellow('[dry-run] Would commit & push with message:'));
        console.log(msg);
        return;
      }

      // Ask for confirmation if using local heuristics (unless --yes flag is set)
      if (usedLocal && !opts.yes) {
        const confirmed = await confirmCommit(msg, true);
        if (!confirmed) {
          Progress.info('Commit cancelled');
          return;
        }
      }

      Progress.info('Committing changes...');
      if (opts.amend) {
        await git.raw(['commit', '--amend', '-m', msg]);
      } else {
        await git.commit(msg);
      }

      try {
        Progress.info('Pushing to remote...');
        await git.push();
        Progress.success(`Committed & pushed: "${msg}"`);
      } catch (pushErr) {
        const msgErr = pushErr && pushErr.message ? pushErr.message : String(pushErr);
        if (/no upstream|set the remote as upstream|have no upstream/.test(msgErr)) {
          // Try to set upstream if requested
          if (opts.setUpstream) {
            Progress.info('Setting upstream branch...');
            const branch = (await git.raw(['rev-parse', '--abbrev-ref', 'HEAD'])).trim();
            await git.push(['--set-upstream', 'origin', branch]);
            Progress.success(`Committed & pushed (upstream set to origin/${branch}): "${msg}"`);
          } else {
            Progress.warning('Current branch has no upstream. Use --set-upstream to set origin/<branch> automatically');
          }
        } else {
          throw pushErr;
        }
      }
    } catch (e) {
      handleError('Online commit error', e);
    }
  });

program.command('commit <message...>').alias('m')
  .description('Commit with a custom message (no AI)')
  .action(async (messageParts) => {
    await ensureRepo();
    const opts = getOpts();

    try {
      const msg = (messageParts || []).join(' ').trim();
      if (!msg) { console.log('Provide a commit message.'); return; }

      if (!(await hasChanges()) && !opts.all) {
        console.log('No changes to commit.');
        return;
      }

      if (opts.all) await git.add('.');

      let rawDiff = await git.diff(['--cached', '--no-ext-diff']);
      if (!rawDiff.trim()) {
        // Auto-stage all changes by default when nothing is staged
        console.log(color.yellow('No staged changes found; staging all changes (git add .).'));
        await git.add('.');
        rawDiff = await git.diff(['--cached', '--no-ext-diff']);
        if (!rawDiff.trim()) { console.log('No changes to commit.'); return; }
      }

      if (opts.dryRun) {
        console.log(color.yellow('[dry-run] Would commit with custom message:'));
        console.log(msg);
        return;
      }

      if (opts.amend) {
        await git.raw(['commit', '--amend', '-m', msg]);
      } else {
        await git.commit(msg);
      }
      console.log(`Committed locally: "${msg}"`);
    } catch (e) {
      handleError('Commit error', e);
    }
  });

program.command('pull')
  .description('Pull latest changes')
  .action(async () => {
    await ensureRepo();
    try {
      Progress.info('Pulling latest changes...');
      await git.pull();
      Progress.success('Pulled latest changes');
    }
    catch (e) { handleError('Pull error', e); }
  });

program.command('push')
  .description('Push commits to remote')
  .action(async () => {
    await ensureRepo();
    try {
      Progress.info('Pushing to remote...');
      await git.push();
      Progress.success('Pushed to remote');
    }
    catch (e) { handleError('Push error', e); }
  });

program.command('sync')
  .description('Smart sync: pull + rebase/merge')
  .option('--rebase', 'Use rebase instead of merge')
  .action(async (cmdOptions) => {
    await ensureRepo();
    try {
      const status = await git.status();

      if (status.files.length > 0) {
        Progress.warning('You have uncommitted changes. Commit or stash them first.');
        return;
      }

      Progress.info('Fetching latest changes...');
      await git.fetch();

      const currentBranch = (await git.raw(['rev-parse', '--abbrev-ref', 'HEAD'])).trim();
      const remoteBranch = `origin/${currentBranch}`;

      try {
        const behind = await git.raw(['rev-list', '--count', `${currentBranch}..${remoteBranch}`]);
        const ahead = await git.raw(['rev-list', '--count', `${remoteBranch}..${currentBranch}`]);

        if (parseInt(behind.trim()) === 0) {
          Progress.success('Already up to date');
          return;
        }

        if (parseInt(ahead.trim()) > 0) {
          Progress.info(`Branch is ${ahead.trim()} commits ahead and ${behind.trim()} commits behind`);
          if (cmdOptions.rebase) {
            Progress.info('Rebasing...');
            await git.rebase([remoteBranch]);
            Progress.success('Rebased successfully');
          } else {
            Progress.info('Merging...');
            await git.merge([remoteBranch]);
            Progress.success('Merged successfully');
          }
        } else {
          Progress.info('Fast-forwarding...');
          await git.merge([remoteBranch]);
          Progress.success('Fast-forwarded successfully');
        }
      } catch (error) {
        if (error.message.includes('unknown revision')) {
          Progress.info('No remote tracking branch, pulling...');
          await git.pull();
          Progress.success('Pulled latest changes');
        } else {
          throw error;
        }
      }
    } catch (e) {
      handleError('Sync error', e);
    }
  });

program.command('stash')
  .description('Enhanced stash with AI descriptions')
  .option('--list', 'List stashes')
  .option('--pop', 'Pop latest stash')
  .option('--apply <n>', 'Apply stash by index')
  .action(async (cmdOptions) => {
    await ensureRepo();
    try {
      if (cmdOptions.list) {
        const stashes = await git.stashList();
        if (stashes.all.length === 0) {
          Progress.info('No stashes found');
          return;
        }

        console.log(color.bold('Stashes:'));
        stashes.all.forEach((stash, i) => {
          console.log(`${color.cyan((i).toString())}. ${stash.message}`);
        });
      } else if (cmdOptions.pop) {
        await git.stash(['pop']);
        Progress.success('Popped latest stash');
      } else if (cmdOptions.apply !== undefined) {
        const index = parseInt(cmdOptions.apply);
        await git.stash(['apply', `stash@{${index}}`]);
        Progress.success(`Applied stash ${index}`);
      } else {
        // Create new stash with AI description
        const status = await git.status();
        if (status.files.length === 0) {
          Progress.warning('No changes to stash');
          return;
        }

        Progress.start('🤖 Generating stash description');
        const diff = await git.diff();
        const description = await aiProvider.generateCommitMessage(diff, {
          conventional: false,
          body: false
        });
        Progress.stop('');

        await git.stash(['push', '-m', `WIP: ${description}`]);
        Progress.success(`Stashed changes: "${description}"`);
      }
    } catch (e) {
      handleError('Stash error', e);
    }
  });

program.command('version').alias('v')
  .description('Manage S4 version (smart bump by default)')
  .argument('[type]', 'bump type: major, minor, patch, auto', 'auto')
  .option('-s, --stage <stage>', 'Set prerelease stage (dev, alpha, beta, rc, stable)')
  .option('-n, --dry-run', 'Show next version without applying')
  .option('-i, --info', 'Show info about current version')
  .option('--list', 'List S4 tags (hides dev tags by default)')
  .option('--prune', 'Prune old dev tags (keeps last 10)')
  .option('--all', 'Show all tags (including dev) when listing')
  .option('-u, --undo', 'Undo the last version bump (delete latest tag)')
  .action(async (type, options) => {
    await ensureRepo();
    if (!versionCmd) initializeComponents();
    try {
      await versionCmd.run(type, options);
    } catch (e) {
      handleError('Version error', e);
    }
  });

program.command('whoami').alias('w')
  .description('Show system and tool identity status')
  .action(async () => {
    try {
      if (!whoAmI) initializeComponents();
      await whoAmI.run();
    } catch (e) {
      handleError('WhoAmI error', e);
    }
  });

program.command('amend').alias('a')
  .description('Stage all changes and amend last commit (keeps message)')
  .option('--edit', 'Generate new AI commit message')
  .action(async (cmdOptions) => {
    await ensureRepo();
    try {
      const { all } = await safeLog();
      if (!all || all.length === 0) {
        Progress.warning('No commits to amend. Make an initial commit first');
        return;
      }

      Progress.info('Staging all changes...');
      await git.add('.');

      const rawDiff = await git.diff(['--cached', '--no-ext-diff']);
      if (!rawDiff.trim()) {
        Progress.warning('No staged changes to amend');
        return;
      }

      if (cmdOptions.edit) {
        // Generate new message for amend
        const opts = getOpts();
        Progress.start('🤖 Generating updated commit message');
        const result = await generateCommitMessage(rawDiff, opts);
        Progress.stop('');

        const newMessage = result.message || result; // Handle both old and new format
        const usedLocal = result.usedLocal || false;

        // Ask for confirmation if using local heuristics (unless --yes flag is set)
        if (usedLocal && !opts.yes) {
          const confirmed = await confirmCommit(newMessage, true);
          if (!confirmed) {
            Progress.info('Amend cancelled');
            return;
          }
        }

        await git.raw(['commit', '--amend', '-m', newMessage]);
        Progress.success(`Amended commit: "${newMessage}"`);
      } else {
        // Default: Keep existing message (--no-edit)
        await git.raw(['commit', '--amend', '--no-edit']);
        Progress.success('Amended last commit with staged changes (kept original message)');
      }
    } catch (e) {
      handleError('Amend error', e);
    }
  });

program.command('list').alias('ls')
  .description('Short numbered git log (oldest → newest)')
  .option('--limit <n>', 'Limit number of commits', '20')
  .action(async (cmdOptions) => {
    await ensureRepo();
    try {
      const limit = parseInt(cmdOptions.limit) || 20;
      const log = await git.log({ maxCount: limit });
      const commits = [...log.all].reverse();

      if (commits.length === 0) {
        Progress.info('No commits found');
        return;
      }

      commits.forEach((c, i) => {
        console.log(`${color.cyan((i + 1).toString())}. ${color.yellow(c.hash.slice(0, 7))} ${c.message}`);
      });

      if (log.all.length >= limit) {
        console.log(color.dim(`\n... showing last ${limit} commits (use --limit to see more)`));
      }
    } catch (e) {
      handleError('List error', e);
    }
  });

program.command('largelist').alias('ll')
  .description('Detailed numbered git log (oldest → newest)')
  .option('--limit <n>', 'Limit number of commits', '20')
  .action(async (cmdOptions) => {
    await ensureRepo();
    try {
      const limit = parseInt(cmdOptions.limit) || 20;
      const log = await git.log({ maxCount: limit });
      const commits = [...log.all].reverse();

      if (commits.length === 0) {
        Progress.info('No commits found');
        return;
      }

      commits.forEach((c, i) => {
        const date = new Date(c.date).toLocaleString();
        console.log(`${color.cyan((i + 1).toString())}. ${color.yellow(c.hash.slice(0, 7))} | ${color.dim(date)} | ${color.green(c.author_name)} → ${c.message}`);
      });

      if (log.all.length >= limit) {
        console.log(color.dim(`\n... showing last ${limit} commits (use --limit to see more)`));
      }
    } catch (e) {
      handleError('Largelist error', e);
    }
  });

program.command('history').alias('h')
  .description('Numbered git log (alias for list)')
  .option('--limit <n>', 'Limit number of commits', '20')
  .action(async (cmdOptions) => {
    await ensureRepo();
    try {
      const limit = parseInt(cmdOptions.limit) || 20;
      const log = await git.log({ maxCount: limit });
      const commits = [...log.all].reverse();

      if (commits.length === 0) {
        Progress.info('No commits found');
        return;
      }

      commits.forEach((c, i) => {
        console.log(`${color.cyan((i + 1).toString())}. ${color.yellow(c.hash.slice(0, 7))} ${c.message}`);
      });

      if (log.all.length >= limit) {
        console.log(color.dim(`\n... showing last ${limit} commits (use --limit to see more)`));
      }
    } catch (e) {
      handleError('History error', e);
    }
  });

program.command('branch [c] [name]').alias('b')
  .description('List branches or branch from commit/index')
  .action(async (c, name) => {
    await ensureRepo();
    try {
      if (!c) {
        // List branches
        const branches = await git.branchLocal();
        console.log(color.bold('\n🌿 Local Branches:\n'));
        branches.all.forEach(b => {
          if (b === branches.current) {
            console.log(`  ${color.green('* ' + b)}`);
          } else {
            console.log(`    ${b}`);
          }
        });
        console.log('');
      } else {
        // Create branch
        const sha = await resolveCommit(c);
        const br = name || `branch-${sha.slice(0, 7)}`;
        await git.checkout(['-b', br, sha]);
        console.log(`Switched to branch ${br} at ${sha}`);
      }
    }
    catch (e) { handleError('Branch error', e); }
  });

program.command('reset <c>').alias('rs')
  .description('Reset branch to commit/index')
  .option('--hard', 'hard reset')
  .action(async (c, optsCmd) => {
    await ensureRepo();
    try {
      const sha = await resolveCommit(c);
      const mode = optsCmd.hard ? '--hard' : '--soft';
      const opts = getOpts();
      if (!opts.yes) {
        console.log(color.yellow(`About to run: git reset ${mode} ${sha}. Use --yes to confirm.`));
        process.exit(1);
      }
      await git.raw(['reset', mode, sha]);
      console.log(`Reset (${mode}) to ${sha}`);
    }
    catch (e) { handleError('Reset error', e); }
  });

program.command('revert <c>').alias('rv')
  .description('Revert commit/index safely')
  .action(async (c) => {
    await ensureRepo();
    try {
      const sha = await resolveCommit(c);
      const opts = getOpts();
      if (!opts.yes) {
        console.log(color.yellow(`About to run: git revert ${sha}. Use --yes to confirm.`));
        process.exit(1);
      }
      await git.revert(sha);
      console.log(`Reverted ${sha}`);
    }
    catch (e) { handleError('Revert error', e); }
  });

program.command('undo').alias('u')
  .description('Undo last commit (soft reset to HEAD~1)')
  .option('--hard', 'Hard reset instead (destructive)')
  .action(async (cmd) => {
    await ensureRepo();
    try {
      const { all } = await safeLog();
      if (!all || all.length === 0) {
        Progress.warning('No commits to undo');
        return;
      }

      const lastCommit = all[0];
      const mode = cmd.hard ? '--hard' : '--soft';
      const opts = getOpts();

      if (!opts.yes) {
        console.log(color.yellow(`About to undo: "${lastCommit.message}"`));
        console.log(color.yellow(`This will run: git reset ${mode} HEAD~1`));
        if (mode === '--hard') {
          console.log(color.red('WARNING: Hard reset will permanently delete uncommitted changes!'));
        }
        console.log('Use --yes to confirm.');
        process.exit(1);
      }

      await git.raw(['reset', mode, 'HEAD~1']);
      Progress.success(`Undone commit: "${lastCommit.message}" (${mode} reset)`);

      if (mode === '--soft') {
        Progress.info('Changes are now staged. Use "g status" to see them.');
      }
    } catch (e) {
      handleError('Undo error', e);
    }
  });

// ===== NEW INTELLIGENT COMMANDS =====

program.command('wip')
  .description('Quick work-in-progress commit')
  .action(async () => {
    await ensureRepo();
    try {
      const status = await git.status();
      if (status.files.length === 0) {
        Progress.warning('No changes to commit');
        return;
      }

      Progress.info('Staging all changes...');
      await git.add('.');

      const fileCount = status.files.length;
      const message = `WIP: ${fileCount} file${fileCount > 1 ? 's' : ''} changed`;

      await git.commit(message);
      Progress.success(`Committed: "${message}"`);
      Progress.tip('Use `g a` to amend this commit when ready, or `g undo` to undo');
    } catch (e) {
      handleError('WIP error', e);
    }
  });

program.command('today').alias('t')
  .description('Show commits made today')
  .action(async () => {
    await ensureRepo();
    try {
      const commits = await gitAnalyzer.getTodayCommits();

      if (commits.length === 0) {
        console.log(color.dim('No commits today yet.'));
        Progress.tip('Start your day with `g o` to commit and push!');
        return;
      }

      console.log(color.bold(`📅 Today's Commits (${commits.length})\n`));
      commits.forEach((commit, i) => {
        console.log(gitAnalyzer.formatCommit(commit, i));
      });
    } catch (e) {
      handleError('Today error', e);
    }
  });

program.command('stats')
  .description('Your personal commit statistics')
  .option('--days <n>', 'Number of days to analyze', '30')
  .action(async (cmdOptions) => {
    await ensureRepo();
    try {
      const days = parseInt(cmdOptions.days) || 30;
      const intelligence = new Intelligence(git);

      Progress.start('📊 Analyzing your commit history');
      const stats = await intelligence.getCommitStats(days);
      const patterns = await intelligence.analyzeCommitPatterns();
      Progress.stop('');

      if (!stats.hasData) {
        Progress.info('Not enough commit history to analyze');
        return;
      }

      console.log(color.bold(`\n📊 Your Git Stats (last ${days} days)\n`));

      // Overview
      console.log(color.cyan('Overview:'));
      console.log(`  Total commits: ${color.bold(stats.totalCommits.toString())}`);
      console.log(`  Days active: ${stats.daysActive}`);
      console.log(`  Average: ${stats.avgPerDay} commits/day`);
      console.log(`  Current streak: ${color.green(stats.currentStreak + ' days')}`);
      if (stats.longestStreak > stats.currentStreak) {
        console.log(`  Longest streak: ${stats.longestStreak} days`);
      }

      // Commit types breakdown
      if (patterns.usesConventional) {
        console.log(`\n${color.cyan('Commit Types:')}`);
        const types = stats.typeBreakdown;
        const total = Object.values(types).reduce((a, b) => a + b, 0);
        Object.entries(types).forEach(([type, count]) => {
          if (count > 0) {
            const pct = Math.round(count / total * 100);
            const bar = '█'.repeat(Math.ceil(pct / 5)) + '░'.repeat(20 - Math.ceil(pct / 5));
            console.log(`  ${type.padEnd(8)} ${bar} ${pct}%`);
          }
        });
      }

      // Style insights
      if (patterns.hasHistory) {
        console.log(`\n${color.cyan('Your Style:')}`);
        console.log(`  Conventional commits: ${patterns.conventionalRatio}%`);
        console.log(`  Message style: ${patterns.style}`);
        console.log(`  Avg message length: ${patterns.avgMessageLength} chars`);
        if (patterns.topScopes.length > 0) {
          console.log(`  Common scopes: ${patterns.topScopes.join(', ')}`);
        }
      }

      Progress.showRandomTip();
    } catch (e) {
      handleError('Stats error', e);
    }
  });

program.command('review').alias('r')
  .description('AI code review before committing')
  .action(async () => {
    await ensureRepo();
    const opts = getOpts();
    try {
      let diff = await git.diff(['--cached', '--no-ext-diff']);

      if (!diff.trim()) {
        // Try unstaged changes
        diff = await git.diff(['--no-ext-diff']);
        if (!diff.trim()) {
          Progress.warning('No changes to review');
          return;
        }
        console.log(color.dim('(Reviewing unstaged changes)\n'));
      } else {
        console.log(color.dim('(Reviewing staged changes)\n'));
      }

      const intelligence = new Intelligence(git);

      // Analyze complexity
      const complexity = await gitAnalyzer.getChangeComplexity(diff);
      console.log(color.bold('📋 Change Summary'));
      console.log(`  Complexity: ${complexity.emoji} ${complexity.complexity}`);
      console.log(`  Files: ${complexity.files}`);
      console.log(`  Changes: ${color.green('+' + complexity.additions)} ${color.red('-' + complexity.deletions)}`);

      // Detect semantic changes
      const semantic = await intelligence.detectSemanticChanges(diff);
      if (semantic.labels.length > 0) {
        console.log(`\n${color.bold('🔍 Detected Patterns')}`);
        semantic.labels.forEach(label => {
          console.log(`  ${label}`);
        });
      }

      // Get AI suggestions
      if (opts.progressIndicators) Progress.start('🤖 Generating AI review');
      const message = await aiProvider.generateCommitMessage(diff, { ...opts, body: true });
      if (opts.progressIndicators) Progress.stop('');

      console.log(`\n${color.bold('💬 Suggested Commit Message')}`);
      console.log(`  ${color.green(message.message || message)}`);

      // Actionable next steps
      console.log(`\n${color.bold('📌 Next Steps')}`);
      console.log(`  ${color.cyan('g o')}    Commit and push with AI message`);
      console.log(`  ${color.cyan('g l')}    Commit locally with AI message`);
      console.log(`  ${color.cyan('g int')}  Interactive commit with options`);

    } catch (e) {
      handleError('Review error', e);
    }
  });

program.command('split')
  .description('Suggest how to split a large changeset')
  .action(async () => {
    await ensureRepo();
    try {
      const status = await git.status();

      if (status.files.length === 0) {
        Progress.info('No changes to split');
        return;
      }

      if (status.files.length < 5) {
        Progress.info('Changeset is small enough - no need to split');
        console.log(`\nYou have ${status.files.length} file${status.files.length > 1 ? 's' : ''} changed.`);
        console.log(`Use ${color.cyan('g o')} to commit them all at once.`);
        return;
      }

      const intelligence = new Intelligence(git);
      const suggestions = await intelligence.suggestCommitSplit(status);

      if (!suggestions) {
        Progress.info('All changes look related - commit them together');
        return;
      }

      console.log(color.bold(`\n📦 Suggested Commit Split\n`));
      console.log(color.dim(`Your ${status.files.length} files could be split into ${suggestions.length} commits:\n`));

      suggestions.forEach((group, i) => {
        console.log(`${color.cyan((i + 1).toString())}. ${color.bold(group.message)}`);
        group.files.slice(0, 5).forEach(file => {
          const emoji = Intelligence.getFileEmoji(file);
          console.log(`   ${emoji} ${file}`);
        });
        if (group.files.length > 5) {
          console.log(color.dim(`   ... and ${group.files.length - 5} more`));
        }
        console.log();
      });

      console.log(color.bold('💡 How to split:'));
      console.log(`  1. Stage specific files: ${color.cyan('git add <file>')}`);
      console.log(`  2. Commit them: ${color.cyan('g l')} or ${color.cyan('g o')}`);
      console.log(`  3. Repeat for remaining files`);

    } catch (e) {
      handleError('Split error', e);
    }
  });

// ===== WORKFLOW SHORTHAND COMMANDS =====

program.command('safe-pull').alias('sp')
  .description('Safe pull: stash → pull → stash pop')
  .action(async () => {
    await ensureRepo();
    try {
      const status = await git.status();
      const hasChanges = status.files.length > 0;

      if (hasChanges) {
        Progress.info('Stashing changes...');
        await git.stash(['push', '-m', 'GIMS: auto-stash before pull']);
      }

      Progress.info('Pulling latest changes...');
      await git.pull();

      if (hasChanges) {
        Progress.info('Restoring stashed changes...');
        await git.stash(['pop']);
      }

      Progress.success('Safe pull complete');
    } catch (e) {
      handleError('Safe pull error', e);
    }
  });

program.command('main')
  .description('Switch to main/master and pull latest')
  .action(async () => {
    await ensureRepo();
    try {
      // Detect main branch name
      let mainBranch = 'main';
      try {
        await git.raw(['rev-parse', '--verify', 'main']);
      } catch {
        try {
          await git.raw(['rev-parse', '--verify', 'master']);
          mainBranch = 'master';
        } catch {
          Progress.error('No main or master branch found');
          return;
        }
      }

      const status = await git.status();
      if (status.files.length > 0) {
        Progress.warning('You have uncommitted changes. Commit or stash them first.');
        console.log(`Tip: Use ${color.cyan('g sp')} to safe-pull with auto-stash`);
        return;
      }

      Progress.info(`Switching to ${mainBranch}...`);
      await git.checkout(mainBranch);

      Progress.info('Pulling latest...');
      await git.pull();

      Progress.success(`On ${mainBranch} with latest changes`);
    } catch (e) {
      handleError('Main error', e);
    }
  });

program.command('unstage').alias('us')
  .description('Unstage all staged files')
  .action(async () => {
    await ensureRepo();
    try {
      const status = await git.status();
      if (status.staged.length === 0) {
        Progress.info('Nothing is staged');
        return;
      }

      await git.reset([]);
      Progress.success(`Unstaged ${status.staged.length} file${status.staged.length > 1 ? 's' : ''}`);
    } catch (e) {
      handleError('Unstage error', e);
    }
  });

program.command('discard').alias('x')
  .description('Discard all changes (with confirmation)')
  .action(async () => {
    await ensureRepo();
    const opts = getOpts();
    try {
      const status = await git.status();
      if (status.files.length === 0) {
        Progress.info('No changes to discard');
        return;
      }

      if (!opts.yes) {
        console.log(color.yellow(`⚠️  About to discard ALL changes in ${status.files.length} file(s)`));
        console.log(color.red('This cannot be undone!'));
        console.log('Use --yes to confirm.');
        return;
      }

      // Discard tracked file changes
      await git.checkout(['--', '.']);

      // Remove untracked files
      if (status.not_added.length > 0) {
        await git.clean('fd');
      }

      Progress.success('All changes discarded');
    } catch (e) {
      handleError('Discard error', e);
    }
  });

program.command('stash-save').alias('ss')
  .description('Quick stash: stage all and stash')
  .action(async () => {
    await ensureRepo();
    try {
      const status = await git.status();
      if (status.files.length === 0) {
        Progress.info('No changes to stash');
        return;
      }

      await git.add('.');

      // Generate a descriptive stash name
      const fileCount = status.files.length;
      const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const message = `WIP: ${fileCount} file${fileCount > 1 ? 's' : ''} at ${timestamp}`;

      await git.stash(['push', '-m', message]);
      Progress.success(`Stashed: "${message}"`);
    } catch (e) {
      handleError('Stash save error', e);
    }
  });

program.command('stash-pop').alias('pop')
  .description('Pop the latest stash')
  .action(async () => {
    await ensureRepo();
    try {
      const stashList = await git.stashList();
      if (stashList.all.length === 0) {
        Progress.info('No stashes to pop');
        return;
      }

      const latestStash = stashList.all[0];
      await git.stash(['pop']);
      Progress.success(`Popped: "${latestStash.message}"`);
    } catch (e) {
      handleError('Stash pop error', e);
    }
  });

program.command('delete-branch').alias('del')
  .description('Delete branch locally and remotely')
  .argument('<branch>', 'Branch name to delete')
  .action(async (branch) => {
    await ensureRepo();
    const opts = getOpts();
    try {
      const current = (await git.branch()).current;
      if (branch === current) {
        Progress.error(`Cannot delete current branch. Switch to another branch first.`);
        return;
      }

      if (branch === 'main' || branch === 'master') {
        Progress.error('Cannot delete main/master branch');
        return;
      }

      if (!opts.yes) {
        console.log(color.yellow(`⚠️  About to delete branch: ${branch}`));
        console.log('This will delete both local and remote copies.');
        console.log('Use --yes to confirm.');
        return;
      }

      // Delete local
      Progress.info('Deleting local branch...');
      try {
        await git.branch(['-D', branch]);
      } catch (e) {
        Progress.warning(`Local branch not found or already deleted`);
      }

      // Delete remote
      Progress.info('Deleting remote branch...');
      try {
        await git.push(['origin', '--delete', branch]);
      } catch (e) {
        Progress.warning(`Remote branch not found or already deleted`);
      }

      Progress.success(`Deleted branch: ${branch}`);
    } catch (e) {
      handleError('Delete branch error', e);
    }
  });

program.command('cleanup').alias('clean')
  .description('Remove local branches that no longer exist on remote')
  .action(async () => {
    await ensureRepo();
    const opts = getOpts();
    try {
      Progress.info('Fetching and pruning...');
      await git.fetch(['--prune']);

      // Find gone branches
      const branchOutput = await git.raw(['branch', '-vv']);
      const goneBranches = branchOutput
        .split('\n')
        .filter(line => line.includes(': gone]'))
        .map(line => line.trim().split(/\s+/)[0].replace('*', '').trim())
        .filter(b => b && b !== 'main' && b !== 'master');

      if (goneBranches.length === 0) {
        Progress.success('No dead branches to clean up');
        return;
      }

      console.log(color.bold(`\nFound ${goneBranches.length} dead branch(es):`));
      goneBranches.forEach(b => console.log(`  ${color.dim('•')} ${b}`));

      if (!opts.yes) {
        console.log(`\nUse ${color.cyan('g clean --yes')} to delete them`);
        return;
      }

      for (const branch of goneBranches) {
        try {
          await git.branch(['-D', branch]);
          Progress.success(`Deleted: ${branch}`);
        } catch (e) {
          Progress.warning(`Could not delete: ${branch}`);
        }
      }

      Progress.success(`Cleaned up ${goneBranches.length} branch(es)`);
    } catch (e) {
      handleError('Cleanup error', e);
    }
  });

program.command('last')
  .description('Show last commit details and diff')
  .action(async () => {
    await ensureRepo();
    try {
      const log = await git.log({ maxCount: 1 });
      if (log.all.length === 0) {
        Progress.info('No commits yet');
        return;
      }

      const commit = log.all[0];
      console.log(color.bold('\n📝 Last Commit\n'));
      console.log(`  ${color.yellow(commit.hash.substring(0, 7))} ${commit.message.split('\n')[0]}`);
      console.log(`  ${color.dim(`by ${commit.author_name} • ${new Date(commit.date).toLocaleString()}`)}`);

      // Show diff stats
      const diff = await git.diff(['HEAD~1', '--stat']);
      if (diff.trim()) {
        console.log(`\n${color.bold('Changes:')}`);
        console.log(color.dim(diff));
      }
    } catch (e) {
      handleError('Last error', e);
    }
  });

// ===== SMART SYNC FIX COMMAND =====

program.command('fix').alias('f')
  .description('Smart fix for branch sync issues (diverged, behind, ahead)')
  .option('--local', 'Keep local changes, force push to remote')
  .option('--remote', 'Keep remote changes, discard local')
  .option('--merge', 'Merge remote into local')
  .option('--rebase', 'Rebase local onto remote')
  .option('--ai', 'Get AI recommendation for best approach')
  .action(async (cmdOptions) => {
    await ensureRepo();
    const opts = getOpts();

    try {
      // Fetch latest
      Progress.info('Fetching remote status...');
      await git.fetch();

      const branch = (await git.branch()).current;
      const remoteBranch = `origin/${branch}`;

      // Check if remote exists
      let remoteExists = true;
      try {
        await git.raw(['rev-parse', '--verify', remoteBranch]);
      } catch {
        remoteExists = false;
      }

      if (!remoteExists) {
        console.log(color.bold(`\n📍 Branch Status: ${color.cyan(branch)}\n`));
        console.log(`Remote branch ${color.yellow(remoteBranch)} doesn't exist yet.`);
        console.log(`\nOptions:`);
        console.log(`  ${color.cyan('g push --set-upstream')}  Push and create remote branch`);
        return;
      }

      // Get ahead/behind counts
      const ahead = parseInt((await git.raw(['rev-list', '--count', `${remoteBranch}..${branch}`])).trim());
      const behind = parseInt((await git.raw(['rev-list', '--count', `${branch}..${remoteBranch}`])).trim());

      // Get local changes status
      const status = await git.status();
      const hasLocalChanges = status.files.length > 0;

      console.log(color.bold(`\n📍 Branch Status: ${color.cyan(branch)}\n`));

      // Determine situation
      let situation = '';
      if (ahead === 0 && behind === 0) {
        Progress.success('Branch is up to date with remote!');
        if (hasLocalChanges) {
          console.log(`\nYou have ${status.files.length} uncommitted change(s).`);
          console.log(`Use ${color.cyan('g o')} to commit and push them.`);
        }
        return;
      } else if (ahead > 0 && behind === 0) {
        situation = 'ahead';
        console.log(`  ${color.green('↑')} ${ahead} commit(s) ahead of remote`);
        console.log(`  ${color.dim('Your local has commits not on remote')}\n`);
      } else if (ahead === 0 && behind > 0) {
        situation = 'behind';
        console.log(`  ${color.yellow('↓')} ${behind} commit(s) behind remote`);
        console.log(`  ${color.dim('Remote has commits you don\'t have')}\n`);
      } else {
        situation = 'diverged';
        console.log(`  ${color.red('⚡')} Branch has diverged!`);
        console.log(`  ${color.green('↑')} ${ahead} commit(s) ahead`);
        console.log(`  ${color.yellow('↓')} ${behind} commit(s) behind\n`);
      }

      if (hasLocalChanges) {
        console.log(color.yellow(`⚠️  You have ${status.files.length} uncommitted file(s)`));
        console.log(`${color.dim('Commit or stash them before fixing sync issues')}\n`);
      }

      // If specific option provided, execute it
      if (cmdOptions.local) {
        if (!opts.yes) {
          console.log(color.red('⚠️  This will FORCE PUSH and overwrite remote!'));
          console.log(`Use ${color.cyan('g fix --local --yes')} to confirm.`);
          return;
        }
        Progress.info('Force pushing local to remote...');
        await git.push(['--force']);
        Progress.success('Force pushed! Remote now matches local.');
        return;
      }

      if (cmdOptions.remote) {
        if (!opts.yes) {
          console.log(color.red('⚠️  This will DISCARD local commits!'));
          console.log(`Use ${color.cyan('g fix --remote --yes')} to confirm.`);
          return;
        }
        Progress.info('Resetting to remote...');
        await git.reset(['--hard', remoteBranch]);
        Progress.success('Reset! Local now matches remote.');
        return;
      }

      if (cmdOptions.merge) {
        Progress.info('Merging remote into local...');
        try {
          await git.merge([remoteBranch]);
          Progress.success('Merged successfully!');
        } catch (e) {
          Progress.error('Merge conflict! Resolve conflicts then run: g o');
        }
        return;
      }

      if (cmdOptions.rebase) {
        Progress.info('Rebasing local onto remote...');
        try {
          await git.rebase([remoteBranch]);
          Progress.success('Rebased successfully!');
          console.log(`Now run ${color.cyan('g push --force')} to update remote.`);
        } catch (e) {
          Progress.error('Rebase conflict! Resolve conflicts then run: git rebase --continue');
        }
        return;
      }

      // AI recommendation
      if (cmdOptions.ai) {
        Progress.start('🤖 Asking AI for the best strategy...');

        // Gather rich context for the AI
        let aiContext = `Situation: I am on branch '${branch}'.\n`;
        aiContext += `Remote '${remoteBranch}' exists.\n`;
        aiContext += `Status: ${ahead} commits ahead, ${behind} commits behind.\n`;
        aiContext += `Uncommitted changes: ${hasLocalChanges ? 'Yes' : 'No'}.\n\n`;

        if (behind > 0) {
          try {
            const behindLog = await git.log({ from: branch, to: remoteBranch, maxCount: 5 });
            aiContext += `Incoming commits (latest 5):\n${behindLog.all.map(c => `- ${c.message}`).join('\n')}\n\n`;
          } catch (e) { }
        }

        if (ahead > 0) {
          try {
            const aheadLog = await git.log({ from: remoteBranch, to: branch, maxCount: 5 });
            aiContext += `My outgoing commits (latest 5):\n${aheadLog.all.map(c => `- ${c.message}`).join('\n')}\n`;
          } catch (e) { }
        }

        const prompt = `
          As a Git expert, analyze this situation and recommend the best command to sync my repo.
          
          ${aiContext}
          
          Explain "Why" briefly, then provide the exact command to run.
          Output format:
          Reasoning: <brief explanation>
          Recommended Command: <command>
        `;

        // Use preferred provider or auto-resolve
        const provider = aiProvider.resolveProvider(opts.provider);
        if (provider === 'none') {
          Progress.stop('');
          console.log(color.yellow('No AI provider configured. Falling back to simple heuristics.'));
          // ... heuristic fallback ...
          let rec = '';
          if (ahead > 0 && behind === 0) rec = 'Push (g push)';
          else if (behind > 0 && ahead === 0) rec = 'Pull (g pull)';
          else rec = 'Rebase (g fix --rebase)';
          console.log(`Recommendation: ${rec}`);
          return;
        }

        try {
          const response = await aiProvider.generateWithProvider(provider, prompt, { temperature: 0.3 }); // Use generic provider method

          Progress.stop('');
          console.log(`\n${color.bold('🤖 AI Analysis:')}`);
          console.log(response.trim());
        } catch (e) {
          Progress.stop('');
          console.log(color.yellow('AI Analysis failed, falling back to heuristics.'));
          // ... heuristic fallback code ...
          let rec = '';
          if (ahead > 0 && behind === 0) rec = 'Push (g push)';
          else if (behind > 0 && ahead === 0) rec = 'Pull (g pull)';
          else rec = 'Rebase (g fix --rebase)';
          console.log(`Recommendation: ${rec}`);
        }
        return;
      }


      // Show interactive menu
      console.log(color.bold('🔧 Fix Options:\n'));

      if (situation === 'ahead') {
        console.log(`  ${color.cyan('g push')}           Push your commits to remote`);
      } else if (situation === 'behind') {
        console.log(`  ${color.cyan('g pull')}           Get remote commits (fast-forward)`);
        console.log(`  ${color.cyan('g sp')}             Safe pull (stash → pull → pop)`);
      } else {
        // Diverged
        console.log(`  ${color.cyan('g fix --merge')}    Merge remote into local (creates merge commit)`);
        console.log(`  ${color.cyan('g fix --rebase')}   Rebase local onto remote (linear history)`);
        console.log(color.dim('  ─────────────────'));
        console.log(`  ${color.cyan('g fix --local')}    ${color.yellow('⚠')} Force push local, overwrite remote`);
        console.log(`  ${color.cyan('g fix --remote')}   ${color.yellow('⚠')} Reset to remote, discard local commits`);
      }

      console.log(color.dim('  ─────────────────'));
      console.log(`  ${color.cyan('g fix --ai')}       Get AI recommendation`);

    } catch (e) {
      handleError('Fix error', e);
    }
  });

program.command('conflicts')
  .description('Show and help resolve merge conflicts')
  .action(async () => {
    await ensureRepo();
    try {
      const status = await git.status();
      const conflicts = status.conflicted || [];

      if (conflicts.length === 0) {
        Progress.success('No merge conflicts!');
        return;
      }

      console.log(color.bold(`\n⚠️  ${conflicts.length} Conflicted File(s):\n`));
      conflicts.forEach((file, i) => {
        const emoji = Intelligence.getFileEmoji(file);
        console.log(`  ${i + 1}. ${emoji} ${color.red(file)}`);
      });

      console.log(color.bold('\n🔧 How to resolve:\n'));
      console.log(`  1. Edit each file and resolve the conflict markers`);
      console.log(`     ${color.dim('<<<<<<< HEAD')}`);
      console.log(`     ${color.dim('your changes')}`);
      console.log(`     ${color.dim('=======')}`);
      console.log(`     ${color.dim('their changes')}`);
      console.log(`     ${color.dim('>>>>>>> branch')}`);
      console.log(`  2. Stage resolved files: ${color.cyan('git add <file>')}`);
      console.log(`  3. Complete the merge: ${color.cyan('g o')} or ${color.cyan('git merge --continue')}`);

      console.log(color.bold('\n⚡ Quick options:\n'));
      console.log(`  ${color.cyan('git checkout --ours <file>')}   Keep YOUR version`);
      console.log(`  ${color.cyan('git checkout --theirs <file>')} Keep THEIR version`);

    } catch (e) {
      handleError('Conflicts error', e);
    }
  });

program.parse(process.argv);

