#!/usr/bin/env npx tsx
/**
 * Hardcoded String Scanner
 * Scans all client pages/components for user-visible text not wrapped in t()
 * 
 * Detects:
 * - JSX text content
 * - aria-label, alt, title, placeholder attributes with literal strings
 * - Button/Link text
 * 
 * Excludes:
 * - Comments
 * - Console.log/error statements
 * - Test files
 * - Type definitions
 * - className strings
 * - Empty strings and whitespace
 * - Technical strings (URLs, CSS classes, data attributes)
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

interface Finding {
  file: string;
  line: number;
  text: string;
  type: 'jsx-text' | 'aria-label' | 'alt' | 'title' | 'placeholder' | 'label' | 'button-text';
}

// Only scan PUBLIC-FACING pages and components
// Admin pages are internal tools and don't need translation priority
const SCAN_DIRS = [
  'client/src/pages',
  'client/src/components',
];

// Patterns to EXCLUDE from scanning
const EXCLUDE_PATTERNS = [
  /\.test\.(ts|tsx)$/,
  /\.spec\.(ts|tsx)$/,
  /__tests__\//,
  /\.d\.ts$/,
  // Admin pages are internal tools - excluded from localization requirements
  /\/admin\//,
  /\/admin-/,
  /admin-[a-z]+\.tsx$/,
  // Internal CMS/admin tools
  /\/live-edit\//,
  /\/internal\//,
  /\/page-builder\//,
  // Admin-like root pages (CMS tools, not public)
  /\/(settings|analytics|seo-audit|audit-logs|campaigns|clusters)\.tsx$/,
  /\/(content-calendar|content-editor|content-list|content-rules)\.tsx$/,
  /\/(rss-feeds|tags|surveys|survey-builder|ai-article-generator)\.tsx$/,
  /\/(affiliate-links|affiliate-disclosure|homepage-promotions)\.tsx$/,
  /\/(newsletter-subscribers|partners-dashboard|partners-join)\.tsx$/,
  /\/(poi-explorer|external-data|ingestion|scheduling)\.tsx$/,
];

const IGNORED_STRINGS = [
  /^[0-9.,\s\-+*/%$€£¥]+$/,
  /^[a-z\-_]+$/i,
  /^(true|false|null|undefined|NaN)$/,
  /^https?:\/\//,
  /^mailto:/,
  /^tel:/,
  /^\s*$/,
  /^[A-Z_]+$/,
  /^[a-z\-_.]+\.[a-z]+$/i,
  /^#[0-9a-fA-F]{3,8}$/,
  /^(px|em|rem|%|vh|vw|deg|rad)$/,
  /^(flex|grid|block|inline|none|hidden|visible)$/,
  /^(sm|md|lg|xl|2xl|xs)$/,
  /^data-/,
  /^aria-/,
  /^[\s\n\r\t]*$/,
  /^\.{1,3}$/,
  /^[,;:!?.\-'"()\[\]{}]+$/,
];

function shouldIgnoreString(str: string): boolean {
  const trimmed = str.trim();
  if (trimmed.length < 2) return true;
  return IGNORED_STRINGS.some(pattern => pattern.test(trimmed));
}

function shouldExcludeFile(filePath: string): boolean {
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath));
}

