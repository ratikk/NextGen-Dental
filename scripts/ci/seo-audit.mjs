#!/usr/bin/env node
/**
 * Post-build SEO audit. Zero dependencies, runs against dist/ after `npm run build`.
 *
 * Written after PR #21, where a title fix was applied by hand, verified by hand, and
 * still shipped a broken homepage title — because the verification read the edit
 * rather than the built output. This script reads the built output.
 *
 * Two tiers:
 *   ERROR   -> exit 1. Things that are clean today and must never regress.
 *   WARN    -> reported, exit 0. Pre-existing debt; promote to ERROR as it clears.
 *
 * Usage: node scripts/ci/seo-audit.mjs [distDir]
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const DIST = process.argv[2] || 'dist';

// Must match `site` in astro.config.mjs. Override for a non-production build with
// SEO_AUDIT_SITE, e.g. SEO_AUDIT_SITE=https://dev.nextgendentalaustintx.com
export const SITE = (process.env.SEO_AUDIT_SITE || 'https://nextgendentalaustintx.com').replace(/\/$/, '');

/** Routes that must be noindex. Everything else must not be. */
const NOINDEX_ROUTES = new Set(['/404']);

const normalizeUrl = (u) => u.replace(/\/+$/, '');

/** The self-referencing canonical a given route must carry. */
export function expectedCanonical(route) {
  return normalizeUrl(route === '/' ? SITE : SITE + route);
}

export const LIMITS = {
  titleMax: 60,
  titleMin: 10,
  descMax: 160,
  descMin: 50,
};

// ---------- tiny HTML helpers (regex is adequate for these specific assertions) ----------
const stripComments = (h) => h.replace(/<!--[\s\S]*?-->/g, '');
const tagText = (h, tag) => {
  const m = h.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? m[1].replace(/<[^>]*>/g, '').trim() : null;
};
const metaContent = (h, name) => {
  const m = h.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]*>`, 'i'));
  if (!m) return null;
  const c = m[0].match(/content=["']([^"']*)["']/i);
  return c ? c[1] : null;
};
const linkHref = (h, rel) => {
  const m = h.match(new RegExp(`<link[^>]+rel=["']${rel}["'][^>]*>`, 'i'));
  if (!m) return null;
  const c = m[0].match(/href=["']([^"']*)["']/i);
  return c ? c[1] : null;
};
const countTag = (h, tag) => (h.match(new RegExp(`<${tag}[\\s>]`, 'gi')) || []).length;

/** Visible text only: drop script/style/head so JS and JSON-LD don't produce false hits. */
export function visibleText(html) {
  return stripComments(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<head[\s\S]*?<\/head>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
}

/** Literal markdown that leaked into rendered HTML — the PR #21 / Buda / About class. */
export function findMarkdownArtifacts(html) {
  const text = visibleText(html);
  const hits = [];
  const bold = text.match(/\*\*[^*\n]{1,80}\*\*/g);
  if (bold) hits.push(...bold);
  const heading = text.match(/^\s*#{1,6}\s+\S/gm);
  if (heading) hits.push(...heading.map((s) => s.trim()));
  const link = text.match(/\[[^\]\n]{1,60}\]\([^)\s]{1,120}\)/g);
  if (link) hits.push(...link);
  return [...new Set(hits)];
}

export function imagesMissingAlt(html) {
  const imgs = stripComments(html).match(/<img\b[^>]*>/gi) || [];
  return imgs.filter((t) => {
    const m = t.match(/\balt=["']([^"']*)["']/i);
    return !m; // alt="" is legitimate for decorative images; a MISSING attribute is not
  });
}

export function invalidJsonLd(html) {
  const blocks = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  const bad = [];
  for (const b of blocks) {
    const body = b.replace(/^[\s\S]*?>/, '').replace(/<\/script>$/i, '');
    try {
      const parsed = JSON.parse(body);
      const walk = (n) => {
        if (Array.isArray(n)) return n.forEach(walk);
        if (n && typeof n === 'object') {
          if (typeof n.item === 'string' && (n.item.endsWith('#') || n.item.includes('/#')))
            bad.push(`placeholder URL in structured data: ${n.item}`);
          Object.values(n).forEach(walk);
        }
      };
      walk(parsed);
    } catch (e) {
      bad.push(`unparseable JSON-LD: ${e.message}`);
    }
  }
  return bad;
}

function htmlFiles(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) htmlFiles(p, out);
    else if (e.endsWith('.html')) out.push(p);
  }
  return out;
}

