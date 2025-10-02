const fs = require('fs');
const path = require('path');
const { color } = require('../utils/colors');

/**
 * Enhanced configuration management with validation and setup wizard
 */
class ConfigManager {
  constructor() {
    this.configPaths = [
      path.join(process.cwd(), '.gimsrc'),
      path.join(process.env.HOME || process.cwd(), '.gimsrc'),
    ];
  }

  getDefaults() {
    return {
      provider: process.env.GIMS_PROVIDER || 'auto',
      model: process.env.GIMS_MODEL || '',
      conventional: !!(process.env.GIMS_CONVENTIONAL === '1'),
      copy: process.env.GIMS_COPY !== '0',
      autoStage: process.env.GIMS_AUTO_STAGE === '1',
      maxDiffSize: parseInt(process.env.GIMS_MAX_DIFF_SIZE) || 100000,
      cacheEnabled: process.env.GIMS_CACHE !== '0',
      progressIndicators: process.env.GIMS_PROGRESS !== '0'
    };
  }

  load() {
    const defaults = this.getDefaults();
    
    for (const configPath of this.configPaths) {
      try {
        if (fs.existsSync(configPath)) {
          const content = fs.readFileSync(configPath, 'utf8');
          const config = JSON.parse(content);
          return { ...defaults, ...config, _source: configPath };
        }
      } catch (error) {
        console.warn(color.yellow(`Warning: Invalid config file ${configPath}: ${error.message}`));
      }
    }
    
    return { ...defaults, _source: 'defaults' };
  }

  save(config, global = false) {
    const configPath = global 
      ? path.join(process.env.HOME || process.cwd(), '.gimsrc')
      : path.join(process.cwd(), '.gimsrc');
    
    // Remove internal properties
    const { _source, ...cleanConfig } = config;
    
    try {
      fs.writeFileSync(configPath, JSON.stringify(cleanConfig, null, 2));
      return configPath;
    } catch (error) {
      throw new Error(`Failed to save config: ${error.message}`);
    }
  }

  set(key, value, global = false) {
    const config = this.load();
    
    // Validate key
    const validKeys = Object.keys(this.getDefaults());
    if (!validKeys.includes(key)) {
      throw new Error(`Invalid config key: ${key}. Valid keys: ${validKeys.join(', ')}`);
    }

    // Type conversion
    if (typeof this.getDefaults()[key] === 'boolean') {
      value = value === 'true' || value === '1';
    } else if (typeof this.getDefaults()[key] === 'number') {
      value = parseInt(value);
      if (isNaN(value)) {
        throw new Error(`Invalid number value for ${key}`);
      }
    }

    config[key] = value;
    const savedPath = this.save(config, global);
    return { key, value, savedPath };
  }

  get(key) {
    const config = this.load();
    if (key) {
      return config[key];
    }
    return config;
  }

  detectProjectType() {
    const cwd = process.cwd();
    
    if (fs.existsSync(path.join(cwd, 'package.json'))) {
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
        if (pkg.dependencies?.react || pkg.devDependencies?.react) return 'react';
        if (pkg.dependencies?.vue || pkg.devDependencies?.vue) return 'vue';
        if (pkg.dependencies?.angular || pkg.devDependencies?.angular) return 'angular';
        if (pkg.dependencies?.express || pkg.devDependencies?.express) return 'express';
        return 'node';
      } catch (e) {
        // ignore
      }
    }
    
    if (fs.existsSync(path.join(cwd, 'requirements.txt')) || 
        fs.existsSync(path.join(cwd, 'pyproject.toml'))) return 'python';
    if (fs.existsSync(path.join(cwd, 'Cargo.toml'))) return 'rust';
    if (fs.existsSync(path.join(cwd, 'go.mod'))) return 'go';
    if (fs.existsSync(path.join(cwd, 'pom.xml'))) return 'java';
    
    return 'generic';
  }

  getProjectCommitStyle(projectType) {
    const styles = {
      react: { conventional: true, types: ['feat', 'fix', 'style', 'refactor', 'test'] },
      vue: { conventional: true, types: ['feat', 'fix', 'style', 'refactor', 'test'] },
      angular: { conventional: true, types: ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore'] },
      node: { conventional: true, types: ['feat', 'fix', 'perf', 'refactor', 'test', 'chore'] },
      python: { conventional: false, style: 'descriptive' },
      generic: { conventional: false, style: 'simple' }
    };
    
    return styles[projectType] || styles.generic;
  }

  async runSetupWizard() {
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

    console.log(color.bold('\n🚀 GIMS Setup Wizard\n'));
    
    // Detect project
    const projectType = this.detectProjectType();
    const projectStyle = this.getProjectCommitStyle(projectType);
    
    console.log(`Detected project type: ${color.cyan(projectType)}`);
    
    // Provider setup
    console.log('\n📡 AI Provider Setup:');
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasGemini = !!process.env.GEMINI_API_KEY;
    const hasGroq = !!process.env.GROQ_API_KEY;
    
    if (!hasOpenAI && !hasGemini && !hasGroq) {
      console.log(color.yellow('No AI providers detected. GIMS will use local heuristics.'));
      console.log('\nTo enable AI features, run:');
      console.log(`  ${color.cyan('g setup --api-key gemini')}   # Recommended: Fast & free`);
      console.log(`  ${color.cyan('g setup --api-key openai')}   # High quality`);
      console.log(`  ${color.cyan('g setup --api-key groq')}     # Ultra fast`);
      console.log('\nOr set environment variables manually:');
      console.log('  - OPENAI_API_KEY (gpt-4o-mini)');
      console.log('  - GEMINI_API_KEY (gemini-2.0-flash-exp)');
      console.log('  - GROQ_API_KEY (llama-3.1-8b-instant)');
    } else {
      console.log('Available providers with default models:');
      if (hasGemini) console.log(`  ${color.green('✓')} Google Gemini (gemini-2.0-flash-exp)`);
      if (hasOpenAI) console.log(`  ${color.green('✓')} OpenAI (gpt-4o-mini)`);
      if (hasGroq) console.log(`  ${color.green('✓')} Groq (llama-3.1-8b-instant)`);
    }

    const provider = await question(`\nPreferred provider (auto/openai/gemini/groq/none) [auto]: `) || 'auto';
    
    // Commit style
    const conventionalDefault = projectStyle.conventional ? 'y' : 'n';
    const conventional = await question(`\nUse Conventional Commits? (y/n) [${conventionalDefault}]: `) || conventionalDefault;
    
    // Other preferences
    const autoStage = await question('Auto-stage all changes by default? (y/n) [n]: ') || 'n';
    const copy = await question('Copy suggestions to clipboard? (y/n) [y]: ') || 'y';
    
    // Global or local config
    const scope = await question('\nSave config globally or for this project? (global/local) [local]: ') || 'local';
    
    rl.close();

    // Save configuration
    const config = {
      provider,
      conventional: conventional.toLowerCase() === 'y',
      autoStage: autoStage.toLowerCase() === 'y',
      copy: copy.toLowerCase() === 'y',
      projectType
    };

    const savedPath = this.save(config, scope === 'global');
    
    console.log(`\n${color.green('✓')} Configuration saved to: ${savedPath}`);
    console.log('\nYou\'re all set! Try running:');
    console.log(`  ${color.cyan('g status')} - See enhanced git status`);
    console.log(`  ${color.cyan('g o')} - AI commit and push`);
    console.log(`  ${color.cyan('g s')} - Get AI suggestions`);
    
    return config;
  }
}

module.exports = { ConfigManager };