/**
 * QA Check Script - Run with: npx tsx scripts/qa-check.ts
 */

// Load environment variables
import * as fs from 'fs';
import * as path from 'path';

// Load .env manually
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=');
      if (key && value) {
        process.env[key] = value;
      }
    }
  }
}

import { runQACheck, generateCostReport, OPTIMIZATION_PROFILES } from '../server/octopus/engine-optimizer';
import { getSupportedLanguages } from '../server/octopus/localizer';

console.log('\n' + '='.repeat(60));
console.log('   🐙 OCTOPUS ENGINE - QA STATUS');
console.log('='.repeat(60) + '\n');

const qa = runQACheck();

console.log('📡 API CONNECTIONS:');
console.log('-'.repeat(40));
for (const api of qa.apiConnections) {
  const icon = api.configured ? '✅' : '❌';
  console.log(`  ${icon} ${api.name}`);
  if (!api.configured) {
    console.log(`     └─ Set: ${api.envVar}`);
  }
}

console.log('\n🤖 AI PROVIDERS:');
console.log('-'.repeat(40));
for (const provider of qa.aiProviders) {
  const icon = provider.available ? '✅' : '❌';
  console.log(`  ${icon} ${provider.name}`);
  if (provider.available) {
    console.log(`     └─ Models: ${provider.models.join(', ')}`);
  }
}

console.log('\n🐙 OCTOPUS MODULES:');
console.log('-'.repeat(40));
for (const mod of qa.octopusModules) {
  const icon = mod.status === 'ready' ? '✅' : '⚠️';
  console.log(`  ${icon} ${mod.name}`);
  if (mod.dependency) {
    console.log(`     └─ Needs: ${mod.dependency}`);
  }
}

console.log('\n🌍 LOCALIZATION:');
console.log('-'.repeat(40));
const languages = getSupportedLanguages();
console.log(`  ${languages.length} languages supported`);
console.log(`  RTL: ${languages.filter(l => l.direction === 'rtl').map(l => l.code).join(', ')}`);

console.log('\n⚡ ENGINE OPTIMIZATION PROFILES:');
console.log('-'.repeat(40));
for (const [name, profile] of Object.entries(OPTIMIZATION_PROFILES)) {
  console.log(`  • ${name}: ${profile.description}`);
}

console.log('\n' + '='.repeat(60));
console.log(`   STATUS: ${qa.overallStatus.toUpperCase()}`);
console.log('='.repeat(60));

if (qa.recommendations.length > 0) {
  console.log('\n💡 RECOMMENDATIONS:');
  for (const rec of qa.recommendations) {
    console.log(`  • ${rec}`);
  }
}

console.log('\n');
