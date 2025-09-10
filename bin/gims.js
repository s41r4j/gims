#!/usr/bin/env node

/*
  gims (Git Made Simple) CLI
*/
const { Command } = require('commander');
const simpleGit = require('simple-git');
const clipboard = require('clipboardy');
const process = require('process');
const { OpenAI } = require('openai');
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');

const program = new Command();
const git = simpleGit();

// Utility: ANSI colors without extra deps
const color = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

// Load simple config from .gimsrc (JSON) in cwd or home and env vars
function loadConfig() {
  const defaults = {
    provider: process.env.GIMS_PROVIDER || 'auto', // auto | openai | gemini | groq | none
    model: process.env.GIMS_MODEL || '',
    conventional: !!(process.env.GIMS_CONVENTIONAL === '1'),
    copy: process.env.GIMS_COPY !== '0',
  };
  const tryFiles = [
    path.join(process.cwd(), '.gimsrc'),
    path.join(process.env.HOME || process.cwd(), '.gimsrc'),
  ];
  for (const fp of tryFiles) {
    try {
      if (fs.existsSync(fp)) {
        const txt = fs.readFileSync(fp, 'utf8');
        const json = JSON.parse(txt);
        return { ...defaults, ...json };
      }
    } catch (_) {
      // ignore malformed config
    }
  }
  return defaults;
}

function getOpts() {
  // Merge precedence: CLI > config > env handled in loadConfig
  const cfg = loadConfig();
  const cli = program.opts();
  return {
    provider: cli.provider || cfg.provider,
    model: cli.model || cfg.model,
    stagedOnly: !!cli.stagedOnly,
    all: !!cli.all,
    noClipboard: !!cli.noClipboard || cfg.copy === false,
    body: !!cli.body,
    conventional: !!cli.conventional || cfg.conventional,
    dryRun: !!cli.dryRun,
    verbose: !!cli.verbose,
    json: !!cli.json,
    yes: !!cli.yes,
    amend: !!cli.amend,
    setUpstream: !!cli.setUpstream,
  };
}

async function ensureRepo() {
  const isRepo = await git.checkIsRepo();
  if (!isRepo) {
    console.error(color.red('Not a git repository (or any of the parent directories).'));
    process.exit(1);
  }
}

