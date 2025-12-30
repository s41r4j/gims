const { OpenAI } = require('openai');
const { GoogleGenAI } = require('@google/genai');
const { Progress } = require('../utils/progress');
const { color } = require('../utils/colors');

/**
 * Enhanced AI provider management with caching and fallbacks
 */
class AIProviderManager {
  constructor(config = {}) {
    this.config = config;
    this.cache = new Map();
    this.maxCacheSize = 100;
  }

  resolveProvider(preference = 'auto') {
    if (preference === 'none') return 'none';
    if (preference === 'openai') return process.env.OPENAI_API_KEY ? 'openai' : 'none';
    if (preference === 'gemini') return process.env.GEMINI_API_KEY ? 'gemini' : 'none';
    if (preference === 'groq') return process.env.GROQ_API_KEY ? 'groq' : 'none';

    // Auto-detection with preference order (Gemini first - fastest and cheapest)
    if (process.env.GEMINI_API_KEY) return 'gemini';
    if (process.env.OPENAI_API_KEY) return 'openai';
    if (process.env.GROQ_API_KEY) return 'groq';
    return 'none';
  }

  getDefaultModel(provider) {
    const defaults = {
      'gemini': 'gemini-3-flash-preview',  // Latest Gemini model
      'openai': 'gpt-5.2-2025-12-11',      // Latest GPT model
      'groq': 'groq/compound'              // Latest Groq model
    };
    return defaults[provider] || '';
  }

  getCacheKey(prompt, options) {
    const crypto = require('crypto');
    const key = JSON.stringify({ prompt: prompt.substring(0, 1000), options });
    return crypto.createHash('md5').update(key).digest('hex');
  }

  getFromCache(cacheKey) {
    if (!this.config.cacheEnabled) return null;
    return this.cache.get(cacheKey);
  }

  setCache(cacheKey, result, usedLocal = false) {
    if (!this.config.cacheEnabled) return;

    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(cacheKey, {
      result,
      usedLocal,
      timestamp: Date.now()
    });
  }

  async generateWithProvider(provider, prompt, options = {}) {
    const { model = '', temperature = 0.3, maxTokens = 200 } = options;

    try {
      switch (provider) {
        case 'gemini':
          return await this.generateWithGemini(prompt, model || this.getDefaultModel('gemini'), options);
        case 'openai':
          return await this.generateWithOpenAI(prompt, model || this.getDefaultModel('openai'), options);
        case 'groq':
          return await this.generateWithGroq(prompt, model || this.getDefaultModel('groq'), options);
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }
    } catch (error) {
      throw new Error(`${provider} generation failed: ${error.message}`);
    }
  }

  async generateWithGemini(prompt, model, options) {
    const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const actualModel = model || this.getDefaultModel('gemini');
    const response = await genai.models.generateContent({
      model: actualModel,
      contents: prompt,
    });
    return (await response.response.text()).trim();
  }

