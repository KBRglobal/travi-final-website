/**
 * Readability Analyzer - Content Quality Metrics
 * 
 * Update 9987 Phase 2.2: Automated readability scoring
 * 
 * Inspired by: textstat, language-tool-python
 * 
 * Metrics included:
 * - Flesch Reading Ease (60-70 = perfect for travel)
 * - Flesch-Kincaid Grade Level
 * - Gunning Fog Index
 * - SMOG Index
 * - Coleman-Liau Index
 * - Automated Readability Index (ARI)
 * - Dale-Chall Readability Score
 * - Linsear Write Formula
 * 
 * Also includes:
 * - Sentence/word/syllable counts
 * - Complex word detection
 * - Vocabulary diversity (type-token ratio)
 * - Average word/sentence length
 */

export interface ReadabilityMetrics {
  fleschReadingEase: number;
  fleschKincaidGrade: number;
  gunningFog: number;
  smogIndex: number;
  colemanLiauIndex: number;
  automatedReadabilityIndex: number;
  daleChallScore: number;
  linsearWriteFormula: number;
  
  statistics: {
    wordCount: number;
    sentenceCount: number;
    syllableCount: number;
    complexWordCount: number;
    characterCount: number;
    paragraphCount: number;
    averageWordsPerSentence: number;
    averageSyllablesPerWord: number;
    averageCharactersPerWord: number;
    vocabularyDiversity: number;
  };
  
  overallScore: number;
  gradeLevel: string;
  audience: string;
  recommendations: string[];
}

export interface ReadabilityOptions {
  targetAudience?: 'general' | 'travel' | 'academic' | 'business';
  locale?: string;
}

