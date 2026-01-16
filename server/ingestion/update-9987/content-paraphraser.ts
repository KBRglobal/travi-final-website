/**
 * Content Paraphraser - Update 9987
 * 
 * Inspired by style-transfer-paraphrase and Rasa Paraphraser.
 * Provides content variation for SEO and multi-language quality.
 * 
 * Features:
 * - Style transfer (formal/casual/professional)
 * - Tone adjustment
 * - Sentence restructuring
 * - Vocabulary enrichment
 * - SEO-optimized variations
 */

import { log } from '../../lib/logger';

const paraphraseLogger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[ContentParaphraser] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) => log.warn(`[ContentParaphraser] ${msg}`, data),
  error: (msg: string, error?: unknown, data?: Record<string, unknown>) => log.error(`[ContentParaphraser] ${msg}`, error, data),
};

// ============================================================================
// Types
// ============================================================================

export type ParaphraseStyle = 
  | 'formal'       // Academic, professional
  | 'casual'       // Conversational, friendly
  | 'professional' // Business, polished
  | 'engaging'     // Marketing, persuasive
  | 'informative'  // Educational, clear
  | 'concise'      // Brief, to-the-point
  | 'detailed';    // Comprehensive, thorough

export type ToneLevel = 'neutral' | 'positive' | 'enthusiastic' | 'authoritative';

export interface ParaphraseOptions {
  style?: ParaphraseStyle;
  tone?: ToneLevel;
  preserveKeywords?: string[];      // Keywords to keep unchanged
  targetLength?: 'shorter' | 'same' | 'longer';
  seoOptimized?: boolean;           // Optimize for search engines
  avoidRepetition?: boolean;        // Vary vocabulary
  maintainMeaning?: boolean;        // Strict meaning preservation
  seed?: number;                    // Seed for deterministic output (0-999)
  variationIndex?: number;          // Which variation to produce (0-2)
}

export interface ParaphraseResult {
  original: string;
  paraphrased: string;
  style: ParaphraseStyle;
  changes: ParaphraseChange[];
  qualityScore: number; // 0-100
  readabilityScore: number;
  keywordsPreserved: boolean;
}

export interface ParaphraseChange {
  type: 'synonym' | 'restructure' | 'simplify' | 'expand' | 'tone';
  original: string;
  replacement: string;
  reason: string;
}

// ============================================================================
// Vocabulary & Patterns
// ============================================================================

// Synonym mappings for travel content
const TRAVEL_SYNONYMS: Record<string, string[]> = {
  // Positive adjectives
  'beautiful': ['stunning', 'breathtaking', 'magnificent', 'spectacular', 'gorgeous'],
  'amazing': ['incredible', 'remarkable', 'extraordinary', 'exceptional', 'outstanding'],
  'good': ['excellent', 'superb', 'wonderful', 'fantastic', 'great'],
  'nice': ['lovely', 'pleasant', 'delightful', 'charming', 'attractive'],
  'big': ['large', 'spacious', 'expansive', 'vast', 'substantial'],
  'small': ['compact', 'intimate', 'cozy', 'boutique', 'petite'],
  
  // Travel verbs
  'visit': ['explore', 'discover', 'experience', 'tour', 'see'],
  'go': ['travel', 'journey', 'venture', 'head', 'proceed'],
  'see': ['witness', 'observe', 'view', 'behold', 'admire'],
  'enjoy': ['savor', 'relish', 'appreciate', 'delight in', 'revel in'],
  'stay': ['lodge', 'reside', 'remain', 'stop', 'sojourn'],
  
  // Travel nouns
  'place': ['destination', 'location', 'spot', 'venue', 'site'],
  'trip': ['journey', 'adventure', 'excursion', 'expedition', 'voyage'],
  'hotel': ['accommodation', 'property', 'resort', 'lodging', 'establishment'],
  'restaurant': ['eatery', 'dining establishment', 'culinary venue', 'bistro', 'dining spot'],
  'view': ['panorama', 'vista', 'scenery', 'outlook', 'perspective'],
  
  // Descriptors
  'famous': ['renowned', 'celebrated', 'acclaimed', 'distinguished', 'notable'],
  'popular': ['sought-after', 'beloved', 'favored', 'well-loved', 'in-demand'],
  'old': ['historic', 'ancient', 'heritage', 'traditional', 'time-honored'],
  'new': ['modern', 'contemporary', 'recent', 'fresh', 'innovative'],
  'cheap': ['affordable', 'budget-friendly', 'economical', 'value', 'cost-effective'],
  'expensive': ['premium', 'upscale', 'luxury', 'high-end', 'exclusive'],
};

