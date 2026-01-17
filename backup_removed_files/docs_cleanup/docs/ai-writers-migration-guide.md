# AI Writers System - Migration and Usage Guide

## Overview

The AI Writers Virtual Newsroom system replaces the legacy `DEFAULT_CONTENT_RULES` with a writer-based content generation approach. Each AI writer has a unique personality, expertise, writing style, and voice that ensures consistent, high-quality content with distinct characteristics.

## Key Benefits

- **Voice Consistency**: Each writer has a unique voice that's maintained across all content
- **Auto-Assignment**: System automatically selects the best writer for your content type and topic
- **Quality Scoring**: Voice consistency is scored (0-100) for every generated piece
- **Better Variety**: 10 different writers with distinct personalities and expertise areas
- **Backward Compatible**: Legacy system remains available if needed

## Architecture

```
┌─────────────────────────────────────────────────────┐
│         Content Generation Request                   │
│  (type, topic, keywords, writerId optional)         │
└────────────────┬────────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────────┐
│       AI Writers Content Generator                   │
│     server/ai/writers/content-generator.ts          │
└────────────────┬────────────────────────────────────┘
                 │
                 ├─> Writer Assignment System
                 │   (if writerId not provided)
                 │
                 ├─> Writer Engine
                 │   (generates content with writer's voice)
                 │
                 └─> Voice Validator
                     (scores consistency 0-100)
                     │
                     v
┌─────────────────────────────────────────────────────┐
│              Generated Content                       │
│  + writerId, writerName, writerVoiceScore           │
└─────────────────────────────────────────────────────┘
```

## Database Schema Changes

### Contents Table - New Fields

```sql
ALTER TABLE contents
ADD COLUMN writer_id VARCHAR,
ADD COLUMN generated_by_ai BOOLEAN DEFAULT FALSE,
ADD COLUMN writer_voice_score INTEGER;

CREATE INDEX IDX_contents_writer ON contents(writer_id);
```

- **writer_id**: References the AI writer who generated the content
- **generated_by_ai**: Boolean flag indicating AI-generated content
- **writer_voice_score**: Score (0-100) indicating voice consistency

## API Usage

### 1. Generate Content (Auto-Assign Writer)

The system automatically selects the best writer based on content type and topic:

```typescript
POST /api/ai/generate

{
  "type": "hotel",
  "topic": "Burj Al Arab Dubai",
  "keywords": ["luxury", "7-star", "beachfront"],
  "locale": "en",
  "length": "medium"
}

Response:
{
  "title": "Burj Al Arab: Dubai's Iconic 7-Star Luxury Hotel",
  "body": "...",
  "intro": "...",
  "metaDescription": "...",
  "writerId": "james-mitchell",
  "writerName": "James Mitchell",
  "generatedByAI": true,
  "writerVoiceScore": 87,
  "_system": "ai-writers"
}
```

### 2. Generate with Specific Writer

Specify a writer ID to use a particular writer's voice:

```typescript
POST /api/ai/generate

{
  "type": "hotel",
  "topic": "Burj Al Arab Dubai",
  "writerId": "james-mitchell",  // British luxury expert
  "keywords": ["luxury", "7-star", "beachfront"]
}
```

### 3. Legacy System (Deprecated)

To explicitly use the old system (not recommended):

```typescript
POST /api/ai/generate

{
  "type": "hotel",
  "topic": "Burj Al Arab Dubai",
  "useWriters": false  // Opt-out of new system
}

Response includes:
{
  "_system": "legacy",
  "_deprecated": true,
  "_message": "This endpoint uses the deprecated content generation system..."
}
```

### 4. Writer-Specific Generation