function scanFile(filePath: string): Finding[] {
  const findings: Finding[] = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    const lineNumber = lineNum + 1;

    if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
    if (line.includes('console.')) continue;
    if (line.includes('className=')) continue;
    if (line.includes('data-testid=')) continue;
    if (line.includes('import ')) continue;
    if (line.includes('export ')) continue;
    if (line.includes('interface ') || line.includes('type ')) continue;

    const ariaMatch = line.match(/aria-label=["']([^"']+)["']/g);
    if (ariaMatch) {
      for (const match of ariaMatch) {
        const value = match.match(/["']([^"']+)["']/)?.[1];
        if (value && !shouldIgnoreString(value) && !line.includes('t(') && !line.includes('{t(')) {
          findings.push({
            file: filePath,
            line: lineNumber,
            text: value.substring(0, 50),
            type: 'aria-label',
          });
        }
      }
    }

    const altMatch = line.match(/\balt=["']([^"']+)["']/g);
    if (altMatch) {
      for (const match of altMatch) {
        const value = match.match(/["']([^"']+)["']/)?.[1];
        if (value && !shouldIgnoreString(value) && !line.includes('t(') && !line.includes('{t(')) {
          findings.push({
            file: filePath,
            line: lineNumber,
            text: value.substring(0, 50),
            type: 'alt',
          });
        }
      }
    }

    const titleMatch = line.match(/\btitle=["']([^"']+)["']/g);
    if (titleMatch) {
      for (const match of titleMatch) {
        const value = match.match(/["']([^"']+)["']/)?.[1];
        if (value && !shouldIgnoreString(value) && !line.includes('t(') && !line.includes('{t(')) {
          findings.push({
            file: filePath,
            line: lineNumber,
            text: value.substring(0, 50),
            type: 'title',
          });
        }
      }
    }

    const placeholderMatch = line.match(/placeholder=["']([^"']+)["']/g);
    if (placeholderMatch) {
      for (const match of placeholderMatch) {
        const value = match.match(/["']([^"']+)["']/)?.[1];
        if (value && !shouldIgnoreString(value) && !line.includes('t(') && !line.includes('{t(')) {
          findings.push({
            file: filePath,
            line: lineNumber,
            text: value.substring(0, 50),
            type: 'placeholder',
          });
        }
      }
    }

    const jsxTextMatch = line.match(/>\s*([A-Z][a-zA-Z\s]+[a-z])\s*</g);
    if (jsxTextMatch) {
      for (const match of jsxTextMatch) {
        const text = match.replace(/^>\s*/, '').replace(/\s*<$/, '').trim();
        if (text && text.length > 3 && !shouldIgnoreString(text) && !line.includes('{t(') && !line.includes('t(')) {
          if (!/^[A-Z][a-z]*$/.test(text)) {
            findings.push({
              file: filePath,
              line: lineNumber,
              text: text.substring(0, 50),
              type: 'jsx-text',
            });
          }
        }
      }
    }
  }

  return findings;
}

async function main() {
  console.log('='.repeat(60));
  console.log('HARDCODED STRING SCANNER');
  console.log('='.repeat(60));
  console.log('');
  console.log('Scanning for user-visible text not wrapped in t()...');
  console.log('');

  const allFindings: Finding[] = [];

  for (const dir of SCAN_DIRS) {
    const fullDir = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullDir)) {
      console.log(`Skipping ${dir} (not found)`);
      continue;
    }

    const files = await glob(`${fullDir}/**/*.{tsx,ts}`, { nodir: true });
    console.log(`Scanning ${files.length} files in ${dir}...`);

    for (const file of files) {
      if (shouldExcludeFile(file)) continue;
      const findings = scanFile(file);
      allFindings.push(...findings);
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log(`SCAN RESULTS: ${allFindings.length} potential hardcoded strings found`);
  console.log('='.repeat(60));

  if (allFindings.length > 0) {
    const byFile: Record<string, Finding[]> = {};
    for (const finding of allFindings) {
      const relPath = path.relative(process.cwd(), finding.file);
      if (!byFile[relPath]) byFile[relPath] = [];
      byFile[relPath].push(finding);
    }

    for (const [file, findings] of Object.entries(byFile)) {
      console.log(`\n${file}:`);
      for (const f of findings) {
        console.log(`  Line ${f.line} [${f.type}]: "${f.text}"`);
      }
    }

    console.log('');
    console.log('[NOTE] These are potential issues. Review each finding:');
    console.log('  - Replace with t("key") if user-visible');
    console.log('  - Ignore if technical (URLs, CSS, data attributes)');
    console.log('  - Add to translation JSON files');
  } else {
    console.log('\n[PASS] No obvious hardcoded strings found!');
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Scanner error:', err);
  process.exit(1);
});