// Transition words by style
const TRANSITIONS: Record<ParaphraseStyle, string[]> = {
  formal: ['Furthermore', 'Moreover', 'Additionally', 'Consequently', 'Subsequently'],
  casual: ['Also', 'Plus', 'And', 'So', 'Then'],
  professional: ['In addition', 'Furthermore', 'Additionally', 'As a result', 'Therefore'],
  engaging: ['What\'s more', 'Best of all', 'Even better', 'Not to mention', 'You\'ll love that'],
  informative: ['Notably', 'Importantly', 'Specifically', 'In particular', 'Worth noting'],
  concise: ['Also', 'Plus', 'And', 'Next', 'Finally'],
  detailed: ['To elaborate', 'In greater detail', 'Expanding on this', 'Delving deeper', 'To be specific'],
};

// Sentence starters by tone
const SENTENCE_STARTERS: Record<ToneLevel, string[]> = {
  neutral: ['The', 'This', 'It', 'There', 'Located'],
  positive: ['Enjoy', 'Discover', 'Experience', 'Delight in', 'Savor'],
  enthusiastic: ['Don\'t miss', 'You\'ll love', 'Prepare to be amazed by', 'Get ready for', 'Incredible'],
  authoritative: ['The renowned', 'The acclaimed', 'The distinguished', 'The notable', 'The esteemed'],
};

// Phrases to enhance engagement
const ENGAGEMENT_PHRASES: Record<string, string[]> = {
  recommendation: [
    'We highly recommend',
    'A must-visit is',
    'Be sure to experience',
    'Don\'t leave without trying',
    'One of the highlights is',
  ],
  description: [
    'Known for its',
    'Famous for',
    'Celebrated for',
    'Renowned for its',
    'Distinguished by',
  ],
  experience: [
    'Immerse yourself in',
    'Experience the magic of',
    'Discover the charm of',
    'Explore the wonders of',
    'Uncover the beauty of',
  ],
};

// ============================================================================
// Core Paraphraser Class
// ============================================================================

export class ContentParaphraser {
  private defaultOptions: ParaphraseOptions = {
    style: 'professional',
    tone: 'positive',
    targetLength: 'same',
    seoOptimized: true,
    avoidRepetition: true,
    maintainMeaning: true,
    seed: 0,
    variationIndex: 0,
  };

  /**
   * Deterministic selection based on seed and content hash
   * Ensures same input + same seed = same output
   */
  private deterministicSelect<T>(items: T[], seed: number, contentHash: number): T {
    const index = (seed + contentHash) % items.length;
    return items[Math.abs(index) % items.length];
  }

  /**
   * Simple string hash for deterministic selection
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < Math.min(str.length, 100); i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Deterministic check based on content position and seed
   */
  private shouldApply(index: number, seed: number, threshold: number): boolean {
    return ((index * 7 + seed) % 10) >= threshold;
  }

