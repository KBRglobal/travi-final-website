# Search Module - Spell Check & Query Expansion

This directory contains the enhanced search functionality with spell checking and query expansion capabilities.

## Overview

The search module provides intelligent query processing with:
- **Spell checking** - Automatic correction of common typos and misspellings
- **Synonym expansion** - Multi-language synonym support for broader search results
- **Query rewriting** - Pattern-based query optimization
- **Language detection** - Automatic language identification and processing

## Modules

### Core Search Engine
- `index.ts` - Main search orchestrator with full-text and semantic search
- `semantic-search.ts` - Vector-based semantic search
- `hybrid-ranker.ts` - Results fusion and ranking
- `intent-classifier.ts` - Query intent classification
- `indexer.ts` - Content indexing
- `embeddings.ts` - Text embedding generation
- `routes.ts` - API endpoints

### Query Enhancement (NEW)
- `spell-checker.ts` - Levenshtein distance spell correction with Dubai-specific terms
- `synonyms.ts` - Multi-language synonym expansion (EN/AR/HE)
- `query-processor.ts` - Query normalization, stop word removal, language detection
- `query-rewriter.ts` - Unified query rewriting pipeline

### Examples & Tests
- `enhanced-search-example.ts` - Integration example showing how to use new features
- `e2e-test.ts` - End-to-end test demonstrating all capabilities

## Quick Start

### Basic Search
```typescript
import { searchEngine } from './search';

const results = await searchEngine.search({
  q: 'hotel dubai',
  limit: 20,
  locale: 'en'
});
```

### Enhanced Search with Spell Check
```typescript
import { enhancedSearch } from './search/enhanced-search-example';

const results = await enhancedSearch('best hotell near merena', {
  locale: 'en',
  limit: 20
});

console.log(results.enhancements.didYouMean); // "hotel marina"
```

### Individual Features

#### Spell Check
```typescript
import { spellChecker } from './search';

const result = await spellChecker.check('burk khalifa');
// { corrected: "burj khalifa", wasChanged: true, confidence: 0.95 }
```

#### Synonym Expansion
```typescript
import { synonymExpander } from './search';

const result = synonymExpander.expand(['cheap', 'hotel'], 'en');
// { expanded: ["cheap", "hotel", "budget", "affordable", ...] }
```

#### Query Rewriting
```typescript
import { queryRewriter } from './search';

const result = await queryRewriter.rewrite('best hotel in dubai', 'en');
// { rewritten: "hotel", transformations: [...] }
```

## API Endpoints

### Spell Check
```bash
GET /api/search/spell-check?q=burk khalifa
```

### Synonym Expansion
```bash
GET /api/search/synonyms?term=cheap hotel&locale=en
```

### Query Rewrite
```bash
GET /api/search/rewrite?q=best hotell near marina&locale=en
```

### Main Search (existing)
```bash
GET /api/search?q=hotel&limit=20&locale=en
```

### Similar Content (existing)
```bash
GET /api/search/similar/:contentId?limit=5
```

## Features

### Spell Checker
- **Levenshtein distance** algorithm for fuzzy matching
- **50+ Dubai-specific terms** (landmarks, hotels, activities)
- **15+ typo mappings** (burk→burj, hotell→hotel, etc.)
- **Smart caching** (1-hour TTL)
- **Confidence scoring** for all corrections

### Synonym Expander
- **20+ synonym groups** covering hotels, dining, activities, transport
- **Multi-language support** (English, Arabic, Hebrew)
- **Weighted queries** for better search relevance
- **Context-aware expansion**

### Query Processor
- **Stop word removal** (EN/AR/HE)
- **Language detection** (EN/AR/HE/ZH/RU)
- **Query normalization**
- **Pattern recognition**

### Query Rewriter
- **8 pattern handlers**:
  - "best X in dubai" → "X"
  - "X near Y" → "X Y"
  - "find X" → "X"
  - And more...
- **Full pipeline** (patterns + spell + synonyms)
- **"Did you mean?"** suggestions
- **Transformation tracking**

## Testing

Run the E2E test to see all features in action:

```bash
npx tsx e2e-test.ts
```

Test individual features:

```bash
# Spell check
curl "http://localhost:5000/api/search/spell-check?q=burk%20khalifa"

# Synonyms
curl "http://localhost:5000/api/search/synonyms?term=cheap%20hotel"

# Rewrite
curl "http://localhost:5000/api/search/rewrite?q=best%20hotel%20in%20dubai"
```

## Performance

- **Spell check**: ~1-2ms (cached), ~10-15ms (uncached)
- **Synonym expansion**: ~1ms (synchronous)
- **Query rewriting**: ~15-20ms (includes spell check)
- **Caching**: 1-hour TTL for spell check results

## Documentation

- **API Documentation**: `../../docs/spell-check-query-expansion.md`
- **Implementation Summary**: `../../IMPLEMENTATION_SUMMARY.md`

## Language Support

- **English (en)**: Full support
- **Arabic (ar)**: Synonyms, stop words
- **Hebrew (he)**: Synonyms, stop words
- **Chinese (zh)**: Language detection
- **Russian (ru)**: Language detection

## Dubai-Specific Features

The spell checker includes extensive Dubai-specific vocabulary:
- Landmarks: burj, khalifa, marina, jumeirah, atlantis
- Hotels: armani, raffles, shangri-la, fairmont
- Food: shawarma, falafel, hummus, mezze
- Activities: desert safari, beach, waterpark, yacht
- Shopping: souk, gold market, spice market, mall
- Transport: metro, taxi, airport, monorail

## Future Enhancements

1. PostgreSQL trigram integration for advanced similarity
2. Machine learning for user correction patterns
3. Expand to all 50 supported locales
4. Contextual synonyms using embeddings
5. User personalization based on search history

## Contributing

When adding new features:
1. Add unit tests
2. Update API documentation
3. Add examples to `enhanced-search-example.ts`
4. Update this README

## License

Part of the Traviapp project.