const DALE_CHALL_EASY_WORDS = new Set([
  'a', 'able', 'about', 'above', 'across', 'act', 'add', 'afraid', 'after', 'again',
  'against', 'age', 'ago', 'agree', 'air', 'all', 'almost', 'alone', 'along', 'already',
  'also', 'always', 'am', 'among', 'an', 'and', 'anger', 'angry', 'animal', 'another',
  'answer', 'any', 'appear', 'apple', 'are', 'area', 'arm', 'army', 'around', 'arrive',
  'art', 'as', 'ask', 'at', 'ate', 'attack', 'attempt', 'attention', 'aunt', 'away',
  'baby', 'back', 'bad', 'bag', 'ball', 'bank', 'base', 'basket', 'be', 'bear',
  'beat', 'beautiful', 'beauty', 'became', 'because', 'become', 'bed', 'been', 'before', 'began',
  'begin', 'behind', 'being', 'believe', 'bell', 'belong', 'below', 'beside', 'best', 'better',
  'between', 'beyond', 'big', 'bird', 'bit', 'black', 'block', 'blood', 'blow', 'blue',
  'board', 'boat', 'body', 'bone', 'book', 'born', 'both', 'bottom', 'box', 'boy',
  'branch', 'bread', 'break', 'breakfast', 'breath', 'bridge', 'bright', 'bring', 'broad', 'broke',
  'brother', 'brought', 'brown', 'build', 'built', 'burn', 'bus', 'bush', 'business', 'busy',
  'but', 'buy', 'by', 'cake', 'call', 'came', 'camp', 'can', 'capital', 'captain',
  'car', 'card', 'care', 'careful', 'carry', 'case', 'cat', 'catch', 'cattle', 'caught',
  'cause', 'cell', 'cent', 'center', 'certain', 'chair', 'chance', 'change', 'chapter', 'character',
  'charge', 'check', 'chief', 'child', 'children', 'choose', 'church', 'circle', 'city', 'class',
  'clean', 'clear', 'climb', 'clock', 'close', 'cloth', 'clothes', 'cloud', 'club', 'coat',
  'cold', 'collect', 'college', 'color', 'come', 'common', 'company', 'compare', 'complete', 'condition',
  'contain', 'continue', 'control', 'cook', 'cool', 'copy', 'corn', 'corner', 'correct', 'cost',
  'cotton', 'could', 'count', 'country', 'course', 'cover', 'cow', 'create', 'cross', 'crowd',
  'cry', 'cup', 'current', 'cut', 'dad', 'dance', 'danger', 'dark', 'daughter', 'day',
  'dead', 'deal', 'dear', 'death', 'decide', 'deep', 'demand', 'describe', 'desert', 'design',
  'desire', 'destroy', 'determine', 'develop', 'did', 'die', 'difference', 'different', 'difficult', 'dinner',
  'direct', 'direction', 'discover', 'distance', 'divide', 'do', 'doctor', 'does', 'dog', 'dollar',
  'done', 'door', 'double', 'down', 'draw', 'dream', 'dress', 'drink', 'drive', 'drop',
  'drove', 'dry', 'duck', 'during', 'dust', 'duty', 'each', 'ear', 'early', 'earth',
  'east', 'easy', 'eat', 'edge', 'education', 'effect', 'egg', 'eight', 'either', 'electric',
  'elephant', 'else', 'end', 'enemy', 'energy', 'engine', 'enjoy', 'enough', 'enter', 'entire',
  'equal', 'escape', 'even', 'evening', 'event', 'ever', 'every', 'exact', 'example', 'except',
  'excite', 'exercise', 'exist', 'expect', 'experience', 'explain', 'express', 'eye', 'face', 'fact',
  'fair', 'fall', 'family', 'famous', 'far', 'farm', 'farmer', 'fast', 'fat', 'father',
  'favor', 'fear', 'feed', 'feel', 'feet', 'fell', 'fellow', 'felt', 'few', 'field',
  'fight', 'figure', 'fill', 'final', 'find', 'fine', 'finger', 'finish', 'fire', 'first',
  'fish', 'fit', 'five', 'floor', 'flow', 'flower', 'fly', 'follow', 'food', 'foot',
  'for', 'force', 'foreign', 'forest', 'forget', 'form', 'forth', 'forward', 'found', 'four',
  'free', 'fresh', 'friend', 'from', 'front', 'fruit', 'full', 'fun', 'game', 'garden',
  'gas', 'gate', 'gather', 'gave', 'general', 'get', 'girl', 'give', 'glad', 'glass',
  'go', 'god', 'gold', 'gone', 'good', 'got', 'govern', 'government', 'grain', 'grand',
  'grass', 'gray', 'great', 'green', 'grew', 'ground', 'group', 'grow', 'guess', 'gun',
  'had', 'hair', 'half', 'hall', 'hand', 'hang', 'happen', 'happy', 'hard', 'has',
  'hat', 'have', 'he', 'head', 'hear', 'heard', 'heart', 'heat', 'heavy', 'held',
  'help', 'her', 'here', 'herself', 'hide', 'high', 'hill', 'him', 'himself', 'his',
  'history', 'hit', 'hold', 'hole', 'home', 'hope', 'horse', 'hospital', 'hot', 'hotel',
  'hour', 'house', 'how', 'however', 'human', 'hundred', 'hung', 'hunt', 'hurry', 'hurt',
  'I', 'ice', 'idea', 'if', 'imagine', 'important', 'in', 'inch', 'include', 'increase',
  'indeed', 'indicate', 'industry', 'influence', 'information', 'inside', 'instead', 'instrument', 'interest', 'into',
  'iron', 'is', 'island', 'it', 'its', 'itself', 'job', 'join', 'joy', 'judge',
  'jump', 'just', 'keep', 'kept', 'key', 'kill', 'kind', 'king', 'kitchen', 'knew',
  'know', 'knowledge', 'lady', 'lake', 'land', 'language', 'large', 'last', 'late', 'later',
  'laugh', 'law', 'lay', 'lead', 'learn', 'least', 'leave', 'led', 'left', 'leg',
  'length', 'less', 'let', 'letter', 'level', 'library', 'lie', 'life', 'lift', 'light',
  'like', 'line', 'lion', 'list', 'listen', 'little', 'live', 'local', 'long', 'look',
  'lost', 'lot', 'loud', 'love', 'low', 'machine', 'made', 'main', 'major', 'make',
  'man', 'many', 'map', 'mark', 'market', 'master', 'material', 'matter', 'may', 'me',
  'mean', 'measure', 'meat', 'meet', 'member', 'men', 'mention', 'middle', 'might', 'mile',
  'milk', 'million', 'mind', 'mine', 'minute', 'miss', 'modern', 'moment', 'money', 'month',
  'moon', 'more', 'morning', 'most', 'mother', 'mountain', 'mouth', 'move', 'much', 'music',
  'must', 'my', 'myself', 'name', 'nation', 'natural', 'nature', 'near', 'necessary', 'neck',
  'need', 'neighbor', 'neither', 'never', 'new', 'news', 'next', 'night', 'nine', 'no',
  'none', 'nor', 'north', 'nose', 'not', 'note', 'nothing', 'notice', 'now', 'number',
  'object', 'observe', 'ocean', 'of', 'off', 'offer', 'office', 'officer', 'often', 'oh',
  'oil', 'old', 'on', 'once', 'one', 'only', 'open', 'operate', 'opinion', 'opportunity',
  'or', 'order', 'organize', 'other', 'our', 'out', 'outside', 'over', 'own', 'page',
  'pain', 'paint', 'pair', 'paper', 'parent', 'park', 'part', 'particular', 'party', 'pass',
  'past', 'path', 'pay', 'peace', 'people', 'perhaps', 'period', 'person', 'pick', 'picture',
  'piece', 'place', 'plain', 'plan', 'plane', 'plant', 'play', 'please', 'pleasure', 'plenty',
  'poem', 'point', 'police', 'political', 'poor', 'popular', 'population', 'position', 'possible', 'power',
  'practice', 'prepare', 'present', 'president', 'press', 'pretty', 'price', 'print', 'private', 'prize',
  'probably', 'problem', 'produce', 'product', 'program', 'promise', 'property', 'protect', 'prove', 'provide',
  'public', 'pull', 'purpose', 'push', 'put', 'quality', 'question', 'quick', 'quiet', 'quite',
  'race', 'radio', 'rain', 'raise', 'ran', 'range', 'rather', 'reach', 'read', 'ready',
  'real', 'realize', 'reason', 'receive', 'record', 'red', 'reduce', 'refuse', 'region', 'remain',
  'remember', 'remove', 'repeat', 'reply', 'report', 'represent', 'require', 'rest', 'result', 'return',
  'rich', 'ride', 'right', 'ring', 'rise', 'river', 'road', 'rock', 'roll', 'room',
  'rose', 'round', 'row', 'rule', 'run', 'safe', 'said', 'sail', 'sale', 'salt',
  'same', 'sand', 'sat', 'save', 'saw', 'say', 'scene', 'school', 'science', 'sea',
  'season', 'seat', 'second', 'secret', 'section', 'see', 'seed', 'seem', 'seen', 'sell',
  'send', 'sense', 'sent', 'sentence', 'separate', 'serve', 'service', 'set', 'settle', 'seven',
  'several', 'shade', 'shake', 'shall', 'shape', 'share', 'she', 'shine', 'ship', 'shoe',
  'shop', 'shore', 'short', 'should', 'shoulder', 'shout', 'show', 'shut', 'sick', 'side',
  'sight', 'sign', 'silence', 'silver', 'similar', 'simple', 'since', 'sing', 'single', 'sister',
  'sit', 'situation', 'six', 'size', 'skin', 'sky', 'sleep', 'slow', 'small', 'smell',
  'smile', 'smoke', 'snow', 'so', 'social', 'society', 'soft', 'soil', 'sold', 'soldier',
  'some', 'son', 'song', 'soon', 'sort', 'sound', 'south', 'space', 'speak', 'special',
  'speech', 'speed', 'spell', 'spend', 'spirit', 'spot', 'spread', 'spring', 'square', 'stage',
  'stand', 'star', 'start', 'state', 'station', 'stay', 'step', 'stick', 'still', 'stock',
  'stone', 'stood', 'stop', 'store', 'story', 'straight', 'strange', 'stream', 'street', 'strength',
  'strike', 'strong', 'student', 'study', 'subject', 'success', 'such', 'sudden', 'suffer', 'sugar',
  'suggest', 'suit', 'summer', 'sun', 'supply', 'support', 'suppose', 'sure', 'surface', 'surprise',
  'sweet', 'swim', 'system', 'table', 'tail', 'take', 'talk', 'tall', 'taste', 'teach',
  'teacher', 'team', 'tell', 'ten', 'term', 'test', 'than', 'thank', 'that', 'the',
  'their', 'them', 'themselves', 'then', 'there', 'therefore', 'these', 'they', 'thick', 'thin',
  'thing', 'think', 'third', 'this', 'those', 'though', 'thought', 'thousand', 'three', 'through',
  'throw', 'thus', 'tie', 'till', 'time', 'tiny', 'to', 'today', 'together', 'told',
  'tomorrow', 'tone', 'tongue', 'tonight', 'too', 'took', 'tool', 'top', 'total', 'touch',
  'toward', 'town', 'track', 'trade', 'train', 'travel', 'tree', 'trial', 'trip', 'trouble',
  'truck', 'true', 'trust', 'truth', 'try', 'turn', 'twelve', 'twenty', 'two', 'type',
  'uncle', 'under', 'understand', 'union', 'unit', 'United', 'until', 'up', 'upon', 'us',
  'use', 'usual', 'valley', 'value', 'various', 'very', 'view', 'village', 'visit', 'voice',
  'vote', 'wait', 'walk', 'wall', 'want', 'war', 'warm', 'was', 'wash', 'watch',
  'water', 'wave', 'way', 'we', 'wear', 'weather', 'week', 'weight', 'well', 'went',
  'were', 'west', 'western', 'wet', 'what', 'wheel', 'when', 'where', 'whether', 'which',
  'while', 'white', 'who', 'whole', 'whose', 'why', 'wide', 'wife', 'wild', 'will',
  'win', 'wind', 'window', 'winter', 'wish', 'with', 'within', 'without', 'woman', 'women',
  'wonder', 'wood', 'word', 'work', 'world', 'worry', 'would', 'write', 'wrong', 'wrote',
  'yard', 'year', 'yellow', 'yes', 'yet', 'you', 'young', 'your', 'yourself', 'youth',
]);