  /**
   * Paraphrase a piece of content
   */
  paraphrase(content: string, options?: ParaphraseOptions): ParaphraseResult {
    const opts = { ...this.defaultOptions, ...options };
    paraphraseLogger.info('Starting paraphrase', { 
      contentLength: content.length, 
      style: opts.style,
      tone: opts.tone,
    });

    const changes: ParaphraseChange[] = [];
    let result = content;

    // Step 1: Apply synonym replacements
    result = this.applySynonyms(result, opts, changes);

    // Step 2: Adjust sentence structure based on style
    result = this.adjustStructure(result, opts, changes);

    // Step 3: Apply tone adjustments
    result = this.adjustTone(result, opts, changes);

    // Step 4: Handle target length
    result = this.adjustLength(result, opts, changes);

    // Step 5: SEO optimization if enabled
    if (opts.seoOptimized) {
      result = this.optimizeForSEO(result, opts.preserveKeywords || [], changes);
    }

    // Calculate quality metrics
    const qualityScore = this.calculateQualityScore(content, result, changes);
    const readabilityScore = this.calculateReadability(result);
    const keywordsPreserved = this.checkKeywordsPreserved(
      content, 
      result, 
      opts.preserveKeywords || []
    );

    paraphraseLogger.info('Paraphrase complete', {
      changesCount: changes.length,
      qualityScore,
      readabilityScore,
    });

    return {
      original: content,
      paraphrased: result,
      style: opts.style || 'professional',
      changes,
      qualityScore,
      readabilityScore,
      keywordsPreserved,
    };
  }

  /**
   * Generate multiple variations
   */
  generateVariations(content: string, count: number = 3): ParaphraseResult[] {
    const styles: ParaphraseStyle[] = ['professional', 'engaging', 'informative'];
    const variations: ParaphraseResult[] = [];

    for (let i = 0; i < Math.min(count, styles.length); i++) {
      variations.push(this.paraphrase(content, { style: styles[i] }));
    }

    return variations;
  }

  /**
   * Paraphrase for multi-language SEO (avoid duplicate content)
   */
  paraphraseForLocalization(
    content: string, 
    targetLocale: string,
    sourceLocale: string = 'en'
  ): ParaphraseResult {
    // Add locale-specific adjustments
    const options: ParaphraseOptions = {
      style: 'professional',
      tone: 'positive',
      seoOptimized: true,
      avoidRepetition: true,
    };

    // RTL languages might need different sentence structures
    const rtlLocales = ['ar', 'he', 'fa', 'ur'];
    if (rtlLocales.includes(targetLocale)) {
      options.style = 'formal';
    }

    return this.paraphrase(content, options);
  }

  // ============================================================================
  // Transformation Methods
  // ============================================================================

  /**
   * Apply synonym replacements
   */
  private applySynonyms(
    content: string, 
    options: ParaphraseOptions,
    changes: ParaphraseChange[]
  ): string {
    let result = content;
    const usedSynonyms = new Set<string>();

    for (const [word, synonyms] of Object.entries(TRAVEL_SYNONYMS)) {
      // Create regex for whole word matching
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      
      if (regex.test(result)) {
        // Pick a synonym based on style
        const synonym = this.selectSynonym(
          synonyms, 
          options.style || 'professional',
          usedSynonyms
        );
        
        if (synonym) {
          const originalWord = result.match(regex)?.[0] || word;
          result = result.replace(regex, synonym);
          usedSynonyms.add(synonym.toLowerCase());
          
          changes.push({
            type: 'synonym',
            original: originalWord,
            replacement: synonym,
            reason: `Replaced with ${options.style} alternative`,
          });
        }
      }
    }

    return result;
  }