  async generateWithOpenAI(prompt, model, options) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const actualModel = model || this.getDefaultModel('openai');
    const response = await openai.chat.completions.create({
      model: actualModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature || 0.3,
      max_tokens: options.maxTokens || 200,
    });
    return (response.choices[0]?.message?.content || '').trim();
  }

  async generateWithGroq(prompt, model, options) {
    const groq = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1'
    });
    const actualModel = model || this.getDefaultModel('groq');
    const response = await groq.chat.completions.create({
      model: actualModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature || 0.3,
      max_tokens: options.maxTokens || 200,
    });
    return (response.choices[0]?.message?.content || '').trim();
  }

  async generateCommitMessage(diff, options = {}) {
    const {
      provider: preferredProvider = 'auto',
      conventional = false,
      body = false,
      verbose = false
    } = options;

    // Check cache first
    const cacheKey = this.getCacheKey(diff, { conventional, body });
    const cached = this.getFromCache(cacheKey);
    if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hour cache
      if (verbose) Progress.info('Using cached result');
      return { message: cached.result, usedLocal: cached.usedLocal || false };
    }

    const providerChain = this.buildProviderChain(preferredProvider);

    for (const provider of providerChain) {
      try {
        if (verbose) Progress.info(`Trying provider: ${provider}`);

        if (provider === 'local') {
          const result = await this.generateLocalHeuristic(diff, options);
          this.setCache(cacheKey, result, true);
          return { message: result, usedLocal: true };
        }

        const prompt = this.buildPrompt(diff, { conventional, body });
        const result = await this.generateWithProvider(provider, prompt, options);
        const cleaned = this.cleanCommitMessage(result, { body });

        this.setCache(cacheKey, cleaned, false);
        return { message: cleaned, usedLocal: false };

      } catch (error) {
        if (verbose) Progress.warning(`${provider} failed: ${error.message}`);
        continue;
      }
    }

    // Final fallback
    const fallback = 'Update project files';
    this.setCache(cacheKey, fallback, true);
    return { message: fallback, usedLocal: true };
  }

  buildProviderChain(preferred) {
    const available = [];

    if (preferred !== 'auto' && preferred !== 'none') {
      const resolved = this.resolveProvider(preferred);
      if (resolved !== 'none') available.push(resolved);
    } else if (preferred === 'auto') {
      if (process.env.GEMINI_API_KEY) available.push('gemini');
      if (process.env.OPENAI_API_KEY) available.push('openai');
      if (process.env.GROQ_API_KEY) available.push('groq');
    }

    available.push('local');
    return [...new Set(available)];
  }

  buildPrompt(diff, options) {
    const { conventional, body } = options;

    const style = conventional
      ? 'Use Conventional Commits format (e.g., feat:, fix:, chore:) for the subject.'
      : 'Subject must be a single short line.';

    const bodyInstr = body
      ? 'Provide a short subject line followed by an optional body separated by a blank line.'
      : 'Return only a short subject line without extra quotes.';

    return `Write a concise git commit message for these changes:\n${diff}\n\n${style} ${bodyInstr}`;
  }

  cleanCommitMessage(message, options = {}) {
    if (!message) return 'Update project code';

    // Remove markdown formatting
    let cleaned = message
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/^\s*[-*+]\s*/gm, '')
      .replace(/^\s*\d+\.\s*/gm, '')
      .replace(/^\s*#+\s*/gm, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
      .replace(/[\t\r]+/g, ' ')
      .trim();

    const lines = cleaned.split('\n').map(l => l.trim()).filter(Boolean);
    let subject = (lines[0] || '').replace(/\s{2,}/g, ' ').replace(/[\s:,.!;]+$/g, '').trim();

    if (subject.length === 0) subject = 'Update project code';
    // No length restriction - allow AI to generate full commit messages

    if (!options.body) return subject;

    const bodyLines = lines.slice(1).filter(l => l.length > 0);
    const bodyText = bodyLines.join('\n').trim();
    return bodyText ? `${subject}\n\n${bodyText}` : subject;
  }

  async generateLocalHeuristic(diff, options) {
    // This would need access to git status - simplified version
    const { conventional = false } = options;

    // Analyze diff for patterns
    const lines = diff.split('\n');
    const additions = lines.filter(l => l.startsWith('+')).length;
    const deletions = lines.filter(l => l.startsWith('-')).length;
    const files = (diff.match(/diff --git/g) || []).length;

    let type = 'chore';
    let subject = 'update files';

    if (additions > deletions * 2) {
      type = 'feat';
      subject = files === 1 ? 'add new functionality' : `add features to ${files} files`;
    } else if (deletions > additions * 2) {
      type = 'chore';
      subject = files === 1 ? 'remove unused code' : `clean up ${files} files`;
    } else if (diff.includes('test') || diff.includes('spec')) {
      type = 'test';
      subject = 'update tests';
    } else if (diff.includes('README') || diff.includes('doc')) {
      type = 'docs';
      subject = 'update documentation';
    }

    return conventional ? `${type}: ${subject}` : subject.charAt(0).toUpperCase() + subject.slice(1);
  }

  async generateMultipleSuggestions(diff, options = {}, count = 3) {
    const suggestions = [];
    const baseOptions = { ...options };

    // Generate different styles
    const variants = [
      { ...baseOptions, conventional: false },
      { ...baseOptions, conventional: true },
      { ...baseOptions, conventional: true, body: true }
    ];

    for (let i = 0; i < Math.min(count, variants.length); i++) {
      try {
        const result = await this.generateCommitMessage(diff, variants[i]);
        // Extract message string from result object
        const message = result.message || result;
        if (message && !suggestions.includes(message)) {
          suggestions.push(message);
        }
      } catch (error) {
        // Skip failed generations
      }
    }

    // Ensure we have at least one suggestion
    if (suggestions.length === 0) {
      suggestions.push('Update project files');
    }

    return suggestions;
  }
}

module.exports = { AIProviderManager };