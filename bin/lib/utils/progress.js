const { color } = require('./colors');

/**
 * Progress indicators and user feedback utilities
 */
class Progress {
  static spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  static current = 0;
  static interval = null;

  static start(message) {
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
    process.stdout.write(`\r${finalMessage}\n`);
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
}

module.exports = { Progress };