export class ReadabilityAnalyzer {
  /**
   * Analyze text readability
   */
  analyze(text: string, options: ReadabilityOptions = {}): ReadabilityMetrics {
    const stats = this.calculateStatistics(text);
    
    const fleschReadingEase = this.fleschReadingEase(stats);
    const fleschKincaidGrade = this.fleschKincaidGrade(stats);
    const gunningFog = this.gunningFog(stats);
    const smogIndex = this.smogIndex(stats);
    const colemanLiauIndex = this.colemanLiauIndex(stats);
    const automatedReadabilityIndex = this.automatedReadabilityIndex(stats);
    const daleChallScore = this.daleChallScore(text, stats);
    const linsearWriteFormula = this.linsearWriteFormula(text, stats);
    
    const overallScore = this.calculateOverallScore({
      fleschReadingEase,
      fleschKincaidGrade,
      gunningFog,
      smogIndex,
    });
    
    const gradeLevel = this.getGradeLevel(fleschKincaidGrade);
    const audience = this.getAudience(fleschReadingEase);
    const recommendations = this.generateRecommendations(
      { fleschReadingEase, gunningFog, smogIndex },
      stats,
      options
    );
    
    return {
      fleschReadingEase,
      fleschKincaidGrade,
      gunningFog,
      smogIndex,
      colemanLiauIndex,
      automatedReadabilityIndex,
      daleChallScore,
      linsearWriteFormula,
      statistics: stats,
      overallScore,
      gradeLevel,
      audience,
      recommendations,
    };
  }
  