export function auditPage(html, route) {
  const errors = [];
  const warnings = [];

  const title = tagText(html, 'title');
  if (!title) errors.push('missing <title>');
  else {
    if (title.length > LIMITS.titleMax) errors.push(`title ${title.length} chars (max ${LIMITS.titleMax}): "${title}"`);
    if (title.length < LIMITS.titleMin) errors.push(`title suspiciously short (${title.length}): "${title}"`);
    // The exact regression PR #21 fixed.
    const brand = 'NextGen Dental';
    const occurrences = title.split(brand).length - 1;
    if (occurrences > 1) errors.push(`brand appears ${occurrences}x in title: "${title}"`);
  }

  // noindex is required on 404 and forbidden everywhere else. Treating any noindex
  // as an error would have blocked the correct fix for the 404 page.
  const mustNoindex = NOINDEX_ROUTES.has(normalizeUrl(route) || '/');
  const robots = metaContent(html, 'robots') || '';
  if (mustNoindex && !/noindex/i.test(robots)) {
    errors.push(`this route must be noindex, robots is "${robots || '(absent)'}"`);
  } else if (!mustNoindex && /noindex/i.test(robots)) {
    errors.push(`unexpected noindex: "${robots}"`);
  }

  // A canonical that merely exists is not enough — every page pointing at the
  // homepage would satisfy that and deindex the site.
  const canonical = linkHref(html, 'canonical');
  if (!canonical) {
    errors.push('missing canonical');
  } else if (!/^https?:\/\//i.test(canonical)) {
    errors.push(`canonical not absolute: ${canonical}`);
  } else if (!mustNoindex) {
    const actual = normalizeUrl(canonical);
    const expected = expectedCanonical(route);
    if (actual !== expected) errors.push(`canonical mismatch: expected ${expected}, got ${actual}`);
  }

  const h1 = countTag(html, 'h1');
  if (h1 === 0) warnings.push('no <h1>');
  else if (h1 > 1) errors.push(`${h1} <h1> elements`);

  const md = findMarkdownArtifacts(html);
  if (md.length) errors.push(`literal markdown in rendered HTML: ${md.slice(0, 3).map((s) => JSON.stringify(s)).join(', ')}${md.length > 3 ? ` (+${md.length - 3} more)` : ''}`);

  for (const b of invalidJsonLd(html)) errors.push(b);

  const desc = metaContent(html, 'description');
  if (!desc) warnings.push('missing meta description');
  else {
    if (desc.length > LIMITS.descMax) warnings.push(`description ${desc.length} chars (max ${LIMITS.descMax})`);
    if (desc.length < LIMITS.descMin) warnings.push(`description ${desc.length} chars (min ${LIMITS.descMin})`);
    // Sentence-fragment detector: ". lowercase" — the Buda description defect.
    const frag = desc.match(/\.\s+[a-z]/);
    if (frag) warnings.push(`description has a lowercase sentence start: "...${desc.slice(Math.max(0, desc.indexOf(frag[0]) - 25), desc.indexOf(frag[0]) + 35)}..."`);
  }

  const noAlt = imagesMissingAlt(html);
  if (noAlt.length) warnings.push(`${noAlt.length} <img> without an alt attribute`);

  return { route, title, desc, errors, warnings };
}

function main() {
  if (!existsSync(DIST)) {
    console.error(`seo-audit: ${DIST} not found — run \`npm run build\` first.`);
    process.exit(1);
  }
  const files = htmlFiles(DIST);
  if (!files.length) {
    console.error(`seo-audit: no .html files under ${DIST}`);
    process.exit(1);
  }

  const results = files.map((f) => {
    const route = '/' + relative(DIST, f).split(sep).join('/').replace(/index\.html$/, '').replace(/\.html$/, '');
    return auditPage(readFileSync(f, 'utf8'), route);
  });

  // cross-page uniqueness
  const byTitle = new Map();
  const byDesc = new Map();
  for (const r of results) {
    if (r.title) byTitle.set(r.title, [...(byTitle.get(r.title) || []), r.route]);
    if (r.desc) byDesc.set(r.desc, [...(byDesc.get(r.desc) || []), r.route]);
  }
  const dupTitles = [...byTitle.entries()].filter(([, rs]) => rs.length > 1);
  const dupDescs = [...byDesc.entries()].filter(([, rs]) => rs.length > 1);

  let nErr = 0, nWarn = 0;
  console.log(`seo-audit: ${results.length} pages in ${DIST}\n`);
  for (const r of results.sort((a, b) => a.route.localeCompare(b.route))) {
    if (!r.errors.length && !r.warnings.length) continue;
    console.log(`  ${r.route}`);
    for (const e of r.errors) { console.log(`    ERROR  ${e}`); nErr++; }
    for (const w of r.warnings) { console.log(`    warn   ${w}`); nWarn++; }
  }
  for (const [t, rs] of dupTitles) { console.log(`  ERROR  duplicate <title> on ${rs.join(', ')}: "${t}"`); nErr++; }
  for (const [, rs] of dupDescs) { console.log(`  warn   duplicate meta description on ${rs.join(', ')}`); nWarn++; }

  // If nearly every page reports the same canonical origin mismatch, the SITE
  // setting is wrong rather than the pages being wrong. Say so once, loudly,
  // instead of printing the same error forty times and burying the cause.
  const mism = results.flatMap((r) => r.errors.filter((e) => e.startsWith('canonical mismatch')));
  if (mism.length >= 3 && mism.length >= results.length / 2) {
    const origins = new Set(mism.map((e) => (e.match(/got (https?:\/\/[^/]+)/) || [])[1]).filter(Boolean));
    if (origins.size === 1) {
      const seen = [...origins][0];
      console.log(`\n  HINT: ${mism.length}/${results.length} pages canonicalise to ${seen} but this`);
      console.log(`  audit expects ${SITE}. That is a configuration mismatch, not ${mism.length} page defects.`);
      console.log(`  Either \`site\` in astro.config.mjs changed, or this build is not production.`);
      console.log(`  Re-run with: SEO_AUDIT_SITE=${seen} node scripts/ci/seo-audit.mjs ${DIST}`);
    }
  }

  console.log(`\n${nErr} error(s), ${nWarn} warning(s)`);
  if (nErr) {
    console.log('\nErrors block the build. Warnings are pre-existing debt — promote them to');
    console.log('errors in scripts/ci/seo-audit.mjs as they are cleared.');
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