  /**
   * Adjust sentence structure based on style
   * Uses deterministic selection based on seed
   */
  private adjustStructure(
    content: string,
    options: ParaphraseOptions,
    changes: ParaphraseChange[]
  ): string {
    const sentences = content.split(/(?<=[.!?])\s+/);
    const style = options.style || 'professional';
    const seed = options.seed || 0;
    
    const restructured = sentences.map((sentence, index) => {
      // Add transitions deterministically based on sentence index and seed
      // Only apply to every 3rd sentence to avoid over-transitioning
      if (index > 0 && this.shouldApply(index, seed, 7)) {
        const transitions = TRANSITIONS[style];
        const sentenceHash = this.hashString(sentence);
        const transition = this.deterministicSelect(transitions, seed, sentenceHash);
        
        // Only add if sentence doesn't already start with a transition
        if (!transitions.some(t => sentence.startsWith(t))) {
          const newSentence = `${transition}, ${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}`;
          changes.push({
            type: 'restructure',
            original: sentence.substring(0, 30) + '...',
            replacement: newSentence.substring(0, 30) + '...',
            reason: 'Added transition for better flow',
          });
          return newSentence;
        }
      }

      return sentence;
    });

    return restructured.join(' ');
  }

  /**
   * Adjust tone of content
   * Uses deterministic selection based on seed
   */
  private adjustTone(
    content: string,
    options: ParaphraseOptions,
    changes: ParaphraseChange[]
  ): string {
    const tone = options.tone || 'positive';
    const seed = options.seed || 0;
    let result = content;

    // Apply engagement phrases for enthusiastic tone
    if (tone === 'enthusiastic' || tone === 'positive') {
      const phraseTypes = Object.entries(ENGAGEMENT_PHRASES);
      let typeIndex = 0;
      
      for (const [type, phrases] of phraseTypes) {
        // Deterministically enhance some descriptions based on seed
        if (this.shouldApply(typeIndex, seed, 8)) {
          const contentHash = this.hashString(content);
          const phrase = this.deterministicSelect(phrases, seed, contentHash + typeIndex);
          
          // Look for patterns to enhance
          if (type === 'description') {
            const descPattern = /is (a |an )?(\w+ ){1,3}(place|destination|attraction|hotel|restaurant)/gi;
            if (descPattern.test(result)) {
              const match = result.match(descPattern)?.[0];
              if (match) {
                const enhanced = match.replace(/^is/, phrase);
                result = result.replace(match, enhanced);
                changes.push({
                  type: 'tone',
                  original: match,
                  replacement: enhanced,
                  reason: `Enhanced with ${tone} tone`,
                });
              }
            }
          }
        }
        typeIndex++;
      }
    }

    return result;
  }

  /**
   * Adjust content length
   * Uses deterministic selection based on seed
   */
  private adjustLength(
    content: string,
    options: ParaphraseOptions,
    changes: ParaphraseChange[]
  ): string {
    const target = options.targetLength || 'same';
    const seed = options.seed || 0;
    
    if (target === 'same') return content;

    const sentences = content.split(/(?<=[.!?])\s+/);

    if (target === 'shorter' && sentences.length > 2) {
      // Remove less important sentences (middle ones) deterministically
      const shortened = [
        sentences[0],
        ...sentences.slice(1, -1).filter((_, i) => i % 2 === 0),
        sentences[sentences.length - 1],
      ].join(' ');

      changes.push({
        type: 'simplify',
        original: `${sentences.length} sentences`,
        replacement: `${Math.ceil(sentences.length * 0.7)} sentences`,
        reason: 'Condensed for brevity',
      });

      return shortened;
    }

    if (target === 'longer') {
      const elaborations = [
        ' This is particularly noteworthy.',
        ' Visitors often highlight this aspect.',
        ' This adds to the overall experience.',
      ];
      
      // Add elaboration phrases deterministically
      const expanded = sentences.map((sentence, index) => {
        // Deterministically add elaboration to every 3rd sentence that's long enough
        if (this.shouldApply(index, seed, 7) && sentence.length > 20) {
          const sentenceHash = this.hashString(sentence);
          const elaboration = this.deterministicSelect(elaborations, seed, sentenceHash);
          return sentence + elaboration;
        }
        return sentence;
      }).join(' ');

      changes.push({
        type: 'expand',
        original: `${content.length} chars`,
        replacement: `${expanded.length} chars`,
        reason: 'Expanded for detail',
      });

      return expanded;
    }

    return content;
  }