  /**
   * Calculate basic text statistics
   */
  private calculateStatistics(text: string): ReadabilityMetrics['statistics'] {
    const words = this.getWords(text);
    const sentences = this.getSentences(text);
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
    
    const wordCount = words.length;
    const sentenceCount = Math.max(sentences.length, 1);
    const syllableCount = words.reduce((sum, word) => sum + this.countSyllables(word), 0);
    const complexWordCount = words.filter(word => this.countSyllables(word) >= 3).length;
    const characterCount = words.join('').length;
    
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    const vocabularyDiversity = wordCount > 0 ? uniqueWords.size / wordCount : 0;
    
    return {
      wordCount,
      sentenceCount,
      syllableCount,
      complexWordCount,
      characterCount,
      paragraphCount: paragraphs.length,
      averageWordsPerSentence: wordCount / sentenceCount,
      averageSyllablesPerWord: wordCount > 0 ? syllableCount / wordCount : 0,
      averageCharactersPerWord: wordCount > 0 ? characterCount / wordCount : 0,
      vocabularyDiversity,
    };
  }
  
  /**
   * Flesch Reading Ease
   * 60-70 = Perfect for travel content
   * Higher = easier to read
   */
  private fleschReadingEase(stats: ReadabilityMetrics['statistics']): number {
    const { wordCount, sentenceCount, syllableCount } = stats;
    if (wordCount === 0 || sentenceCount === 0) return 0;
    
    const score = 206.835 
      - 1.015 * (wordCount / sentenceCount)
      - 84.6 * (syllableCount / wordCount);
    
    return Math.max(0, Math.min(100, Math.round(score * 10) / 10));
  }
  
  /**
   * Flesch-Kincaid Grade Level
   * Returns US grade level needed to understand text
   */
  private fleschKincaidGrade(stats: ReadabilityMetrics['statistics']): number {
    const { wordCount, sentenceCount, syllableCount } = stats;
    if (wordCount === 0 || sentenceCount === 0) return 0;
    
    const grade = 0.39 * (wordCount / sentenceCount)
      + 11.8 * (syllableCount / wordCount)
      - 15.59;
    
    return Math.max(0, Math.round(grade * 10) / 10);
  }
  