Direct writer-specific endpoint (from PR #27):

```typescript
POST /api/writers/james-mitchell/generate

{
  "contentType": "hotel",
  "topic": "Atlantis The Palm",
  "keywords": ["luxury", "waterpark", "family"]
}
```

## Available Writers

| Writer ID | Name | Expertise | Best For |
|-----------|------|-----------|----------|
| james-mitchell | James Mitchell | Luxury Hotels | Hotel, Resort content |
| sofia-reyes | Sofia Reyes | Nightlife | Events, Entertainment |
| alexander-volkov | Alexander Volkov | Fine Dining | Restaurant, Dining content |
| priya-sharma | Priya Sharma | Family Travel | Family-friendly attractions |
| omar-al-rashid | Omar Al-Rashid | Culture & Heritage | Cultural content, Districts |
| elena-costa | Elena Costa | Wellness & Spa | Spa, Wellness content |
| david-chen | David Chen | Business & Real Estate | Business districts, Off-plan |
| layla-hassan | Layla Hassan | Adventure | Desert, Adventure activities |
| marcus-weber | Marcus Weber | Luxury Shopping | Shopping, Malls |
| aisha-patel | Aisha Patel | Street Food | Local dining, Street food |

## Migration Guide

### From Legacy System

**Before (Legacy):**
```typescript
import { generateContent } from './server/ai-generator';

const content = await generateContent({
  type: 'hotel',
  topic: 'Burj Al Arab',
  keywords: ['luxury'],
  tone: 'informative'
});
```

**After (AI Writers):**
```typescript
import { aiWritersContentGenerator } from './server/ai/writers/content-generator';

const content = await aiWritersContentGenerator.generate({
  contentType: 'hotel',
  topic: 'Burj Al Arab',
  keywords: ['luxury'],
  // writerId optional - auto-assigns if not provided
});

// Content now includes:
// - writerId: 'james-mitchell'
// - writerName: 'James Mitchell'
// - writerVoiceScore: 87
// - generatedByAI: true
```

### Gradual Migration

1. **Phase 1**: New content uses AI Writers automatically (default behavior)
2. **Phase 2**: Update custom integrations to explicitly use AI Writers
3. **Phase 3**: Deprecate and remove `useWriters=false` option

## Code Examples

### Programmatic Usage

```typescript
import { aiWritersContentGenerator } from './server/ai/writers/content-generator';

// Example 1: Auto-assign writer
const result = await aiWritersContentGenerator.generate({
  contentType: 'dining',
  topic: 'At.mosphere Restaurant Burj Khalifa',
  keywords: ['fine dining', 'views', 'luxury'],
  locale: 'en'
});

// Example 2: Specific writer
const result2 = await aiWritersContentGenerator.generate({
  contentType: 'dining',
  topic: 'At.mosphere Restaurant Burj Khalifa',
  writerId: 'alexander-volkov', // Fine dining expert
  keywords: ['fine dining', 'views']
});

// Example 3: Get writer recommendation
const recommendation = await aiWritersContentGenerator.recommendWriter(
  'dining',
  'Traditional Emirati Restaurant',
  ['authentic', 'local', 'heritage']
);
// Returns: { writer: { id: 'omar-al-rashid', ... }, score: 95, reason: '...' }

// Example 4: Generate titles only
const titles = await aiWritersContentGenerator.generateTitles(
  'james-mitchell',
  'Atlantis The Palm',
  5  // number of title options
);
```

### Frontend Integration

The WriterSelector component is already integrated in the content editor:

```typescript
// In client/src/pages/content-editor.tsx
import { WriterSelector } from "@/components/writers/WriterSelector";

// Component usage
<WriterSelector
  onSelect={(writerId) => setSelectedWriterId(writerId)}
  contentType={formData.type}
  topic={formData.title}
  showRecommended={true}
/>
```

## Voice Consistency Scoring

The system automatically scores how well generated content matches the writer's voice:

- **90-100**: Excellent - Perfect match with writer's style
- **80-89**: Very Good - Strong alignment with writer's voice
- **70-79**: Good - Acceptable consistency
- **60-69**: Fair - Some inconsistencies
- **Below 60**: Poor - May need regeneration

## Best Practices

1. **Let the System Choose**: Don't specify writerId unless you have a specific reason
2. **Check Voice Scores**: Content with scores below 70 may benefit from regeneration
3. **Match Content Types**: Each writer is optimized for specific content types
4. **Use Writer Expertise**: Check writer profiles to understand their strengths
5. **Provide Context**: More keywords and context = better writer assignment

## Troubleshooting

### Low Voice Scores

If you consistently get low voice scores:
1. Check that writerId matches the content type
2. Provide more specific keywords
3. Use auto-assignment instead of manual selection
4. Try regenerating with a different writer

### Legacy Fallback

The system automatically falls back to legacy if:
1. AI Writers generation fails
2. `useWriters: false` is explicitly set
3. Writer not found

### Environment Variables

Ensure `OPENAI_API_KEY` is set for:
- Content generation
- Voice consistency validation
- Title generation

## Performance

- **Content Generation**: ~3-5 seconds (depends on length)
- **Voice Validation**: ~1-2 seconds
- **Writer Assignment**: <100ms
- **Caching**: Writer profiles are cached in memory

## Future Enhancements

- [ ] A/B testing with different writers
- [ ] Writer performance analytics
- [ ] Custom writer creation
- [ ] Multi-writer collaboration
- [ ] Voice tuning interface
- [ ] Reader feedback integration

## Support

For issues or questions:
- Check the implementation in `server/ai/writers/`
- Review writer profiles in `writer-registry.ts`
- Test with different writers to find best match
- Monitor voice consistency scores

---

**Note**: The legacy `DEFAULT_CONTENT_RULES` system is deprecated and will be removed in a future version. All new development should use the AI Writers system.
