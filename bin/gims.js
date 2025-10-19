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

const program = new Command();
const git = simpleGit();

// Initialize enhanced components
const configManager = new ConfigManager();
const gitAnalyzer = new GitAnalyzer(git);
let aiProvider;
let interactive;

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

function initializeComponents() {
  const config = configManager.load();
  aiProvider = new AIProviderManager(config);
  interactive = new InteractiveCommands(git, aiProvider, gitAnalyzer);
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
  return await aiProvider.generateCommitMessage(rawDiff, options);
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
  .version(require('../package.json').version)
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

program.command('help-quick').alias('q')
  .description('Show quick reference for main commands')
  .action(() => {
    console.log(color.bold('🚀 GIMS Quick Reference\n'));
    
    console.log(color.bold('Single-Letter Workflow:'));
    console.log(`  ${color.cyan('g s')}    Status - Enhanced git status with AI insights`);
    console.log(`  ${color.cyan('g i')}    Init - Initialize a new Git repository`);
    console.log(`  ${color.cyan('g p')}    Preview - See what will be committed`);
    console.log(`  ${color.cyan('g l')}    Local - AI commit locally`);
    console.log(`  ${color.cyan('g o')}    Online - AI commit + push`);
    console.log(`  ${color.cyan('g ls')}   List - Short commit history`);
    console.log(`  ${color.cyan('g ll')}   Large List - Detailed commit history`);
    console.log(`  ${color.cyan('g h')}    History - Alias for list`);
    console.log(`  ${color.cyan('g a')}    Amend - Smart amend with AI`);
    console.log(`  ${color.cyan('g u')}    Undo - Undo last commit\n`);
    
    console.log(color.bold('Quick Setup:'));
    console.log(`  ${color.cyan('g setup --api-key gemini')}    🚀 gemini-2.5-flash (recommended)`);
    console.log(`  ${color.cyan('g setup --api-key openai')}    💎 gpt-5 (high quality)`);
    console.log(`  ${color.cyan('g setup --api-key groq')}      ⚡ groq/compound (ultra fast)\n`);
    
    console.log(color.bold('Essential Workflow:'));
    console.log(`  ${color.cyan('g s')}              Check what's changed`);
    console.log(`  ${color.cyan('g int')} or ${color.cyan('g o')}      Commit with AI (interactive or online)`);
    console.log(`  ${color.cyan('g ls')} or ${color.cyan('g h')}      View history\n`);
    
    console.log(`For full help: ${color.cyan('g --help')}`);
    console.log(`For detailed docs: See README.md`);
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
        const msg = await generateCommitMessage(rawDiff, opts);
        if (opts.progressIndicators) Progress.stop('');

        if (opts.json) {
          const out = { message: msg };
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
      const msg = await generateCommitMessage(rawDiff, opts);
      if (opts.progressIndicators) Progress.stop('');

      if (opts.dryRun) {
        console.log(color.yellow('[dry-run] Would commit with message:'));
        console.log(msg);
        return;
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
      const msg = await generateCommitMessage(rawDiff, opts);
      if (opts.progressIndicators) Progress.stop('');

      if (opts.dryRun) {
        console.log(color.yellow('[dry-run] Would commit & push with message:'));
        console.log(msg);
        return;
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

program.command('amend').alias('a')
  .description('Stage all changes and amend last commit')
  .option('--no-edit', 'Keep existing commit message')
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

      if (cmdOptions.noEdit) {
        await git.raw(['commit', '--amend', '--no-edit']);
        Progress.success('Amended last commit with staged changes');
      } else {
        // Generate new message for amend
        Progress.start('🤖 Generating updated commit message');
        const newMessage = await generateCommitMessage(rawDiff, getOpts());
        Progress.stop('');
        
        await git.raw(['commit', '--amend', '-m', newMessage]);
        Progress.success(`Amended commit: "${newMessage}"`);
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
        console.log(`${color.cyan((i+1).toString())}. ${color.yellow(c.hash.slice(0,7))} ${c.message}`);
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
        console.log(`${color.cyan((i+1).toString())}. ${color.yellow(c.hash.slice(0,7))} | ${color.dim(date)} | ${color.green(c.author_name)} → ${c.message}`);
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
        console.log(`${color.cyan((i+1).toString())}. ${color.yellow(c.hash.slice(0,7))} ${c.message}`);
      });
      
      if (log.all.length >= limit) {
        console.log(color.dim(`\n... showing last ${limit} commits (use --limit to see more)`));
      }
    } catch (e) { 
      handleError('History error', e); 
    }
  });

program.command('branch <c> [name]').alias('b')
  .description('Branch from commit/index')
  .action(async (c, name) => {
    await ensureRepo();
    try { const sha = await resolveCommit(c); const br = name || `branch-${sha.slice(0,7)}`; await git.checkout(['-b', br, sha]); console.log(`Switched to branch ${br} at ${sha}`); }
    catch (e) { handleError('Branch error', e); }
  });

program.command('reset <c>').alias('r')
  .description('Reset branch to commit/index')
  .option('--hard','hard reset')
  .action(async (c, optsCmd) => {
    await ensureRepo();
    try {
      const sha = await resolveCommit(c);
      const mode = optsCmd.hard? '--hard':'--soft';
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

program.parse(process.argv);
