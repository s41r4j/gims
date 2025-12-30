/**
 * ANSI color utilities without external dependencies
 */
const color = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  blue: (s) => `\x1b[34m${s}\x1b[0m`,
  magenta: (s) => `\x1b[35m${s}\x1b[0m`,
  white: (s) => `\x1b[37m${s}\x1b[0m`,
  gray: (s) => `\x1b[90m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  italic: (s) => `\x1b[3m${s}\x1b[0m`,
  underline: (s) => `\x1b[4m${s}\x1b[0m`,
  // Background colors
  bgGreen: (s) => `\x1b[42m\x1b[30m${s}\x1b[0m`,
  bgYellow: (s) => `\x1b[43m\x1b[30m${s}\x1b[0m`,
  bgRed: (s) => `\x1b[41m\x1b[37m${s}\x1b[0m`,
  bgCyan: (s) => `\x1b[46m\x1b[30m${s}\x1b[0m`,
  bgBlue: (s) => `\x1b[44m\x1b[37m${s}\x1b[0m`,
  // Compound styles
  success: (s) => `\x1b[32m✓\x1b[0m ${s}`,
  warning: (s) => `\x1b[33m⚠\x1b[0m ${s}`,
  error: (s) => `\x1b[31m✗\x1b[0m ${s}`,
  info: (s) => `\x1b[36mℹ\x1b[0m ${s}`,
  reset: '\x1b[0m'
};

module.exports = { color };