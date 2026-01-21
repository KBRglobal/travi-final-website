#!/usr/bin/env npx tsx
import fs from 'fs';
import path from 'path';

const LOCALES_DIR = path.join(process.cwd(), 'client/src/locales');
const REFERENCE_LOCALE = 'en';
const TARGET_LOCALES = ['ar']; // Add more locales to check as needed

interface TranslationKeys {
  [key: string]: string | TranslationKeys;
}

function flattenKeys(obj: TranslationKeys, prefix = ''): string[] {
  const keys: string[] = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys.push(...flattenKeys(obj[key] as TranslationKeys, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function loadTranslations(locale: string): TranslationKeys {
  const filePath = path.join(LOCALES_DIR, locale, 'common.json');
  if (!fs.existsSync(filePath)) {
    console.error(`[ERROR] Locale file not found: ${filePath}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function checkParity() {
  console.log('='.repeat(60));
  console.log('TRANSLATION PARITY CHECK');
  console.log('='.repeat(60));
  console.log(`Reference locale: ${REFERENCE_LOCALE}`);
  console.log(`Target locales: ${TARGET_LOCALES.join(', ')}`);
  console.log('');

  const referenceData = loadTranslations(REFERENCE_LOCALE);
  const referenceKeys = flattenKeys(referenceData);
  console.log(`Reference (${REFERENCE_LOCALE}) has ${referenceKeys.length} keys`);
  console.log('');

  let totalMissing = 0;
  const missingByLocale: Record<string, string[]> = {};

  for (const locale of TARGET_LOCALES) {
    const targetData = loadTranslations(locale);
    const targetKeys = flattenKeys(targetData);
    
    const missingInTarget = referenceKeys.filter(k => !targetKeys.includes(k));
    const extraInTarget = targetKeys.filter(k => !referenceKeys.includes(k));
    
    missingByLocale[locale] = missingInTarget;
    totalMissing += missingInTarget.length;

    console.log(`--- ${locale.toUpperCase()} ---`);
    console.log(`Keys in ${locale}: ${targetKeys.length}`);
    console.log(`Missing from ${locale}: ${missingInTarget.length}`);
    console.log(`Extra in ${locale} (not in ${REFERENCE_LOCALE}): ${extraInTarget.length}`);
    
    if (missingInTarget.length > 0) {
      console.log('');
      console.log(`Missing keys in ${locale}:`);
      missingInTarget.forEach(key => console.log(`  - ${key}`));
    }
    
    if (extraInTarget.length > 0) {
      console.log('');
      console.log(`Extra keys in ${locale} (may be orphaned):`);
      extraInTarget.slice(0, 10).forEach(key => console.log(`  - ${key}`));
      if (extraInTarget.length > 10) {
        console.log(`  ... and ${extraInTarget.length - 10} more`);
      }
    }
    console.log('');
  }

  console.log('='.repeat(60));
  if (totalMissing > 0) {
    console.log(`[FAIL] ${totalMissing} missing translations found`);
    console.log('');
    console.log('To fix, add the missing keys to each locale file.');
    console.log('Use [NEEDS_TRANSLATION] prefix for placeholder values.');
    process.exit(1);
  } else {
    console.log('[PASS] All locales have matching keys');
    process.exit(0);
  }
}

// Generate stub values for missing keys
function generateStubs() {
  const referenceData = loadTranslations(REFERENCE_LOCALE);
  const referenceKeys = flattenKeys(referenceData);
  
  for (const locale of TARGET_LOCALES) {
    const targetData = loadTranslations(locale);
    const targetKeys = flattenKeys(targetData);
    const missingKeys = referenceKeys.filter(k => !targetKeys.includes(k));
    
    if (missingKeys.length === 0) continue;
    
    console.log(`\nGenerating stubs for ${locale} (${missingKeys.length} keys):`);
    console.log('Add these to your locale file:\n');
    
    // Group by top-level namespace
    const grouped: Record<string, string[]> = {};
    for (const key of missingKeys) {
      const [namespace] = key.split('.');
      if (!grouped[namespace]) grouped[namespace] = [];
      grouped[namespace].push(key);
    }
    
    for (const [namespace, keys] of Object.entries(grouped)) {
      console.log(`// ${namespace} namespace (${keys.length} keys)`);
      for (const key of keys) {
        console.log(`"${key}": "[NEEDS_TRANSLATION]",`);
      }
      console.log('');
    }
  }
}

const args = process.argv.slice(2);
if (args.includes('--generate-stubs')) {
  generateStubs();
} else {
  checkParity();
}
