const fs = require('fs');
const path = require('path');

/**
 * Intelligence utilities for smart git operations
 */
class Intelligence {
  constructor(git) {
    this.git = git;
  }

  /**
   * Get file type emoji based on file extension
   */
  static getFileEmoji(filename) {
    const ext = path.extname(filename).toLowerCase();
    const name = path.basename(filename).toLowerCase();
    
    // Special files
    if (name === 'package.json' || name === 'package-lock.json') return '📦';
    if (name === 'readme.md' || name === 'readme') return '📚';
    if (name === '.gitignore') return '🙈';
    if (name === '.env' || name.startsWith('.env.')) return '🔐';
    if (name === 'dockerfile' || name === 'docker-compose.yml') return '🐳';
    if (name.includes('config') || name.includes('rc')) return '⚙️';
    if (name === 'license' || name === 'license.md') return '📜';
    
    // Test files
    if (filename.includes('.test.') || filename.includes('.spec.') || filename.includes('__tests__')) return '🧪';
    
    // By extension
    const emojiMap = {
      '.js': '📄', '.jsx': '⚛️', '.ts': '📘', '.tsx': '⚛️',
      '.css': '🎨', '.scss': '🎨', '.sass': '🎨', '.less': '🎨',
      '.html': '🌐', '.htm': '🌐',
      '.json': '📋', '.yaml': '📋', '.yml': '📋', '.toml': '📋',
      '.md': '📝', '.mdx': '📝', '.txt': '📄',
      '.py': '🐍', '.rb': '💎', '.go': '🔷', '.rs': '🦀', '.java': '☕',
      '.sh': '🐚', '.bash': '🐚', '.zsh': '🐚',
      '.sql': '🗃️', '.graphql': '🔗', '.gql': '🔗',
      '.png': '🖼️', '.jpg': '🖼️', '.jpeg': '🖼️', '.gif': '🖼️', '.svg': '🎯',
      '.mp3': '🎵', '.wav': '🎵', '.mp4': '🎬', '.mov': '🎬',
      '.zip': '📦', '.tar': '📦', '.gz': '📦',
      '.lock': '🔒',
    };
    
    return emojiMap[ext] || '📄';
  }

  /**
   * Analyze user's commit patterns from history
   */
  async analyzeCommitPatterns(limit = 50) {
    try {
      const log = await this.git.log({ maxCount: limit });
      const commits = log.all;
      
      if (commits.length === 0) {
        return { hasHistory: false };
      }

      // Analyze patterns
      const conventionalPattern = /^(feat|fix|docs|style|refactor|test|chore|perf|build|ci|revert)(\(.+\))?:/i;
      const conventionalCommits = commits.filter(c => conventionalPattern.test(c.message));
      
      // Calculate average message length
      const avgLength = Math.round(commits.reduce((sum, c) => sum + c.message.split('\n')[0].length, 0) / commits.length);
      
      // Detect common scopes
      const scopes = {};
      commits.forEach(c => {
        const match = c.message.match(/^\w+\(([^)]+)\)/);
        if (match) {
          scopes[match[1]] = (scopes[match[1]] || 0) + 1;
        }
      });
      const topScopes = Object.entries(scopes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([scope]) => scope);

      // Detect if user uses emojis
      const emojiPattern = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/u;
      const usesEmojis = commits.some(c => emojiPattern.test(c.message));

      // Detect commit message style (imperative vs past tense)
      const imperativeWords = ['add', 'fix', 'update', 'remove', 'change', 'implement', 'refactor'];
      const pastTenseWords = ['added', 'fixed', 'updated', 'removed', 'changed', 'implemented', 'refactored'];
      
      let imperativeCount = 0;
      let pastTenseCount = 0;
      commits.forEach(c => {
        const firstWord = c.message.split(/[\s(:]/)[0].toLowerCase();
        if (imperativeWords.includes(firstWord)) imperativeCount++;
        if (pastTenseWords.includes(firstWord)) pastTenseCount++;
      });

      return {
        hasHistory: true,
        totalAnalyzed: commits.length,
        conventionalRatio: (conventionalCommits.length / commits.length * 100).toFixed(0),
        usesConventional: conventionalCommits.length > commits.length * 0.5,
        avgMessageLength: avgLength,
        topScopes,
        usesEmojis,
        style: imperativeCount >= pastTenseCount ? 'imperative' : 'past-tense',
        authors: [...new Set(commits.map(c => c.author_name))],
      };
    } catch (error) {
      return { hasHistory: false, error: error.message };
    }
  }