  /**
   * Gunning Fog Index
   * Estimates years of education needed
   */
  private gunningFog(stats: ReadabilityMetrics['statistics']): number {
    const { wordCount, sentenceCount, complexWordCount } = stats;
    if (wordCount === 0 || sentenceCount === 0) return 0;
    
    const fog = 0.4 * (
      (wordCount / sentenceCount) + 
      100 * (complexWordCount / wordCount)
    );
    
    return Math.round(fog * 10) / 10;
  }
  
  /**
   * SMOG Index
   * Simple Measure of Gobbledygook
   */
  private smogIndex(stats: ReadabilityMetrics['statistics']): number {
    const { sentenceCount, complexWordCount } = stats;
    if (sentenceCount === 0) return 0;
    
    const smog = 1.043 * Math.sqrt(complexWordCount * (30 / sentenceCount)) + 3.1291;
    
    return Math.round(smog * 10) / 10;
  }
  
  /**
   * Coleman-Liau Index
   * Based on character counts
   */
  private colemanLiauIndex(stats: ReadabilityMetrics['statistics']): number {
    const { wordCount, sentenceCount, characterCount } = stats;
    if (wordCount === 0) return 0;
    
    const L = (characterCount / wordCount) * 100;
    const S = (sentenceCount / wordCount) * 100;
    const cli = 0.0588 * L - 0.296 * S - 15.8;
    
    return Math.max(0, Math.round(cli * 10) / 10);
  }
  
  /**
   * Automated Readability Index (ARI)
   */
  private automatedReadabilityIndex(stats: ReadabilityMetrics['statistics']): number {
    const { wordCount, sentenceCount, characterCount } = stats;
    if (wordCount === 0 || sentenceCount === 0) return 0;
    
    const ari = 4.71 * (characterCount / wordCount)
      + 0.5 * (wordCount / sentenceCount)
      - 21.43;
    
    return Math.max(0, Math.round(ari * 10) / 10);
  }
  
  /**
   * Dale-Chall Readability Score
   * Uses list of easy words
   */
  private daleChallScore(text: string, stats: ReadabilityMetrics['statistics']): number {
    const { wordCount, sentenceCount } = stats;
    if (wordCount === 0 || sentenceCount === 0) return 0;
    
    const words = this.getWords(text);
    const difficultWords = words.filter(
      word => !DALE_CHALL_EASY_WORDS.has(word.toLowerCase())
    ).length;
    
    const percentDifficult = (difficultWords / wordCount) * 100;
    let score = 0.1579 * percentDifficult + 0.0496 * (wordCount / sentenceCount);
    
    if (percentDifficult > 5) {
      score += 3.6365;
    }
    
    return Math.round(score * 10) / 10;
  }
  
  /**
   * Linsear Write Formula
   */
  private linsearWriteFormula(text: string, stats: ReadabilityMetrics['statistics']): number {
    const words = this.getWords(text);
    const sampleSize = Math.min(words.length, 100);
    const sample = words.slice(0, sampleSize);
    
    let easyWords = 0;
    let hardWords = 0;
    
    for (const word of sample) {
      if (this.countSyllables(word) < 3) {
        easyWords += 1;
      } else {
        hardWords += 3;
      }
    }
    
    const sampleSentences = Math.max(
      text.split(/[.!?]+/).slice(0, 10).filter(s => s.trim()).length,
      1
    );
    
    let rawScore = (easyWords + hardWords) / sampleSentences;
    
    if (rawScore > 20) {
      rawScore = rawScore / 2;
    } else {
      rawScore = (rawScore - 2) / 2;
    }
    
    return Math.max(0, Math.round(rawScore * 10) / 10);
  }
  
  /**
   * Calculate overall readability score (0-100)
   */
  private calculateOverallScore(metrics: {
    fleschReadingEase: number;
    fleschKincaidGrade: number;
    gunningFog: number;
    smogIndex: number;
  }): number {
    const normalizedFlesch = metrics.fleschReadingEase;
    const normalizedGrade = Math.max(0, 100 - (metrics.fleschKincaidGrade * 5));
    const normalizedFog = Math.max(0, 100 - (metrics.gunningFog * 5));
    const normalizedSmog = Math.max(0, 100 - (metrics.smogIndex * 5));
    
    const overall = (normalizedFlesch * 0.4 + normalizedGrade * 0.2 + normalizedFog * 0.2 + normalizedSmog * 0.2);
    
    return Math.round(overall);
  }
  
