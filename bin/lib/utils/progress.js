const { color } = require('./colors');

/**
 * Progress indicators and user feedback utilities
 */
class Progress {
  static spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  static current = 0;
  static interval = null;
  static startTime = null;

  static start(message) {
    this.startTime = Date.now();
    this.lastMessage = message;
    process.stdout.write(`${message} ${this.spinner[0]}`);
    this.interval = setInterval(() => {
      this.current = (this.current + 1) % this.spinner.length;
      process.stdout.write(`\r${message} ${this.spinner[this.current]}`);
    }, 100);
  }

  static stop(finalMessage = '') {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    const elapsed = this.getElapsed();
    const elapsedStr = elapsed ? ` ${color.dim(`(${elapsed})`)}` : '';
    // Clear the entire line before writing final message
    const clearLine = '\r\x1b[K'; // Carriage return + clear to end of line
    if (finalMessage) {
      process.stdout.write(`${clearLine}${finalMessage}${elapsedStr}\n`);
    } else {
      // Just clear the spinner line completely
      process.stdout.write(`${clearLine}`);
    }
    this.startTime = null;
    this.lastMessage = null;
  }

  static getElapsed() {
    if (!this.startTime) return null;
    const ms = Date.now() - this.startTime;
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  static success(message) {
    console.log(`${color.green('✓')} ${message}`);
  }

  static warning(message) {
    console.log(`${color.yellow('⚠')} ${message}`);
  }

  static error(message) {
    console.log(`${color.red('✗')} ${message}`);
  }

  static info(message) {
    console.log(`${color.cyan('ℹ')} ${message}`);
  }

  static step(step, total, message) {
    const progress = `[${step}/${total}]`;
    console.log(`${color.dim(progress)} ${message}`);
  }

  static cached(message) {
    console.log(`${color.magenta('⚡')} ${message} ${color.dim('(cached)')}`);
  }

  static tip(message) {
    console.log(`${color.blue('💡')} ${color.dim('Tip:')} ${message}`);
  }

  static box(title, lines) {
    const maxLen = Math.max(title.length, ...lines.map(l => l.replace(/\x1b\[[0-9;]*m/g, '').length));
    const top = `┌${'─'.repeat(maxLen + 2)}┐`;
    const bottom = `└${'─'.repeat(maxLen + 2)}┘`;
    const titleLine = `│ ${color.bold(title.padEnd(maxLen))} │`;

    console.log(top);
    console.log(titleLine);
    console.log(`├${'─'.repeat(maxLen + 2)}┤`);
    lines.forEach(line => {
      const plainLen = line.replace(/\x1b\[[0-9;]*m/g, '').length;
      const padding = ' '.repeat(maxLen - plainLen);
      console.log(`│ ${line}${padding} │`);
    });
    console.log(bottom);
  }

  // Random tips for contextual help
  static tips = [
    'Use `g int` for interactive commit wizard with multiple AI suggestions',
    'Use `g o` to commit and push in one command',
    'Use `g sg --multiple` to get 3 different commit message suggestions',
    'Configure your preferences with `g config --set key=value`',
    'Use `--all` flag to auto-stage all changes',
    'Use `g a` to amend your last commit',
    'Use `g sync --rebase` for cleaner history',
    'Set GEMINI_API_KEY for free AI-powered commits',
    'Use `g wip` for quick work-in-progress commits',
    'Use `g stats` to see your commit statistics',
  ];

  static showRandomTip() {
    const shouldShow = Math.random() < 0.15; // 15% chance
    if (shouldShow) {
      const tip = this.tips[Math.floor(Math.random() * this.tips.length)];
      console.log();
      this.tip(tip);
    }
  }
}

module.exports = { Progress };