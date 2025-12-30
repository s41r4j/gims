const { color } = require('../utils/colors');
const { Intelligence } = require('../utils/intelligence');

/**
 * Enhanced git analysis and insights
 */
class GitAnalyzer {
  constructor(git) {
    this.git = git;
    this.intelligence = new Intelligence(git);
  }

  async getEnhancedStatus() {
    try {
      const status = await this.git.status();
      const insights = await this.generateStatusInsights(status);
      const sessionStats = await this.intelligence.getSessionStats();
      const branchContext = await this.intelligence.detectBranchContext();

      return {
        ...status,
        insights,
        summary: this.generateStatusSummary(status),
        sessionStats,
        branchContext,
      };
    } catch (error) {
      throw new Error(`Failed to get git status: ${error.message}`);
    }
  }

  generateStatusSummary(status) {
    const files = Array.isArray(status.files) ? status.files : [];
    const staged = Array.isArray(status.staged) ? status.staged : [];
    const modified = Array.isArray(status.modified) ? status.modified : [];
    const created = Array.isArray(status.created) ? status.created : [];
    const deleted = Array.isArray(status.deleted) ? status.deleted : [];
    const untracked = Array.isArray(status.not_added) ? status.not_added : [];

    if (files.length === 0) return 'Working tree clean';

    const parts = [];
    if (staged.length > 0) parts.push(`${staged.length} staged`);
    if (modified.length > 0) parts.push(`${modified.length} modified`);
    if (created.length > 0) parts.push(`${created.length} new`);
    if (deleted.length > 0) parts.push(`${deleted.length} deleted`);
    if (untracked.length > 0) parts.push(`${untracked.length} untracked`);

    return parts.join(', ');
  }

  async generateStatusInsights(status) {
    const insights = [];

    // Ensure arrays exist and have proper methods
    const modified = Array.isArray(status.modified) ? status.modified : [];
    const created = Array.isArray(status.created) ? status.created : [];
    const deleted = Array.isArray(status.deleted) ? status.deleted : [];
    const files = Array.isArray(status.files) ? status.files : [];
    const staged = Array.isArray(status.staged) ? status.staged : [];

    // Check for common patterns
    if (modified.some(f => String(f).includes('package.json'))) {
      insights.push('📦 Dependencies may have changed - consider updating package-lock.json');
    }

    if (created.some(f => String(f).includes('.env'))) {
      insights.push('🔐 New environment file detected - ensure it\'s in .gitignore');
    }

    if (modified.some(f => String(f).includes('README'))) {
      insights.push('📚 Documentation updated - good practice!');
    }

    if (deleted.length > created.length + modified.length) {
      insights.push('🧹 Cleanup operation detected - removing more than adding');
    }

    if (files.length > 20) {
      insights.push('📊 Large changeset - consider using `g split` to break into smaller commits');
    }

    // Check for test files
    const testFiles = files.filter(f => {
      const fileName = String(f);
      return fileName.includes('.test.') || fileName.includes('.spec.') || fileName.includes('__tests__');
    });
    if (testFiles.length > 0) {
      insights.push('🧪 Test files modified - great for code quality!');
    }

    // Check for config files
    const configFiles = files.filter(f => {
      const fileName = String(f);
      return fileName.includes('config') || fileName.includes('.json') || fileName.includes('.yml') || fileName.includes('.yaml');
    });
    if (configFiles.length > 0) {
      insights.push('⚙️ Configuration changes detected');
    }

    // Suggest staging if nothing staged
    if (staged.length === 0 && files.length > 0) {
      insights.push('💡 Nothing staged yet - use `g o --all` to stage and commit everything');
    }

    return insights;
  }

  async analyzeCommitHistory(limit = 10) {
    try {
      const log = await this.git.log({ maxCount: limit });
      const commits = log.all;

      if (commits.length === 0) {
        return { totalCommits: 0 };
      }

      const analysis = {
        totalCommits: commits.length,
        authors: [...new Set(commits.map(c => c.author_name))],
        averageMessageLength: commits.reduce((sum, c) => sum + c.message.length, 0) / commits.length,
        conventionalCommits: commits.filter(c => /^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?:/.test(c.message)).length,
        recentActivity: this.analyzeRecentActivity(commits)
      };

      return analysis;
    } catch (error) {
      return { error: error.message };
    }
  }