  /**
   * Get grade level description
   */
  private getGradeLevel(grade: number): string {
    if (grade <= 5) return '5th grade or below';
    if (grade <= 6) return '6th grade';
    if (grade <= 7) return '7th grade';
    if (grade <= 8) return '8th grade';
    if (grade <= 9) return '9th grade';
    if (grade <= 10) return '10th grade';
    if (grade <= 11) return '11th grade';
    if (grade <= 12) return '12th grade';
    if (grade <= 14) return 'College';
    return 'Graduate level';
  }
  
  /**
   * Get target audience based on Flesch score
   */
  private getAudience(fleschScore: number): string {
    if (fleschScore >= 90) return 'Very easy - 5th grader';
    if (fleschScore >= 80) return 'Easy - 6th grader';
    if (fleschScore >= 70) return 'Fairly easy - 7th grader';
    if (fleschScore >= 60) return 'Standard - 8th/9th grader';
    if (fleschScore >= 50) return 'Fairly difficult - High school';
    if (fleschScore >= 30) return 'Difficult - College';
    return 'Very difficult - Graduate';
  }
  
  /**
   * Generate improvement recommendations
   */
  private generateRecommendations(
    metrics: { fleschReadingEase: number; gunningFog: number; smogIndex: number },
    stats: ReadabilityMetrics['statistics'],
    options: ReadabilityOptions
  ): string[] {
    const recommendations: string[] = [];
    const targetFlesch = options.targetAudience === 'travel' ? 65 : 60;
    
    if (metrics.fleschReadingEase < targetFlesch) {
      recommendations.push('Simplify sentences to improve readability');
    }
    
    if (stats.averageWordsPerSentence > 20) {
      recommendations.push(
        `Shorten sentences (current avg: ${stats.averageWordsPerSentence.toFixed(1)} words, target: <20)`
      );
    }
    
    if (stats.averageSyllablesPerWord > 1.6) {
      recommendations.push('Use simpler words with fewer syllables');
    }
    
    if (metrics.gunningFog > 12) {
      recommendations.push('Reduce complex words (3+ syllables) for better accessibility');
    }
    
    if (stats.vocabularyDiversity < 0.4) {
      recommendations.push('Increase vocabulary diversity - vary word choice');
    }
    
    if (stats.paragraphCount < 3 && stats.wordCount > 200) {
      recommendations.push('Break content into more paragraphs for better scannability');
    }
    
    if (options.targetAudience === 'travel' && metrics.fleschReadingEase < 60) {
      recommendations.push('Travel content should target Flesch score 60-70 for broad accessibility');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Content readability is good!');
    }
    
    return recommendations;
  }
  
  /**
   * Extract words from text
   */
  private getWords(text: string): string[] {
    return text
      .replace(/[^\w\s'-]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0 && /[a-zA-Z]/.test(word));
  }
  
  /**
   * Extract sentences from text
   */
  private getSentences(text: string): string[] {
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }
  
  /**
   * Count syllables in a word
   */
  private countSyllables(word: string): number {
    word = word.toLowerCase().trim();
    if (word.length <= 3) return 1;
    
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }
  
  /**
   * Quick check if content is suitable for travel audience
   */
  isSuitableForTravel(text: string): { suitable: boolean; score: number; reason: string } {
    const metrics = this.analyze(text, { targetAudience: 'travel' });
    
    const suitable = metrics.fleschReadingEase >= 55 && metrics.fleschReadingEase <= 75;
    
    let reason: string;
    if (metrics.fleschReadingEase < 55) {
      reason = 'Content is too complex for general travel audience';
    } else if (metrics.fleschReadingEase > 75) {
      reason = 'Content may be too simple, could add more detail';
    } else {
      reason = 'Perfect readability level for travel content';
    }
    
    return {
      suitable,
      score: metrics.fleschReadingEase,
      reason,
    };
  }
}

export const readabilityAnalyzer = new ReadabilityAnalyzer();

export function analyzeReadability(text: string, options?: ReadabilityOptions): ReadabilityMetrics {
  return readabilityAnalyzer.analyze(text, options);
}

export function checkTravelReadability(text: string): { suitable: boolean; score: number; reason: string } {
  return readabilityAnalyzer.isSuitableForTravel(text);
}
