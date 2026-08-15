#!/usr/bin/env node
/**
 * Tests for seo-audit.mjs. Synthetic fixtures only — no build required.
 * Run: node scripts/ci/seo-audit.test.mjs
 *
 * Every check has both a positive case (fires on the real defect, taken verbatim
 * from what actually shipped) and a negative case (does not fire when clean).
 */

import { auditPage, findMarkdownArtifacts, imagesMissingAlt, invalidJsonLd, visibleText, LIMITS } from './seo-audit.mjs';

let pass = 0, fail = 0;
const check = (label, cond) => { if (cond) { pass++; } else { fail++; console.log(`  FAIL  ${label}`); } };

const page = ({ title = 'Dental Implants in Austin, TX 78747 | NextGen Dental', desc = 'Replace missing teeth with dental implants at NextGen Dental in South Austin. Natural-looking, long-lasting restorations from experienced dentists.', body = '<h1>Dental Implants</h1><p>Hello</p>', head = '', robots = '' } = {}) => `<!DOCTYPE html><html><head>
<title>${title}</title>
<meta name="description" content="${desc}" />
${robots ? `<meta name="robots" content="${robots}" />` : ''}
<link rel="canonical" href="https://nextgendentalaustintx.com/services/dental-implants" />
${head}</head><body>${body}</body></html>`;

console.log('baseline');
{
  const r = auditPage(page(), '/services/dental-implants');
  check('clean page has no errors', r.errors.length === 0);
  check('clean page has no warnings', r.warnings.length === 0);
}

console.log('title rules');
{
  // The exact string that shipped before PR #21.
  const shipped = 'Sedation Dentist Austin, TX (78747) | Anxiety-Free Dentistry | NextGen Dental | NextGen Dental Austin, TX';
  const r = auditPage(page({ title: shipped }), '/x');
  check('double-branded title -> error', r.errors.some((e) => e.includes('brand appears 2x')));
  check('over-length title -> error', r.errors.some((e) => e.includes(`max ${LIMITS.titleMax}`)));

  // The exact string PR #21 shipped for the homepage: 65 chars, brand once.
  const homepage = 'Top-Rated Family Dentist in South Austin (78747) | NextGen Dental';
  const h = auditPage(page({ title: homepage }), '/');
  check('65-char homepage title -> error (the bug the script exists to catch)',
    h.errors.some((e) => e.includes('65 chars')));
  check('65-char title is NOT flagged as double-branded', !h.errors.some((e) => e.includes('brand appears')));

  check('60-char title passes', auditPage(page({ title: 'Your Trusted Family Dentist in South Austin | NextGen Dental' }), '/').errors.length === 0);
  check('missing title -> error', auditPage(`<html><head><link rel="canonical" href="https://x.com/"/></head><body><h1>x</h1></body></html>`, '/').errors.some((e) => e.includes('missing <title>')));
}

console.log('markdown artifacts (Buda / About class)');
{
  check('** in body -> detected', findMarkdownArtifacts('<p>If you live in **Buda, Kyle, or Onion Creek**, you deserve</p>').length === 1);
  check('the About line 169 case -> detected',
    findMarkdownArtifacts('<p>families in **Austin (78747)**, Buda, and Kyle.</p>').length === 1);
  check('bio-string case -> detected',
    findMarkdownArtifacts('<p>Now proudly serving the **South Austin** community</p>').length === 1);
  check('markdown -> page error', auditPage(page({ body: '<h1>t</h1><p>off **Interstate 35**, near</p>' }), '/x').errors.some((e) => e.includes('literal markdown')));
  check('<strong> is clean', findMarkdownArtifacts('<p>off <strong>Interstate 35</strong>, near</p>').length === 0);
  check('CSS/JS asterisks in <style>/<script> ignored',
    findMarkdownArtifacts('<style>/** comment */ a{}</style><script>a**b</script><p>fine</p>').length === 0);
  check('markdown link syntax -> detected', findMarkdownArtifacts('<p>See [our page](/services) now</p>').length === 1);
  check('heading syntax -> detected', findMarkdownArtifacts('<p>ok</p>\n## Not a heading\n').length === 1);
  check('head is excluded from visible text', !visibleText(page({ head: '<meta name="x" content="**y**">' })).includes('**y**'));
}

console.log('noindex / canonical / h1');
{
  check('noindex -> error', auditPage(page({ robots: 'noindex, nofollow' }), '/x').errors.some((e) => e.includes('noindex')));
  check('index,follow is fine', auditPage(page({ robots: 'index, follow' }), '/x').errors.length === 0);
  check('missing canonical -> error', auditPage('<html><head><title>A reasonable title here</title></head><body><h1>x</h1></body></html>', '/x').errors.some((e) => e.includes('missing canonical')));
  check('two h1 -> error', auditPage(page({ body: '<h1>a</h1><h1>b</h1>' }), '/x').errors.some((e) => e.includes('2 <h1>')));
  check('zero h1 -> warning not error', (() => { const r = auditPage(page({ body: '<p>no heading</p>' }), '/x'); return r.warnings.some((w) => w.includes('no <h1>')) && !r.errors.length; })());
}

console.log('structured data');
{
  check('unparseable JSON-LD -> flagged', invalidJsonLd('<script type="application/ld+json">{bad json}</script>').length === 1);
  check('valid JSON-LD -> clean', invalidJsonLd('<script type="application/ld+json">{"@type":"Dentist"}</script>').length === 0);
  // The Buda breadcrumb defect: href="#" reached BreadcrumbList as an item URL.
  const bc = '<script type="application/ld+json">{"@type":"BreadcrumbList","itemListElement":[{"item":"https://nextgendentalaustintx.com/#"}]}</script>';
  check('placeholder # URL in schema -> flagged', invalidJsonLd(bc).length === 1);
}

console.log('images and descriptions');
{
  check('img without alt -> flagged', imagesMissingAlt('<img src="a.jpg">').length === 1);
  check('alt="" (decorative) is allowed', imagesMissingAlt('<img src="a.jpg" alt="">').length === 0);
  check('img with alt is clean', imagesMissingAlt('<img src="a.jpg" alt="A dentist">').length === 0);
  // The Buda description defect, verbatim.
  const buda = 'Looking for a top-rated dentist near Buda, TX? NextGen Dental is located just minutes north on I-35 in South Austin. comprehensive family & cosmetic dentistry.';
  check('lowercase sentence start -> warning', auditPage(page({ desc: buda }), '/x').warnings.some((w) => w.includes('lowercase sentence start')));
  check('well-formed description is clean', auditPage(page(), '/x').warnings.length === 0);
  check('short description -> warning', auditPage(page({ desc: 'Too short.' }), '/x').warnings.some((w) => w.includes('min')));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