  analyzeRecentActivity(commits) {
    const now = new Date();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const recentCommits = commits.filter(c => new Date(c.date) > oneDayAgo);
    const weeklyCommits = commits.filter(c => new Date(c.date) > oneWeekAgo);

    return {
      last24h: recentCommits.length,
      lastWeek: weeklyCommits.length,
      frequency: weeklyCommits.length > 0 ? 'active' : 'quiet'
    };
  }

  async getChangeComplexity(diff) {
    const lines = diff.split('\n');
    const additions = lines.filter(l => l.startsWith('+')).length;
    const deletions = lines.filter(l => l.startsWith('-')).length;
    const files = (diff.match(/diff --git/g) || []).length;

    let complexity = 'simple';
    let emoji = '🟢';
    if (files > 10 || additions + deletions > 500) {
      complexity = 'complex';
      emoji = '🔴';
    } else if (files > 5 || additions + deletions > 100) {
      complexity = 'moderate';
      emoji = '🟡';
    }

    return {
      complexity,
      emoji,
      files,
      additions,
      deletions,
      total: additions + deletions
    };
  }

  formatStatusOutput(enhancedStatus) {
    const {
      files = [],
      staged = [],
      modified = [],
      created = [],
      deleted = [],
      not_added = [],
      insights = [],
      summary = 'Unknown status',
      sessionStats = {},
      branchContext = {},
    } = enhancedStatus;

    let output = '';

    // Header with branch info
    output += `${color.bold('Git Status')}`;
    if (branchContext.branch) {
      output += ` ${color.dim('on')} ${color.cyan(branchContext.branch)}`;
      if (branchContext.type) {
        output += ` ${color.dim(`(${branchContext.type})`)}`;
      }
    }
    output += '\n';
    output += `${color.dim(summary)}\n`;

    // Session stats
    if (sessionStats.timeSinceLastCommit) {
      output += `${color.dim(`Last commit: ${sessionStats.timeSinceLastCommit}`)}`;
      if (sessionStats.commitsToday > 0) {
        output += `${color.dim(` • ${sessionStats.commitsToday} commit${sessionStats.commitsToday > 1 ? 's' : ''} today`)}`;
      }
      output += '\n';
    }
    output += '\n';

    // Staged changes
    if (staged.length > 0) {
      output += `${color.green('Staged for commit:')}\n`;
      staged.forEach(file => {
        const emoji = Intelligence.getFileEmoji(file);
        output += `  ${color.green('+')} ${emoji} ${file}\n`;
      });
      output += '\n';
    }

    // Modified files
    if (modified.length > 0) {
      output += `${color.yellow('Modified (not staged):')}\n`;
      modified.forEach(file => {
        const emoji = Intelligence.getFileEmoji(file);
        output += `  ${color.yellow('M')} ${emoji} ${file}\n`;
      });
      output += '\n';
    }

    // New files
    if (created.length > 0) {
      output += `${color.cyan('New files:')}\n`;
      created.forEach(file => {
        const emoji = Intelligence.getFileEmoji(file);
        output += `  ${color.cyan('N')} ${emoji} ${file}\n`;
      });
      output += '\n';
    }

    // Deleted files
    if (deleted.length > 0) {
      output += `${color.red('Deleted:')}\n`;
      deleted.forEach(file => {
        const emoji = Intelligence.getFileEmoji(file);
        output += `  ${color.red('D')} ${emoji} ${file}\n`;
      });
      output += '\n';
    }

    // Untracked files
    if (not_added.length > 0) {
      output += `${color.dim('Untracked files:')}\n`;
      not_added.slice(0, 10).forEach(file => {
        const emoji = Intelligence.getFileEmoji(file);
        output += `  ${color.dim('?')} ${emoji} ${file}\n`;
      });
      if (not_added.length > 10) {
        output += `  ${color.dim(`... and ${not_added.length - 10} more`)}\n`;
      }
      output += '\n';
    }

    // AI Insights
    if (insights.length > 0) {
      output += `${color.cyan('💡 Insights:')}\n`;
      insights.forEach(insight => {
        output += `  ${insight}\n`;
      });
    }

    return output;
  }

  /**
   * Get today's commits formatted nicely
   */
  async getTodayCommits() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const log = await this.git.log({ '--since': today.toISOString() });
      return log.all;
    } catch (error) {
      return [];
    }
  }

  /**
   * Format commit for display
   */
  formatCommit(commit, index) {
    const hash = color.yellow(commit.hash.substring(0, 7));
    const message = commit.message.split('\n')[0];
    const time = new Date(commit.date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    return `  ${color.dim(`${index + 1}.`)} ${hash} ${message} ${color.dim(`(${time})`)}`;
  }
}

module.exports = { GitAnalyzer };