  /**
   * Detect semantic meaning of changes
   */
  async detectSemanticChanges(diff) {
    const changes = {
      type: 'misc',
      labels: [],
      suggestions: [],
      breakingChange: false,
    };

    if (!diff || !diff.trim()) return changes;

    const lines = diff.split('\n');
    const addedLines = lines.filter(l => l.startsWith('+') && !l.startsWith('+++'));
    const removedLines = lines.filter(l => l.startsWith('-') && !l.startsWith('---'));

    // Detect breaking changes
    if (removedLines.some(l => l.includes('export ') && l.includes('function ')) ||
        removedLines.some(l => l.includes('module.exports'))) {
      changes.labels.push('⚠️ Potential breaking change');
      changes.breakingChange = true;
    }

    // Detect new features
    if (addedLines.some(l => l.includes('export ') && l.includes('function ')) ||
        addedLines.some(l => l.includes('class ')) ||
        addedLines.some(l => l.includes('async function '))) {
      changes.labels.push('✨ New functionality');
      changes.type = 'feat';
    }

    // Detect bug fixes
    if (addedLines.some(l => l.includes('catch') || l.includes('try {')) ||
        addedLines.some(l => l.includes('|| null') || l.includes('?? ') || l.includes('?.'))) {
      changes.labels.push('🐛 Error handling');
      if (changes.type === 'misc') changes.type = 'fix';
    }

    // Detect refactoring
    if (addedLines.length > 20 && removedLines.length > 20 && 
        Math.abs(addedLines.length - removedLines.length) < 10) {
      changes.labels.push('♻️ Refactoring');
      if (changes.type === 'misc') changes.type = 'refactor';
    }

    // Detect documentation
    if (addedLines.some(l => l.includes('/**') || l.includes('* @') || l.includes('// '))) {
      changes.labels.push('📝 Documentation');
      if (changes.type === 'misc') changes.type = 'docs';
    }

    // Detect test changes
    if (diff.includes('.test.') || diff.includes('.spec.') || 
        addedLines.some(l => l.includes('describe(') || l.includes('it(') || l.includes('test('))) {
      changes.labels.push('🧪 Tests');
      if (changes.type === 'misc') changes.type = 'test';
    }

    // Detect dependency changes
    if (diff.includes('package.json') && (diff.includes('"dependencies"') || diff.includes('"devDependencies"'))) {
      changes.labels.push('📦 Dependencies');
    }

    // Detect style/formatting
    if (addedLines.every(l => l.trim().length < 3 || l.includes('  ') || l === '+')) {
      changes.labels.push('🎨 Formatting');
      if (changes.type === 'misc') changes.type = 'style';
    }

    return changes;
  }

  /**
   * Suggest how to split a large changeset
   */
  async suggestCommitSplit(status) {
    const files = status.files || [];
    if (files.length < 5) return null;

    const groups = {
      tests: [],
      config: [],
      docs: [],
      styles: [],
      core: [],
    };

    files.forEach(file => {
      const f = typeof file === 'string' ? file : file.path;
      if (!f) return;
      
      if (f.includes('.test.') || f.includes('.spec.') || f.includes('__tests__')) {
        groups.tests.push(f);
      } else if (f.includes('config') || f.endsWith('.json') || f.endsWith('.yml') || f.endsWith('.yaml') || f.includes('rc')) {
        groups.config.push(f);
      } else if (f.endsWith('.md') || f.includes('docs/') || f.includes('README')) {
        groups.docs.push(f);
      } else if (f.endsWith('.css') || f.endsWith('.scss') || f.endsWith('.sass')) {
        groups.styles.push(f);
      } else {
        groups.core.push(f);
      }
    });

    const suggestions = [];
    if (groups.tests.length > 0) suggestions.push({ type: 'test', files: groups.tests, message: 'test: add/update tests' });
    if (groups.config.length > 0) suggestions.push({ type: 'chore', files: groups.config, message: 'chore: update configuration' });
    if (groups.docs.length > 0) suggestions.push({ type: 'docs', files: groups.docs, message: 'docs: update documentation' });
    if (groups.styles.length > 0) suggestions.push({ type: 'style', files: groups.styles, message: 'style: update styles' });
    if (groups.core.length > 0) suggestions.push({ type: 'feat', files: groups.core, message: 'feat: update core functionality' });

    return suggestions.length > 1 ? suggestions : null;
  }