  /**
   * Optimize content for SEO
   */
  private optimizeForSEO(
    content: string,
    preserveKeywords: string[],
    changes: ParaphraseChange[]
  ): string {
    let result = content;

    // Ensure keywords appear naturally
    for (const keyword of preserveKeywords) {
      if (!result.toLowerCase().includes(keyword.toLowerCase())) {
        // Try to naturally insert the keyword
        const sentences = result.split(/(?<=[.!?])\s+/);
        if (sentences.length > 1) {
          sentences[0] = `${keyword} - ${sentences[0]}`;
          result = sentences.join(' ');
          
          changes.push({
            type: 'restructure',
            original: '(keyword missing)',
            replacement: keyword,
            reason: 'Added preserved keyword for SEO',
          });
        }
      }
    }

    return result;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Select appropriate synonym based on style
   */
  private selectSynonym(
    synonyms: string[],
    style: ParaphraseStyle,
    usedSynonyms: Set<string>
  ): string | null {
    // Filter out already used synonyms for variety
    const available = synonyms.filter(s => !usedSynonyms.has(s.toLowerCase()));
    if (available.length === 0) return null;

    // Style-based preference
    const formalPreference = ['formal', 'professional', 'authoritative'].includes(style);
    
    if (formalPreference) {
      // Prefer longer, more formal words
      return available.sort((a, b) => b.length - a.length)[0];
    } else {
      // Prefer shorter, more casual words
      return available.sort((a, b) => a.length - b.length)[0];
    }
  }

  /**
   * Calculate quality score of paraphrase
   */
  private calculateQualityScore(
    original: string,
    paraphrased: string,
    changes: ParaphraseChange[]
  ): number {
    let score = 70; // Base score

    // Bonus for making changes
    score += Math.min(15, changes.length * 3);

    // Penalty for being too similar
    const similarity = this.calculateSimilarity(original, paraphrased);
    if (similarity > 0.9) score -= 10;
    if (similarity < 0.5) score -= 20; // Too different might lose meaning

    // Bonus for maintaining length
    const lengthRatio = paraphrased.length / original.length;
    if (lengthRatio > 0.8 && lengthRatio < 1.2) score += 5;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate readability score (Flesch-Kincaid inspired)
   */
  private calculateReadability(content: string): number {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce((sum, word) => sum + this.countSyllables(word), 0);

    if (sentences.length === 0 || words.length === 0) return 50;

    const avgSentenceLength = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;

    // Flesch Reading Ease formula (simplified)
    const score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Count syllables in a word (approximate)
   */
  private countSyllables(word: string): number {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;
    
    const vowels = word.match(/[aeiouy]+/g);
    let count = vowels ? vowels.length : 1;
    
    // Adjust for silent e
    if (word.endsWith('e')) count--;
    
    return Math.max(1, count);
  }

  /**
   * Calculate text similarity (Jaccard-like)
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Check if keywords are preserved
   */
  private checkKeywordsPreserved(
    original: string,
    paraphrased: string,
    keywords: string[]
  ): boolean {
    for (const keyword of keywords) {
      const originalHas = original.toLowerCase().includes(keyword.toLowerCase());
      const paraphrasedHas = paraphrased.toLowerCase().includes(keyword.toLowerCase());
      
      if (originalHas && !paraphrasedHas) return false;
    }
    return true;
  }
}

// Export singleton instance
export const contentParaphraser = new ContentParaphraser();

/**
 * Quick paraphrase function
 */
export function paraphrase(content: string, options?: ParaphraseOptions): ParaphraseResult {
  return contentParaphraser.paraphrase(content, options);
}

/**
 * Generate variations
 */
export function generateVariations(content: string, count?: number): ParaphraseResult[] {
  return contentParaphraser.generateVariations(content, count);
}
