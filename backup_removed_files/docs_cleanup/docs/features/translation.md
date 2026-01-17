# 🌐 Translation & Multi-Language

> Multi-language content management

---

## 📋 Supported Languages

### 17 Languages

| Code | Language | Service |
|------|----------|---------|
| `en` | English | Base |
| `ar` | العربية | DeepL |
| `zh` | 中文 | DeepL |
| `ru` | Русский | DeepL |
| `fr` | Français | DeepL |
| `de` | Deutsch | DeepL |
| `es` | Español | DeepL |
| `tr` | Türkçe | DeepL |
| `it` | Italiano | DeepL |
| `ja` | 日本語 | DeepL |
| `ko` | 한국어 | DeepL |
| `hi` | हिंदी | Claude |
| `ur` | اردو | Claude |
| `bn` | বাংলা | Claude |
| `fa` | فارسی | Claude |
| `fil` | Filipino | Claude |
| `he` | עברית | Claude |

---

## 🔄 Translation Flow

```
English Content
      │
      ▼
Request Translation
      │
      ▼
┌─────┴─────┐
│           │
▼           ▼
DeepL     Claude
(11 lang)  (6 lang)
│           │
└─────┬─────┘
      │
      ▼
Saved Translation
      │
      ▼
Available on Site
```

---

## 🔌 How to Use

### Translate Single

1. Open content
2. Click **Translate**
3. Select language
4. Wait for completion
5. Review translation

### Translate All

1. Open content
2. Click **Translate All**
3. All languages processed
4. Review each translation

### Manual Override

1. Open translation
2. Edit text
3. Save (marked as manual)

---

## 📊 Translation Coverage

### Dashboard

View translation coverage:
- Total content
- Translated per language
- Missing translations
- Progress percentage

### API

```bash
GET /api/translations/coverage
```

---

## 🎯 Best Practices

### Content Preparation

- Write clear English source
- Avoid idioms
- Use simple sentences
- Define technical terms

### Review Process

- Review AI translations
- Check cultural appropriateness
- Verify specialized terms
- Test on native speakers

### Priority Languages

Focus on high-traffic languages:
1. Arabic (UAE market)
2. Russian (tourism)
3. Chinese (tourism)
4. Hindi (diaspora)

---

## 🔧 Translation Settings

### Auto-Translate

Enable auto-translation for new content:
- On publish
- On status change
- Scheduled batch

### Quality Settings

| Setting | Description |
|---------|-------------|
| Preserve formatting | Keep HTML structure |
| Keep links | Maintain internal links |
| Translate alt text | Image descriptions |

---

## 📱 Public Site

### URL Structure

```
/article-slug          # English (default)
/ar/article-slug       # Arabic
/he/article-slug       # Hebrew
```

### Language Switcher

- Automatic detection
- User preference
- URL-based switching

---

## 💰 Cost Management

### Track Usage

```bash
GET /api/translations/usage
```

### Optimize

- Prioritize important content
- Batch translations
- Use Claude for unsupported
- Monitor quotas

---

## 📚 Related

- [DeepL Integration](../integrations/deepl.md)
- [Translation API](../api/endpoints/translations.md)