  /**
   * Get session statistics
   */
  async getSessionStats() {
    try {
      const log = await this.git.log({ maxCount: 1 });
      const lastCommit = log.all[0];
      
      let timeSinceLastCommit = 'No commits yet';
      let lastCommitMessage = null;
      
      if (lastCommit) {
        const lastCommitDate = new Date(lastCommit.date);
        const now = new Date();
        const diffMs = now - lastCommitDate;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffDays > 0) {
          timeSinceLastCommit = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        } else if (diffHours > 0) {
          timeSinceLastCommit = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else if (diffMins > 0) {
          timeSinceLastCommit = `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        } else {
          timeSinceLastCommit = 'Just now';
        }
        
        lastCommitMessage = lastCommit.message.split('\n')[0];
      }

      // Get today's commits
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayLog = await this.git.log({ '--since': today.toISOString() });
      const todayCommits = todayLog.all.length;

      return {
        timeSinceLastCommit,
        lastCommitMessage,
        commitsToday: todayCommits,
      };
    } catch (error) {
      return {
        timeSinceLastCommit: 'Unknown',
        lastCommitMessage: null,
        commitsToday: 0,
      };
    }
  }

  /**
   * Detect branch context for smarter commit messages
   */
  async detectBranchContext() {
    try {
      const branch = await this.git.branch();
      const currentBranch = branch.current;
      
      // Common patterns: feat/xyz, fix/xyz, feature/xyz, bugfix/xyz, hotfix/xyz
      const patterns = [
        { regex: /^feat(?:ure)?\/(.+)$/i, type: 'feat', scope: null },
        { regex: /^fix\/(.+)$/i, type: 'fix', scope: null },
        { regex: /^bugfix\/(.+)$/i, type: 'fix', scope: null },
        { regex: /^hotfix\/(.+)$/i, type: 'fix', scope: null },
        { regex: /^docs?\/(.+)$/i, type: 'docs', scope: null },
        { regex: /^refactor\/(.+)$/i, type: 'refactor', scope: null },
        { regex: /^test\/(.+)$/i, type: 'test', scope: null },
        { regex: /^chore\/(.+)$/i, type: 'chore', scope: null },
        { regex: /^style\/(.+)$/i, type: 'style', scope: null },
      ];

      for (const pattern of patterns) {
        const match = currentBranch.match(pattern.regex);
        if (match) {
          // Extract potential scope and description from branch name
          const branchPart = match[1].replace(/-/g, ' ').replace(/_/g, ' ');
          return {
            branch: currentBranch,
            type: pattern.type,
            description: branchPart,
            detected: true,
          };
        }
      }

      // Check for issue references like PROJ-123 or #123
      const issueMatch = currentBranch.match(/([A-Z]+-\d+|#\d+)/i);
      if (issueMatch) {
        return {
          branch: currentBranch,
          issueRef: issueMatch[1],
          detected: true,
        };
      }

      return {
        branch: currentBranch,
        detected: false,
      };
    } catch (error) {
      return { branch: 'unknown', detected: false };
    }
  }

  /**
   * Get commit statistics for the user
   */
  async getCommitStats(days = 30) {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);
      
      const log = await this.git.log({ '--since': since.toISOString() });
      const commits = log.all;
      
      if (commits.length === 0) {
        return { totalCommits: 0, hasData: false };
      }

      // Group by day
      const byDay = {};
      commits.forEach(c => {
        const day = new Date(c.date).toLocaleDateString();
        byDay[day] = (byDay[day] || 0) + 1;
      });

      // Calculate streaks
      const sortedDays = Object.keys(byDay).sort((a, b) => new Date(b) - new Date(a));
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      
      const today = new Date().toLocaleDateString();
      const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();
      
      // Check if today or yesterday has commits
      if (byDay[today] || byDay[yesterday]) {
        sortedDays.forEach((day, i) => {
          if (i === 0) {
            tempStreak = 1;
          } else {
            const prevDate = new Date(sortedDays[i - 1]);
            const currDate = new Date(day);
            const diffDays = Math.round((prevDate - currDate) / 86400000);
            if (diffDays === 1) {
              tempStreak++;
            } else {
              if (tempStreak > longestStreak) longestStreak = tempStreak;
              tempStreak = 1;
            }
          }
        });
        if (tempStreak > longestStreak) longestStreak = tempStreak;
        currentStreak = byDay[today] ? tempStreak : (byDay[yesterday] ? tempStreak : 0);
      }

      // Commit types breakdown
      const typeBreakdown = { feat: 0, fix: 0, docs: 0, style: 0, refactor: 0, test: 0, chore: 0, other: 0 };
      const conventionalPattern = /^(feat|fix|docs|style|refactor|test|chore|perf|build|ci|revert)/i;
      
      commits.forEach(c => {
        const match = c.message.match(conventionalPattern);
        if (match) {
          const type = match[1].toLowerCase();
          if (typeBreakdown.hasOwnProperty(type)) {
            typeBreakdown[type]++;
          } else {
            typeBreakdown.other++;
          }
        } else {
          typeBreakdown.other++;
        }
      });

      return {
        hasData: true,
        totalCommits: commits.length,
        daysActive: Object.keys(byDay).length,
        avgPerDay: (commits.length / days).toFixed(1),
        currentStreak,
        longestStreak,
        typeBreakdown,
        topDay: Object.entries(byDay).sort((a, b) => b[1] - a[1])[0],
      };
    } catch (error) {
      return { hasData: false, error: error.message };
    }
  }
}

module.exports = { Intelligence };
