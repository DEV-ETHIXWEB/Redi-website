// scripts/a11y-audit.mjs
//
// Automated WCAG 2.1 Level AA accessibility audit.
//
// Loads every route in a real Chromium browser (via Playwright) and runs the
// axe-core rules engine against it, at both a desktop and a mobile viewport,
// with reduced motion emulated. Writes a full JSON report and prints a summary
// grouped by rule.
//
// Usage:
//   node scripts/a11y-audit.mjs            # scan every route
//   node scripts/a11y-audit.mjs /contact   # scan a single route while iterating

import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', '.a11y');

const BASE_URL = process.env.A11Y_BASE_URL || 'http://localhost:4321';

// Full Level A and AA ruleset — the exact scope referenced in the large
// majority of ADA website claims.
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

// Two viewports: some elements (mobile nav, bottom bars) only exist at narrow
// widths and are never seen by a desktop-only scan.
const VIEWPORTS = [
  { name: 'desktop', width: 1366, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

// Every URL path on the site. Pages built from a shared template still get
// scanned individually.
//
// Blog slugs are read from the seed file rather than hardcoded — a fixed
// list here silently drifts out of sync whenever posts are added or removed
// (this previously happened: it kept listing 8 placeholder posts for a
// while after they were deleted from blog-posts.json, so this script was
// unknowingly auditing 404 pages instead of real content).
const BLOG_POSTS_PATH = join(__dirname, '..', 'src', 'content', 'seed', 'blog-posts.json');
const BLOG_SLUGS = JSON.parse(readFileSync(BLOG_POSTS_PATH, 'utf-8')).map((post) => post.slug);

const ROUTES = [
  '/',
  '/about',
  '/approach',
  '/sites',
  '/contact',
  '/register',
  '/sign-in',
  '/forgot-password',
  '/set-password',
  '/legal',
  '/updates',
  ...BLOG_SLUGS.map((s) => `/updates/${s}`),
  '/404',
];

// Allow scanning a single route: node scripts/a11y-audit.mjs /contact
const argRoutes = process.argv.slice(2).filter((a) => a.startsWith('/'));
const routesToScan = argRoutes.length > 0 ? argRoutes : ROUTES;

async function settle(page) {
  // Wait for the network to go idle, then give animation libraries and
  // lazy-loaded sections a short pause before running the scan.
  try {
    await page.waitForLoadState('networkidle', { timeout: 15000 });
  } catch {
    // Some pages keep long-lived connections open; fall back to a fixed wait.
  }
  await page.waitForTimeout(500);
}

async function run() {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();

  const results = []; // { route, viewport, violations: [...] }
  let totalViolations = 0;

  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      reducedMotion: 'reduce',
    });

    for (const route of routesToScan) {
      const page = await context.newPage();
      const url = `${BASE_URL}${route}`;
      let violations = [];
      let error = null;
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await settle(page);

        const axe = new AxeBuilder({ page })
          .withTags(WCAG_TAGS)
          // Exclude third-party frames we cannot control (e.g. reCAPTCHA).
          .exclude('iframe[src*="recaptcha"]')
          .exclude('iframe[title*="reCAPTCHA"]');

        const axeResults = await axe.analyze();
        violations = axeResults.violations;
      } catch (e) {
        error = e.message;
      }
      await page.close();

      const count = violations.reduce((n, v) => n + v.nodes.length, 0);
      totalViolations += count;
      results.push({ route, viewport: viewport.name, error, violations });

      const status = error
        ? `ERROR ${error}`
        : count === 0
          ? 'clean'
          : `${count} violation node(s)`;
      console.log(`[${viewport.name}] ${route.padEnd(48)} ${status}`);
    }

    await context.close();
  }

  await browser.close();

  // --- Summary grouped by rule -------------------------------------------
  const byRule = new Map(); // ruleId -> { impact, help, count, pages:Set }
  for (const r of results) {
    for (const v of r.violations) {
      const entry = byRule.get(v.id) || {
        impact: v.impact,
        help: v.help,
        helpUrl: v.helpUrl,
        count: 0,
        pages: new Set(),
      };
      entry.count += v.nodes.length;
      entry.pages.add(`${r.route} (${r.viewport})`);
      byRule.set(v.id, entry);
    }
  }

  const summary = [...byRule.entries()]
    .map(([id, e]) => ({
      id,
      impact: e.impact,
      help: e.help,
      helpUrl: e.helpUrl,
      count: e.count,
      pages: [...e.pages].sort(),
    }))
    .sort((a, b) => b.count - a.count);

  const failingPages = results.filter((r) => r.error || r.violations.length > 0).length;

  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY — grouped by rule');
  console.log('='.repeat(70));
  if (summary.length === 0) {
    console.log('Zero violations. 🎉');
  } else {
    for (const s of summary) {
      console.log(
        `${String(s.count).padStart(4)}  [${(s.impact || '?').padEnd(8)}] ${s.id} — ${s.help}`,
      );
    }
  }
  console.log('-'.repeat(70));
  console.log(
    `Total violation nodes: ${totalViolations} across ${failingPages} page/viewport scans`,
  );
  console.log(`Scans run: ${results.length}  |  Routes: ${routesToScan.length}`);

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    tags: WCAG_TAGS,
    viewports: VIEWPORTS.map((v) => v.name),
    totalViolationNodes: totalViolations,
    failingScans: failingPages,
    summary,
    results: results.map((r) => ({
      route: r.route,
      viewport: r.viewport,
      error: r.error,
      violations: r.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        helpUrl: v.helpUrl,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          html: n.html,
          failureSummary: n.failureSummary,
        })),
      })),
    })),
  };

  const outFile = join(OUT_DIR, 'report.json');
  writeFileSync(outFile, JSON.stringify(report, null, 2));
  console.log(`\nFull report written to ${outFile}`);

  process.exit(totalViolations > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(2);
});