function handleError(prefix, err) {
  const msg = err && err.message ? err.message : String(err);
  console.error(color.red(`${prefix}: ${msg}`));
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

// Clean up AI-generated commit message
function cleanCommitMessage(message, { body = false } = {}) {
  if (!message) return 'Update project code';
  // Remove markdown code blocks and formatting
  let cleaned = message
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/`([^`]+)`/g, '$1')    // Remove inline code formatting
    .replace(/^\s*[-*+]\s*/gm, '')  // Remove bullet points
    .replace(/^\s*\d+\.\s*/gm, '')  // Remove numbered lists
    .replace(/^\s*#+\s*/gm, '')     // Remove headers
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
    .replace(/\*(.*?)\*/g, '$1')     // Remove italic formatting
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '') // strip most emojis
    .replace(/[\t\r]+/g, ' ')
    .trim();

  // If a body is allowed, split subject/body, otherwise keep first line only
  const lines = cleaned.split('\n').map(l => l.trim()).filter(Boolean);
  let subject = (lines[0] || '').replace(/\s{2,}/g, ' ').replace(/[\s:,.!;]+$/g, '').trim();
  if (subject.length === 0) subject = 'Update project code';
  // Enforce concise subject
  if (subject.length > 72) subject = subject.substring(0, 69) + '...';

  if (!body) return subject;

  const bodyLines = lines.slice(1).filter(l => l.length > 0);
  const bodyText = bodyLines.join('\n').trim();
  return bodyText ? `${subject}\n\n${bodyText}` : subject;
}

// Estimate tokens (rough approximation: 1 token ≈ 4 characters)
function estimateTokens(text) {
  return Math.ceil((text || '').length / 4);
}

function resolveProvider(pref) {
  // pref: auto|openai|gemini|groq|none
  if (pref === 'none') return 'none';
  if (pref === 'openai') return process.env.OPENAI_API_KEY ? 'openai' : 'none';
  if (pref === 'gemini') return process.env.GEMINI_API_KEY ? 'gemini' : 'none';
  if (pref === 'groq') return process.env.GROQ_API_KEY ? 'groq' : 'none';
  // auto
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.GROQ_API_KEY) return 'groq';
  return 'none';
}

async function getHumanReadableChanges(limitPerList = 10) {
  try {
    const status = await git.status();
    const modified = status.modified.slice(0, limitPerList);
    const created = status.created.slice(0, limitPerList);
    const deleted = status.deleted.slice(0, limitPerList);
    const renamed = status.renamed.map(r => `${r.from}→${r.to}`).slice(0, limitPerList);
    const parts = [];
    if (created.length) parts.push(`Added: ${created.join(', ')}`);
    if (modified.length) parts.push(`Modified: ${modified.join(', ')}`);
    if (deleted.length) parts.push(`Deleted: ${deleted.join(', ')}`);
    if (renamed.length) parts.push(`Renamed: ${renamed.join(', ')}`);
    return parts.join('\n');
  } catch (_) {
    return 'Multiple file changes.';
  }
}

function localHeuristicMessage(status, { conventional = false } = {}) {
  const created = status.created.length;
  const modified = status.modified.length;
  const deleted = status.deleted.length;
  const total = created + modified + deleted + status.renamed.length;

  const listFew = (arr) => arr.slice(0, 3).join(', ') + (arr.length > 3 ? ` and ${arr.length - 3} more` : '');

  let type = 'chore';
  let subject = 'update files';
  if (created > 0 && modified === 0 && deleted === 0) {
    type = 'feat';
    subject = created <= 3 ? `add ${listFew(status.created)}` : `add ${created} files`;
  } else if (deleted > 0 && created === 0 && modified === 0) {
    type = 'chore';
    subject = deleted <= 3 ? `remove ${listFew(status.deleted)}` : `remove ${deleted} files`;
  } else if (modified > 0 && created === 0 && deleted === 0) {
    type = 'chore';
    subject = modified <= 3 ? `update ${listFew(status.modified)}` : `update ${modified} files`;
  } else if (created > 0 || deleted > 0 || modified > 0) {
    type = 'chore';
    subject = `update ${total} files`;
  }
  const msg = conventional ? `${type}: ${subject}` : subject.charAt(0).toUpperCase() + subject.slice(1);
  return msg;
}

// Generate commit message with multiple fallback strategies
async function generateCommitMessage(rawDiff, options = {}) {
  const { conventional = false, body = false, provider: prefProvider = 'auto', model = '', verbose = false } = options;
  const MAX_TOKENS = 100000; // Conservative limit (well below 128k)
  const MAX_CHARS = MAX_TOKENS * 4;

  let content = rawDiff;
  let strategy = 'full';

  const logv = (m) => { if (verbose) console.log(color.cyan(`[gims] ${m}`)); };

  // Strategy 1: Check if full diff is too large
  if (estimateTokens(rawDiff) > MAX_TOKENS) {
    strategy = 'summary';
    try {
      const summary = await git.diffSummary();
      content = summary.files
        .map(f => `${f.file}: +${f.insertions} -${f.deletions}`)
        .join('\n');
    } catch (e) {
      strategy = 'fallback';
      content = 'Large changes across multiple files';
    }
  }

  // Strategy 2: If summary is still too large, use status
  if (strategy === 'summary' && estimateTokens(content) > MAX_TOKENS) {
    strategy = 'status';
    try {
      const status = await git.status();
      const modified = status.modified.slice(0, 10);
      const created = status.created.slice(0, 10);
      const deleted = status.deleted.slice(0, 10);
      const renamed = status.renamed.map(r => `${r.from}→${r.to}`).slice(0, 10);

      content = [
        modified.length > 0 ? `Modified: ${modified.join(', ')}` : '',
        created.length > 0 ? `Added: ${created.join(', ')}` : '',
        deleted.length > 0 ? `Deleted: ${deleted.join(', ')}` : '',
        renamed.length > 0 ? `Renamed: ${renamed.join(', ')}` : '',
      ].filter(Boolean).join('\n');

      if (status.files.length > 30) {
        content += `\n... and ${status.files.length - 30} more files`;
      }
    } catch (e) {
      strategy = 'fallback';
      content = 'Large changes across multiple files';
    }
  }

  // Strategy 3: If still too large, truncate
  if (estimateTokens(content) > MAX_TOKENS) {
    strategy = 'truncated';
    content = content.substring(0, MAX_CHARS - 1000) + '\n... (truncated)';
  }

  const prompts = {
    full: 'Write a concise git commit message for these changes:',
    summary: 'Changes are large; using summary. Write a concise git commit message for these changes:',
    status: 'Many files changed. Write a concise git commit message based on these file changes:',
    truncated: 'Large diff truncated. Write a concise git commit message for these changes:',
    fallback: 'Write a concise git commit message for:',
  };

  const style = conventional ? 'Use Conventional Commits (e.g., feat:, fix:, chore:) for the subject.' : 'Subject must be a single short line.';
  const bodyInstr = body ? 'Provide a short subject line followed by an optional body separated by a blank line.' : 'Return only a short subject line without extra quotes.';
  const prompt = `${prompts[strategy]}\n${content}\n\n${style} ${bodyInstr}`;

  // Final safety check
  if (estimateTokens(prompt) > MAX_TOKENS) {
    console.warn(color.yellow('Changes too large for AI analysis, using default message'));
    return cleanCommitMessage('Update multiple files', { body });
  }

  let message = 'Update project code'; // Default fallback
  const provider = resolveProvider(prefProvider);
  logv(`strategy=${strategy}, provider=${provider}${model ? `, model=${model}` : ''}`);

  try {
    if (provider === 'gemini') {
      const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const res = await genai.models.generateContent({
        model: model || 'gemini-2.0-flash',
        contents: prompt,
      });
      message = (await res.response.text()).trim();
    } else if (provider === 'openai') {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const res = await openai.chat.completions.create({
        model: model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: body ? 200 : 80,
      });
      message = (res.choices[0] && res.choices[0].message && res.choices[0].message.content || '').trim();
    } else if (provider === 'groq') {
      // Use OpenAI-compatible API via baseURL
      const groq = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1' });
      const res = await groq.chat.completions.create({
        model: model || 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: body ? 200 : 80,
      });
      message = (res.choices[0] && res.choices[0].message && res.choices[0].message.content || '').trim();
    } else {
      // Local heuristic fallback
      const status = await git.status();
      message = localHeuristicMessage(status, { conventional });
      const human = await getHumanReadableChanges();
      if (body) message = `${message}\n\n${human}`;
    }
  } catch (error) {
    if (error && error.code === 'context_length_exceeded') {
      console.warn(color.yellow('Content still too large for AI, using default message'));
      return cleanCommitMessage('Update multiple files', { body });
    }
    console.warn(color.yellow(`AI generation failed: ${error && error.message ? error.message : error}`));
    // fallback to local heuristic
    const status = await git.status();
    message = localHeuristicMessage(status, { conventional });
    const human = await getHumanReadableChanges();
    if (body) message = `${message}\n\n${human}`;
  }

  return cleanCommitMessage(message, { body });
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
  .option('--set-upstream', 'Set upstream on push if missing');

program.command('init').alias('i')
  .description('Initialize a new Git repository')
  .action(async () => { 
    try { await git.init(); console.log('Initialized repo.'); }
    catch (e) { handleError('Init error', e); }
  });

program.command('clone <repo>').alias('c')
  .description('Clone a Git repository')
  .action(async (repo) => {
    try { await git.clone(repo); console.log(`Cloned ${repo}`); }
    catch (e) { handleError('Clone error', e); }
  });

program.command('suggest').alias('s')
  .description('Suggest commit message and copy to clipboard')
  .action(async () => {
    await ensureRepo();
    const opts = getOpts();

    try {
      if (opts.all) {
        await git.add('.');
      }

      // Use staged changes only; do not auto-stage unless --all
      const rawDiff = await git.diff(['--cached', '--no-ext-diff']);
      if (!rawDiff.trim()) {
        if (opts.all) {
          console.log('No changes to suggest.');
          return;
        }
        console.log('No staged changes. Use --all to stage everything or stage files manually.');
        return;
      }

      const msg = await generateCommitMessage(rawDiff, opts);

      if (opts.json) {
        const out = { message: msg };
        console.log(JSON.stringify(out));
        return;
      }

      if (!opts.noClipboard) {
        try { clipboard.writeSync(msg); console.log(`Suggested: "${msg}" ${color.green('(copied to clipboard)')}`); }
        catch (_) { console.log(`Suggested: "${msg}" ${color.yellow('(clipboard copy failed)')}`); }
      } else {
        console.log(`Suggested: "${msg}"`);
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
        console.log('No changes to commit.');
        return;
      }

      if (opts.all) await git.add('.');

      const rawDiff = await git.diff(['--cached', '--no-ext-diff']);
      if (!rawDiff.trim()) { console.log('No staged changes to commit.'); return; }

      const msg = await generateCommitMessage(rawDiff, opts);

      if (opts.dryRun) {
        console.log(color.yellow('[dry-run] Would commit with message:'));
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
        console.log('No changes to commit.');
        return;
      }

      if (opts.all) await git.add('.');

      const rawDiff = await git.diff(['--cached', '--no-ext-diff']);
      if (!rawDiff.trim()) { console.log('No staged changes to commit.'); return; }

      const msg = await generateCommitMessage(rawDiff, opts);

      if (opts.dryRun) {
        console.log(color.yellow('[dry-run] Would commit & push with message:'));
        console.log(msg);
        return;
      }

      if (opts.amend) {
        await git.raw(['commit', '--amend', '-m', msg]);
      } else {
        await git.commit(msg);
      }

      try {
        await git.push();
        console.log(`Committed & pushed: "${msg}"`);
      } catch (pushErr) {
        const msgErr = pushErr && pushErr.message ? pushErr.message : String(pushErr);
        if (/no upstream|set the remote as upstream|have no upstream/.test(msgErr)) {
          // Try to set upstream if requested
          if (opts.setUpstream) {
            const branch = (await git.raw(['rev-parse', '--abbrev-ref', 'HEAD'])).trim();
            await git.push(['--set-upstream', 'origin', branch]);
            console.log(`Committed & pushed (upstream set to origin/${branch}): "${msg}"`);
          } else {
            console.log(color.yellow('Current branch has no upstream. Use --set-upstream to set origin/<branch> automatically.'));
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

      const rawDiff = await git.diff(['--cached', '--no-ext-diff']);
      if (!rawDiff.trim()) { console.log('No staged changes to commit.'); return; }

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

program.command('pull').alias('p')
  .description('Pull latest changes')
  .action(async () => {
    await ensureRepo();
    try { await git.pull(); console.log('Pulled latest.'); }
    catch (e) { handleError('Pull error', e); }
  });

program.command('amend').alias('a')
  .description('Stage all changes and amend last commit (no message edit)')
  .action(async () => {
    await ensureRepo();
    try {
      const { all } = await safeLog();
      if (!all || all.length === 0) {
        console.log('No commits to amend. Make an initial commit first.');
        return;
      }

      await git.add('.');

      const rawDiff = await git.diff(['--cached', '--no-ext-diff']);
      if (!rawDiff.trim()) {
        console.log('No staged changes to amend.');
        return;
      }

      await git.raw(['commit', '--amend', '--no-edit']);
      console.log('Amended last commit with staged changes.');
    } catch (e) {
      handleError('Amend error', e);
    }
  });

program.command('list').alias('ls')
  .description('Short numbered git log (oldest → newest)')
  .action(async () => {
    await ensureRepo();
    try {
      const { all } = await safeLog();
      [...all].reverse().forEach((c, i) => console.log(`${i+1}. ${c.hash.slice(0,7)} ${c.message}`));
    } catch (e) { handleError('List error', e); }
  });

program.command('largelist').alias('ll')
  .description('Full numbered git log (oldest → newest)')
  .action(async () => {
    await ensureRepo();
    try {
      const { all } = await safeLog();
      [...all].reverse().forEach((c, i) => {
        const date = new Date(c.date).toLocaleString();
        console.log(`${i+1}. ${c.hash.slice(0,7)} | ${date} | ${c.author_name} → ${c.message}`);
      });
    } catch (e) { handleError('Largelist error', e); }
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
      const mode = cmd.hard ? '--hard' : '--soft';
      const opts = getOpts();
      if (!opts.yes) {
        console.log(color.yellow(`About to run: git reset ${mode} HEAD~1. Use --yes to confirm.`));
        process.exit(1);
      }
      await git.raw(['reset', mode, 'HEAD~1']);
      console.log(`Reset (${mode}) to HEAD~1`);
    } catch (e) { handleError('Undo error', e); }
  });

program.parse(process.argv);
