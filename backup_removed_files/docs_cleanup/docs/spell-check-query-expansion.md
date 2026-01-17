# Spell Check & Query Expansion API

This document describes the spell check and query expansion features added to the search engine.

## Features Implemented

### 1. Spell Checker (`spell-checker.ts`)
- **Levenshtein distance** fuzzy matching algorithm
- **50+ Dubai-specific terms** dictionary (landmarks, hotels, food, activities)
- **15+ common typo mappings** (burk→burj, khalifa→khalifa, etc.)
- **PostgreSQL trigram similarity** support (future integration)
- **Caching** for performance optimization

### 2. Synonyms (`synonyms.ts`)
- **20+ multi-language synonym groups**
- **Weighted query building** for full-text search
- Support for **English, Hebrew, Arabic**
- Context-aware synonym expansion

### 3. Query Processor (`query-processor.ts`)
- **Language detection** and normalization
- **Stop word removal** for cleaner queries
- **Query cleaning** and pattern recognition
- Multi-language support (EN, AR, HE, ZH, RU)

### 4. Query Rewriter (`query-rewriter.ts`)
- **Unified pipeline** combining all modules
- **Pattern handling** ("best X in dubai" → "X", "X near Y" → "X Y")
- **"Did you mean?"** suggestion generation
- **Transformation tracking** with confidence scores

## API Endpoints

### Spell Check
```bash
GET /api/search/spell-check?q=burk khalifa
```

**Response:**
```json
{
  "original": "burk khalifa",
  "corrected": "burj khalifa",
  "wasChanged": true,
  "confidence": 0.95,
  "suggestions": []
}
```

### Synonym Expansion
```bash
GET /api/search/synonyms?term=cheap hotel&locale=en
```

**Response:**
```json
{
  "original": ["cheap", "hotel"],
  "expanded": ["cheap", "hotel", "budget", "affordable", "resort", "accommodation"],
  "language": "en",
  "weights": {
    "cheap": 0.9,
    "hotel": 1.0,
    "budget": 0.9,
    "affordable": 0.9,
    "resort": 1.0,
    "accommodation": 1.0
  }
}
```

### Query Rewrite
```bash
GET /api/search/rewrite?q=best hotell near marina&locale=en
```

**Response:**
```json
{
  "original": "best hotell near marina",
  "rewritten": "hotel marina",
  "expanded": ["hotel", "marina", "resort", "accommodation", "..."],
  "transformations": [
    {
      "type": "pattern",
      "from": "best hotell near marina",
      "to": "hotell near marina",
      "confidence": 1.0
    },
    {
      "type": "spell",
      "from": "hotell",
      "to": "hotel",
      "confidence": 0.95
    }
  ],
  "suggestions": ["hotel marina", "resort marina"],
  "confidence": 0.95,
  "locale": "en"
}
```

## Usage Examples

### Basic Spell Check
```typescript
import { spellChecker } from './server/search';

const result = await spellChecker.check('burk khalifa');
console.log(result.corrected); // "burj khalifa"
```

### Synonym Expansion
```typescript
import { synonymExpander } from './server/search';

const result = synonymExpander.expand(['cheap', 'hotel'], 'en');
console.log(result.expanded); // ["cheap", "hotel", "budget", "affordable", ...]
```

### Query Rewriting
```typescript
import { queryRewriter } from './server/search';

const result = await queryRewriter.rewrite('best hotel in dubai', 'en');
console.log(result.rewritten); // "hotel"
console.log(result.transformations); // [{ type: 'pattern', ... }]
```

## Integration with Existing Search

The new modules are exported from `server/search/index.ts` and can be used by the main search engine to enhance query processing:

```typescript
import { searchEngine, queryRewriter } from './server/search';

// Enhance search with query rewriting
async function enhancedSearch(query: string, locale: string = 'en') {
  // 1. Rewrite query
  const rewritten = await queryRewriter.rewrite(query, locale);
  
  // 2. Search with rewritten query
  const results = await searchEngine.search({
    q: rewritten.rewritten,
    locale,
  });
  
  // 3. Add suggestions to results
  return {
    ...results,
    didYouMean: rewritten.rewritten !== query ? rewritten.rewritten : null,
    suggestions: rewritten.suggestions,
  };
}
```

## Testing

Run the standalone test:
```bash
npx tsx test-spell-check-standalone.ts
```

## Supported Languages

- **English (en)**: Full support
- **Arabic (ar)**: Synonym expansion, stop words
- **Hebrew (he)**: Synonym expansion, stop words
- **Chinese (zh)**: Language detection
- **Russian (ru)**: Language detection

## Dubai-Specific Terms Dictionary

The spell checker includes 50+ Dubai-specific terms:
- **Landmarks**: burj, khalifa, marina, jumeirah, atlantis, palm
- **Hotels**: armani, raffles, shangri, fairmont, hilton, marriott
- **Food**: shawarma, falafel, hummus, mezze
- **Activities**: desert, safari, beach, waterpark, yacht, cruise
- **Shopping**: souk, gold, spice, mall, boutique
- **Transport**: metro, taxi, airport, terminal

## Common Typo Mappings

- burk → burj
- khalifa → khalifa (various spellings)
- hotell → hotel
- resturant → restaurant
- duabi → dubai
- aquaruim → aquarium
- mirena → marina
- jumirah → jumeirah
- dessert → desert (when referring to safari)

## Performance Considerations

- **Caching**: Spell check results are cached for 1 hour
- **Parallel Processing**: Synonym expansion is synchronous and fast
- **Batch Operations**: Support for batch spell checking and rewriting
- **Confidence Scores**: Track transformation confidence for quality control

## Future Enhancements

1. **PostgreSQL Trigram Integration**: Use `pg_trgm` extension for advanced similarity
2. **Machine Learning**: Train on user corrections and search logs
3. **More Languages**: Expand to all 50 supported locales
4. **Contextual Synonyms**: Use embeddings for semantic similarity
5. **User Personalization**: Learn from individual user preferences
