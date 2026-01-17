# 🤝 Contributing to TRAVI Documentation

**Guidelines for Documentation Contributors**

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Documentation Principles](#-documentation-principles)
- [How to Contribute](#-how-to-contribute)
- [Style Guide](#-style-guide)
- [Review Process](#-review-process)
- [Tools & Resources](#-tools--resources)

---

## 🌟 Overview

Thank you for your interest in improving TRAVI documentation! Great documentation is crucial for our users' success, and we welcome contributions that make our docs clearer, more accurate, and more helpful.

### Who Can Contribute?

- 👥 **TRAVI Team Members** - Full access to all documentation
- 🤝 **Partners** - Can suggest improvements and report issues
- 📝 **Users** - Can report issues and suggest clarifications

---

## 📚 Documentation Principles

### 1. **User-Centric**
Write for the reader, not for yourself. Consider:
- What does the reader need to know?
- What is their level of expertise?
- What are they trying to accomplish?

### 2. **Clear and Concise**
- Use simple, direct language
- Break complex topics into digestible sections
- Avoid unnecessary jargon
- Define technical terms when first used

### 3. **Accurate and Up-to-Date**
- Verify all technical information
- Test code examples before including them
- Update documentation when features change
- Include version information where relevant

### 4. **Consistent**
- Follow the established structure
- Use consistent terminology
- Maintain uniform formatting
- Apply the style guide consistently

### 5. **Accessible**
- Write for international audiences
- Consider non-native English speakers
- Use inclusive language
- Provide alt text for images
- Ensure screen reader compatibility

---

## ✍️ How to Contribute

### For Internal Team Members

**1. Minor Updates (Typos, Broken Links, Clarifications)**

```bash
# Create a branch
git checkout -b docs/update-description

# Make your changes
# Edit the relevant .md files

# Commit with clear message
git commit -m "docs: fix typo in API authentication section"

# Push and create PR
git push origin docs/update-description
```

**2. Major Updates (New Sections, Restructuring)**

- Discuss with the documentation lead first
- Create a detailed outline
- Get approval before writing
- Follow the review process

### For External Contributors

**Reporting Issues:**
1. Check if issue already exists
2. Provide specific location (file, section)
3. Explain what's unclear or incorrect
4. Suggest improvement if possible

**Suggesting Improvements:**
- Email: docs@travi.com
- Include clear description of suggestion
- Explain why it would be helpful
- Provide examples if possible

---

## 📝 Style Guide

### Markdown Formatting

**Headings:**
```markdown
# H1 - Document Title (one per file)
## H2 - Major Sections
### H3 - Subsections
#### H4 - Minor Subsections (use sparingly)
```

**Lists:**
```markdown
- Unordered lists for non-sequential items
- Use consistent bullet style

1. Ordered lists for sequential steps
2. Always start with 1
3. Even if continuing later
```

**Code Blocks:**
````markdown
```javascript
// Always specify language
const example = "for syntax highlighting";
```
````

**Emphasis:**
```markdown
**Bold** for important terms, UI elements
*Italic* for emphasis (use sparingly)
`Code` for inline code, file names, commands
```

### Language & Tone

**Do:**
- ✅ Use active voice: "Click the button" not "The button should be clicked"
- ✅ Use second person: "You can configure..." not "One can configure..."
- ✅ Be conversational but professional
- ✅ Use contractions naturally: "don't" not "do not"
- ✅ Start with verbs in instructions: "Open the dashboard..."

**Don't:**
- ❌ Use overly casual language
- ❌ Use idioms that don't translate well
- ❌ Assume knowledge: explain acronyms
- ❌ Use future tense: "will allow" → "allows"
- ❌ Use ambiguous terms: "simply", "just", "easily"

### Technical Writing

**Code Examples:**
- Always include complete, working examples
- Add comments to explain complex parts
- Show both request and response for APIs
- Include error handling
- Test all code before publishing

**API Documentation:**
- Specify HTTP method (GET, POST, etc.)
- Show full endpoint URL
- List all parameters (required/optional)
- Provide example request
- Provide example response
- Document error codes

**Screenshots:**
- Use actual application screenshots
- Annotate with arrows/highlights if needed
- Include alt text for accessibility
- Keep file sizes reasonable
- Update when UI changes

### Structure Templates

**New Feature Documentation:**
```markdown
# Feature Name

Brief description (1-2 sentences)

## Overview
What is it and why use it?

## How It Works
Conceptual explanation

## Getting Started
Step-by-step guide

## Advanced Usage
Complex scenarios

## API Reference
Technical details

## Examples
Real-world use cases

## Troubleshooting
Common issues and solutions

## Related Documentation
Links to other relevant docs
```

---

## 🔍 Review Process

### Self-Review Checklist

Before submitting documentation:

**Content:**
- [ ] Information is accurate and tested
- [ ] All links work correctly
- [ ] Code examples run successfully
- [ ] Screenshots are current
- [ ] Version info is included where relevant

**Style:**
- [ ] Follows the style guide
- [ ] Uses consistent terminology
- [ ] Free of typos and grammatical errors
- [ ] Headings form logical hierarchy
- [ ] Lists are formatted correctly

**Structure:**
- [ ] Fits into existing documentation structure
- [ ] Has clear table of contents (if long)
- [ ] Includes navigation links
- [ ] Related docs are cross-linked

**Accessibility:**
- [ ] Plain language used
- [ ] Technical terms defined
- [ ] Alt text for images
- [ ] Code blocks have language specified

### Peer Review

**For Reviewers:**
- Check for accuracy
- Verify completeness
- Test code examples
- Consider user perspective
- Provide constructive feedback
- Approve when ready

**Timeline:**
- Minor updates: 1-2 business days
- Major updates: 3-5 business days
- Urgent fixes: Same day

---

## 🛠️ Tools & Resources

### Recommended Tools

**Markdown Editors:**
- Visual Studio Code (with Markdown extensions)
- Typora
- Mark Text

**VS Code Extensions:**
- Markdown All in One
- Markdown Lint
- Code Spell Checker

**Testing:**
- markdown-link-check (check for broken links)
- markdownlint (style checking)

### Resources

**Markdown:**
- [Markdown Guide](https://www.markdownguide.org/)
- [GitHub Flavored Markdown](https://github.github.com/gfm/)

**Technical Writing:**
- [Google Developer Documentation Style Guide](https://developers.google.com/style)
- [Microsoft Writing Style Guide](https://docs.microsoft.com/en-us/style-guide/)

**Accessibility:**
- [Web Content Accessibility Guidelines (WCAG)](https://www.w3.org/WAI/WCAG21/quickref/)

---

## 📋 Documentation Types

### Product Documentation
Features, capabilities, use cases for Traviapp, Live Edit, Insights, Vendors.

### Technical Documentation
Architecture, APIs, integration guides, security.

### Tutorials & Guides
Step-by-step instructions for specific tasks.

### Reference Documentation
API endpoints, configuration options, exhaustive lists.

### Conceptual Documentation
How things work, design decisions, best practices.

---

## 🎯 Quality Standards

### Documentation Must Be:

**Accurate**
- Technically correct
- Up to date
- Tested and verified

**Complete**
- Covers all aspects of topic
- Includes examples
- Addresses common questions

**Clear**
- Easy to understand
- Well-organized
- Scannable (headings, lists)

**Consistent**
- Follows style guide
- Uses standard terminology
- Matches existing docs

**Helpful**
- Solves user problems
- Provides context
- Includes next steps

---

## 📞 Questions?

**Documentation Team:**
- 📧 Email: docs@travi.com
- 💬 Slack: #documentation (internal)
- 📖 Wiki: Internal documentation standards

**For Urgent Issues:**
- Contact documentation lead directly
- Mark PR as "urgent" if critical fix

---

## 📜 License

By contributing to TRAVI documentation, you agree that your contributions will be licensed under the same terms as the TRAVI platform.

---

<div align="center">

**[← Back to Documentation Hub](README.md)** · **[Changelog →](CHANGELOG.md)**

© 2024 TRAVI. All rights reserved.

</div>
