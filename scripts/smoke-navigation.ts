#!/usr/bin/env npx tsx
/**
 * Smoke Test: Navigation URLs
 *
 * Verifies all navigation entry points resolve correctly (200 or 3xx, not 404).
 *
 * Usage: npx tsx scripts/smoke-navigation.ts [base-url]
 *        Default base-url: http://localhost:5000
 *
 * Exit codes:
 *   0 - All navigation URLs resolve correctly
 *   1 - One or more navigation URLs return 404
 */

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

// All navigation URLs that should NOT return 404
const NAVIGATION_URLS = [
  // Header navigation (canonical)
  '/attractions',
  '/hotels',
  '/dining',       // canonical for "Restaurants"
  '/districts',
  '/shopping',
  '/news',         // canonical for news/articles

  // Footer navigation
  '/destinations',
  '/about',
  '/contact',
  '/terms',
  '/privacy',
  '/cookies',
  '/security',

  // Navigation aliases (should redirect, not 404)
  '/restaurants',    // → /dining
  '/things-to-do',   // → /attractions
  '/travel-guides',  // → /news
  '/guides',         // → /news
  '/articles',       // exists as separate page

  // Homepage
  '/',

  // Real estate (highlighted link)
  '/dubai-off-plan-properties',

  // Search
  '/search',
];

interface TestResult {
  url: string;
  status: number;
  ok: boolean;
  redirectedTo?: string;
  error?: string;
}

async function checkUrl(baseUrl: string, path: string): Promise<TestResult> {
  const url = `${baseUrl}${path}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'Accept': 'text/html',
        'User-Agent': 'smoke-navigation-test',
      },
    });

    const finalUrl = response.url;
    const redirectedTo = finalUrl !== url ? new URL(finalUrl).pathname : undefined;

    return {
      url: path,
      status: response.status,
      ok: response.status >= 200 && response.status < 400,
      redirectedTo,
    };
  } catch (error) {
    return {
      url: path,
      status: 0,
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function log(message: string, color: string = RESET): void {
  console.log(`${color}${message}${RESET}`);
}

async function runTests(): Promise<void> {
  const baseUrl = process.argv[2] || 'http://localhost:5000';

  log('\n═══════════════════════════════════════════════════════');
  log('  NAVIGATION SMOKE TEST');
  log('═══════════════════════════════════════════════════════');
  log(`\n  Base URL: ${CYAN}${baseUrl}${RESET}\n`);

  let passed = 0;
  let failed = 0;
  let redirected = 0;
  const failures: TestResult[] = [];

  log('  Testing navigation URLs...\n');

  for (const path of NAVIGATION_URLS) {
    const result = await checkUrl(baseUrl, path);

    if (result.ok) {
      if (result.redirectedTo) {
        log(`  ${GREEN}✓${RESET} ${path} ${DIM}→ ${result.redirectedTo} (${result.status})${RESET}`);
        redirected++;
      } else {
        log(`  ${GREEN}✓${RESET} ${path} ${DIM}(${result.status})${RESET}`);
      }
      passed++;
    } else {
      log(`  ${RED}✗${RESET} ${path} ${RED}(${result.status || 'ERR'}: ${result.error || 'Failed'})${RESET}`);
      failed++;
      failures.push(result);
    }
  }

  log('\n───────────────────────────────────────────────────────');
  log('  SUMMARY');
  log('───────────────────────────────────────────────────────');
  log(`  ${GREEN}Passed:${RESET}     ${passed}`);
  log(`  ${YELLOW}Redirects:${RESET}  ${redirected}`);
  log(`  ${RED}Failed:${RESET}     ${failed}`);
  log(`  ${DIM}Total:${RESET}      ${NAVIGATION_URLS.length}`);

  if (failures.length > 0) {
    log(`\n  ${RED}FAILURES:${RESET}`);
    for (const f of failures) {
      log(`    - ${f.url}: ${f.error || `Status ${f.status}`}`);
    }
  }

  log('\n═══════════════════════════════════════════════════════\n');

  if (failed > 0) {
    log(`${RED}Navigation smoke test FAILED with ${failed} error(s)${RESET}\n`);
    process.exit(1);
  } else {
    log(`${GREEN}Navigation smoke test PASSED${RESET}\n`);
    process.exit(0);
  }
}

runTests().catch((error) => {
  console.error('Smoke test crashed:', error);
  process.exit(1);
});
