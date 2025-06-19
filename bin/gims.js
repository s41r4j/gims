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

const program = new Command();
const git = simpleGit();

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
function cleanCommitMessage(message) {
  // Remove markdown code blocks and formatting
  let cleaned = message
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/`([^`]+)`/g, '$1')    // Remove inline code formatting
    .replace(/^\s*[-*+]\s*/gm, '')  // Remove bullet points
    .replace(/^\s*\d+\.\s*/gm, '')  // Remove numbered lists
    .replace(/^\s*#+\s*/gm, '')     // Remove headers
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
    .replace(/\*(.*?)\*/g, '$1')     // Remove italic formatting
    .trim();
  
  // Take only the first line if multiple lines exist
  const firstLine = cleaned.split('\n')[0].trim();
  
  // Ensure it's not too long
  return firstLine.length > 72 ? firstLine.substring(0, 69) + '...' : firstLine;
}

// Estimate tokens (rough approximation: 1 token ≈ 4 characters)
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

// Generate commit message with multiple fallback strategies
async function generateCommitMessage(rawDiff) {
  const MAX_TOKENS = 100000; // Conservative limit (well below 128k)
  const MAX_CHARS = MAX_TOKENS * 4;
  
  let content = rawDiff;
  let strategy = 'full';

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
      
      content = [
        modified.length > 0 ? `Modified: ${modified.join(', ')}` : '',
        created.length > 0 ? `Added: ${created.join(', ')}` : '',
        deleted.length > 0 ? `Deleted: ${deleted.join(', ')}` : ''
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
    fallback: 'Write a concise git commit message for:'
  };

  const prompt = `${prompts[strategy]}\n${content}`;

  // Final safety check
  if (estimateTokens(prompt) > MAX_TOKENS) {
    console.warn('Changes too large for AI analysis, using default message');
    return 'Update multiple files';
  }

  let message = 'Update project code'; // Default fallback

  try {
    if (process.env.GEMINI_API_KEY) {
      const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const res = await genai.models.generateContent({ 
        model: 'gemini-2.0-flash', 
        contents: prompt 
      });
      message = (await res.response.text()).trim();
    } else if (process.env.OPENAI_API_KEY) {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 100 // Limit response length
      });
      message = res.choices[0].message.content.trim();
    }
  } catch (error) {
    if (error.code === 'context_length_exceeded') {
      console.warn('Content still too large for AI, using default message');
      return 'Update multiple files';
    }
    console.warn('AI generation failed:', error.message);
  }

  return cleanCommitMessage(message);
}

async function resolveCommit(input) {
  if (/^\d+$/.test(input)) {
    const { all } = await safeLog();
    const idx = Number(input) - 1;
    if (idx < 0 || idx >= all.length) throw new Error('Index out of range');
    return all[idx].hash;
  }
  return input;
}

async function hasChanges() {
  const status = await git.status();
  return status.files.length > 0;
}

program.name('gims').alias('g').version('0.4.3');

program.command('init').alias('i')
  .description('Initialize a new Git repository')
  .action(async () => { await git.init(); console.log('Initialized repo.'); });

program.command('clone <repo>').alias('c')
  .description('Clone a Git repository')
  .action(async (repo) => {
    try { await git.clone(repo); console.log(`Cloned ${repo}`); }
    catch (e) { console.error('Clone error:', e.message); }
  });

program.command('suggest').alias('s')
  .description('Suggest commit message and copy to clipboard')
  .action(async () => {
    if (!(await hasChanges())) {
      return console.log('No changes to suggest.');
    }

    const { all } = await safeLog();
    const isFirst = all.length === 0;
    
    // Always add changes first
    await git.add('.');
    
    // Get the appropriate diff
    const rawDiff = await git.diff(['--cached']);
    
    if (!rawDiff.trim()) {
      return console.log('No changes to suggest.');
    }
    
    const msg = await generateCommitMessage(rawDiff);
    
    try {
      clipboard.writeSync(msg);
      console.log(`Suggested: "${msg}" (copied to clipboard)`);
    } catch (error) {
      console.log(`Suggested: "${msg}" (clipboard copy failed)`);
    }
  });

program.command('local').alias('l')
  .description('AI-powered local commit')
  .action(async () => {
    if (!(await hasChanges())) {
      return console.log('No changes to commit.');
    }

    const { all } = await safeLog();
    const isFirst = all.length === 0;
    
    // Always add changes first
    await git.add('.');
    
    // Get the appropriate diff
    const rawDiff = await git.diff(['--cached']);
    
    if (!rawDiff.trim()) {
      return console.log('No changes to commit.');
    }
    
    const msg = await generateCommitMessage(rawDiff);
    await git.commit(msg);
    console.log(`Committed locally: "${msg}"`);
  });

program.command('online').alias('o')
  .description('AI commit + push')
  .action(async () => {
    if (!(await hasChanges())) {
      return console.log('No changes to commit.');
    }

    const { all } = await safeLog();
    const isFirst = all.length === 0;
    
    // Always add changes first
    await git.add('.');
    
    // Get the appropriate diff
    const rawDiff = await git.diff(['--cached']);
    
    if (!rawDiff.trim()) {
      return console.log('No changes to commit.');
    }
    
    const msg = await generateCommitMessage(rawDiff);
    await git.commit(msg);
    await git.push();
    console.log(`Committed & pushed: "${msg}"`);
  });

program.command('pull').alias('p')
  .description('Pull latest changes')
  .action(async () => {
    try { await git.pull(); console.log('Pulled latest.'); }
    catch (e) { console.error('Pull error:', e.message); }
  });

program.command('list').alias('ls')
  .description('Short numbered git log (oldest → newest)')
  .action(async () => {
    const { all } = await safeLog();
    all.reverse().forEach((c, i) => console.log(`${i+1}. ${c.hash.slice(0,7)} ${c.message}`));
  });

program.command('largelist').alias('ll')
  .description('Full numbered git log (oldest → newest)')
  .action(async () => {
    const { all } = await safeLog();
    all.reverse().forEach((c, i) => {
      const date = new Date(c.date).toLocaleString();
      console.log(`${i+1}. ${c.hash.slice(0,7)} | ${date} | ${c.author_name} → ${c.message}`);
    });
  });

program.command('branch <c> [name]').alias('b')
  .description('Branch from commit/index')
  .action(async (c, name) => {
    try { const sha = await resolveCommit(c); const br = name || `branch-${sha.slice(0,7)}`; await git.checkout(['-b', br, sha]); console.log(`Switched to branch ${br} at ${sha}`); }
    catch (e) { console.error('Branch error:', e.message); }
  });

program.command('reset <c>').alias('r')
  .description('Reset branch to commit/index')
  .option('--hard','hard reset')
  .action(async (c, opts) => {
    try { const sha = await resolveCommit(c); const mode = opts.hard? '--hard':'--soft'; await git.raw(['reset', mode, sha]); console.log(`Reset (${mode}) to ${sha}`); }
    catch (e) { console.error('Reset error:', e.message); }
  });

program.command('revert <c>').alias('rv')
  .description('Revert commit/index safely')
  .action(async (c) => {
    try { const sha = await resolveCommit(c); await git.revert(sha); console.log(`Reverted ${sha}`); }
    catch (e) { console.error('Revert error:', e.message); }
  });

program.parse(process.argv);