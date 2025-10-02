const readline = require('readline');
const { color } = require('../utils/colors');
const { Progress } = require('../utils/progress');

/**
 * Interactive commit wizard and user input utilities
 */
class InteractiveCommands {
  constructor(git, aiProvider, analyzer) {
    this.git = git;
    this.aiProvider = aiProvider;
    this.analyzer = analyzer;
  }

  async promptUser(question, defaultValue = '') {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise(resolve => {
      rl.question(question, answer => {
        rl.close();
        resolve(answer.trim() || defaultValue);
      });
    });
  }

  async selectFromList(items, prompt = 'Select an option:', allowCustom = false) {
    console.log(`\n${color.bold(prompt)}`);
    
    items.forEach((item, index) => {
      console.log(`  ${color.cyan((index + 1).toString())}. ${item}`);
    });
    
    if (allowCustom) {
      console.log(`  ${color.cyan('c')}. Custom message`);
    }
    
    const maxChoice = items.length;
    const validChoices = Array.from({length: maxChoice}, (_, i) => (i + 1).toString());
    if (allowCustom) validChoices.push('c');
    
    let choice;
    do {
      choice = await this.promptUser(`\nChoice (1-${maxChoice}${allowCustom ? ', c' : ''}): `);
    } while (!validChoices.includes(choice));
    
    if (choice === 'c') {
      return await this.promptUser('Enter custom message: ');
    }
    
    return items[parseInt(choice) - 1];
  }

  async runInteractiveCommit(options = {}) {
    try {
      console.log(color.bold('\n🎯 Interactive Commit Wizard\n'));
      
      // Step 1: Check for changes
      Progress.step(1, 4, 'Analyzing changes...');
      const status = await this.git.status();
      
      if (status.files.length === 0) {
        Progress.warning('No changes detected');
        return;
      }
      
      // Step 2: Show status and get staging preference
      Progress.step(2, 4, 'Reviewing file changes...');
      const enhancedStatus = await this.analyzer.getEnhancedStatus();
      console.log(this.analyzer.formatStatusOutput(enhancedStatus));
      
      // Ask about staging
      let shouldStage = false;
      if (status.staged.length === 0) {
        const stageChoice = await this.promptUser(
          'No files are staged. Stage all changes? (y/n) [y]: ', 
          'y'
        );
        shouldStage = stageChoice.toLowerCase() === 'y';
        
        if (shouldStage) {
          await this.git.add('.');
          Progress.success('All changes staged');
        } else {
          console.log('You can manually stage files with: git add <file>');
          return;
        }
      }
      
      // Step 3: Generate commit message suggestions
      Progress.step(3, 4, 'Generating AI suggestions...');
      Progress.start('🤖 AI is analyzing your changes');
      
      const diff = await this.git.diff(['--cached', '--no-ext-diff']);
      if (!diff.trim()) {
        Progress.stop(color.yellow('No staged changes to commit'));
        return;
      }
      
      const suggestions = await this.aiProvider.generateMultipleSuggestions(diff, options, 3);
      Progress.stop(color.green('✓ Generated suggestions'));
      
      // Step 4: Let user choose
      Progress.step(4, 4, 'Select commit message...');
      const selectedMessage = await this.selectFromList(
        suggestions,
        'Choose a commit message:',
        true
      );
      
      // Confirm and commit
      console.log(`\nSelected message: ${color.green(selectedMessage)}`);
      const confirm = await this.promptUser('Proceed with commit? (y/n) [y]: ', 'y');
      
      if (confirm.toLowerCase() === 'y') {
        if (options.dryRun) {
          console.log(color.yellow('[dry-run] Would commit with message:'));
          console.log(selectedMessage);
        } else {
          await this.git.commit(selectedMessage);
          Progress.success(`Committed: "${selectedMessage}"`);
          
          // Ask about pushing
          const pushChoice = await this.promptUser('Push to remote? (y/n) [n]: ', 'n');
          if (pushChoice.toLowerCase() === 'y') {
            try {
              await this.git.push();
              Progress.success('Pushed to remote');
            } catch (error) {
              Progress.error(`Push failed: ${error.message}`);
            }
          }
        }
      } else {
        console.log('Commit cancelled');
      }
      
    } catch (error) {
      Progress.error(`Interactive commit failed: ${error.message}`);
      throw error;
    }
  }

  async runQuickCommit(message, options = {}) {
    try {
      const status = await this.git.status();
      
      if (status.files.length === 0) {
        console.log('No changes to commit');
        return;
      }
      
      // Auto-stage if nothing is staged
      if (status.staged.length === 0) {
        console.log(color.yellow('Auto-staging all changes...'));
        await this.git.add('.');
      }
      
      if (options.dryRun) {
        console.log(color.yellow('[dry-run] Would commit with message:'));
        console.log(message);
        return;
      }
      
      await this.git.commit(message);
      Progress.success(`Committed: "${message}"`);
      
      if (options.push) {
        try {
          await this.git.push();
          Progress.success('Pushed to remote');
        } catch (error) {
          Progress.warning(`Push failed: ${error.message}`);
        }
      }
      
    } catch (error) {
      Progress.error(`Quick commit failed: ${error.message}`);
      throw error;
    }
  }

  async showCommitPreview(options = {}) {
    try {
      const status = await this.git.status();
      
      if (status.files.length === 0) {
        console.log('No changes to preview');
        return;
      }
      
      // Show what would be committed
      const diff = await this.git.diff(['--cached', '--no-ext-diff']);
      if (!diff.trim()) {
        console.log(color.yellow('No staged changes. Use --all to stage everything.'));
        return;
      }
      
      console.log(color.bold('\n📋 Commit Preview\n'));
      
      // Show file summary
      const complexity = await this.analyzer.getChangeComplexity(diff);
      console.log(`Complexity: ${color.cyan(complexity.complexity)}`);
      console.log(`Files: ${complexity.files}, +${complexity.additions} -${complexity.deletions}`);
      
      // Generate and show AI suggestion
      Progress.start('🤖 Generating commit message');
      const suggestion = await this.aiProvider.generateCommitMessage(diff, options);
      Progress.stop('');
      
      console.log(`\nSuggested message: ${color.green(suggestion)}`);
      
      // Show diff summary (first few lines)
      console.log(`\n${color.bold('Changes:')}`);
      const diffLines = diff.split('\n').slice(0, 20);
      diffLines.forEach(line => {
        if (line.startsWith('+')) {
          console.log(color.green(line));
        } else if (line.startsWith('-')) {
          console.log(color.red(line));
        } else if (line.startsWith('@@')) {
          console.log(color.cyan(line));
        } else {
          console.log(color.dim(line));
        }
      });
      
      if (diff.split('\n').length > 20) {
        console.log(color.dim('... (truncated)'));
      }
      
    } catch (error) {
      Progress.error(`Preview failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = { InteractiveCommands };