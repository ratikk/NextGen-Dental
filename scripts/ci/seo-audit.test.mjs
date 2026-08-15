#!/usr/bin/env node
/**
 * Tests for seo-audit.mjs. Synthetic fixtures only — no build required.
 * Run: node scripts/ci/seo-audit.test.mjs
 *
 * Every check has a positive case (fires on the real defect, taken verbatim from
 * what actually shipped) and a negative case (silent when clean).
 */

import {
  auditPage, findMarkdownArtifacts, imagesMissingAlt, invalidJsonLd,
  visibleText, expectedCanonical, decodeHtmlEntities, LIMITS, SITE,
} from './seo-audit.mjs';

let pass = 0, fail = 0;
const check = (label, cond) => { if (cond) { pass++; } else { fail++; console.log(`  FAIL  ${label}`); } };

const DEFAULT_TITLE = 'Dental Implants in Austin, TX 78747 | NextGen Dental';
const DEFAULT_DESC = 'Replace missing teeth with dental implants at NextGen Dental in South Austin. Natural-looking, long-lasting restorations from experienced dentists.';

/** Build a page whose canonical self-references `route` unless overridden. */
function html({ route = '/services/dental-implants', title = DEFAULT_TITLE, desc = DEFAULT_DESC,
                body = '<h1>Dental Implants</h1><p>Hello</p>', head = '', robots = null,
                canonical = undefined } = {}) {
  const canon = canonical === undefined ? expectedCanonical(route) : canonical;
  return `<!DOCTYPE html><html><head>
<title>${title}</title>
<meta name="description" content="${desc}" />
${robots !== null ? `<meta name="robots" content="${robots}" />` : ''}
${canon === null ? '' : `<link rel="canonical" href="${canon}" />`}
${head}</head><body>${body}</body></html>`;
}
const audit = (opts = {}) => auditPage(html(opts), opts.route || '/services/dental-implants');

console.log('baseline');
{
  const r = audit();
  check('clean page has no errors', r.errors.length === 0);
  check('clean page has no warnings', r.warnings.length === 0);
  check('homepage clean', audit({ route: '/', title: 'Family Dentist in South Austin, TX 78747 | NextGen Dental' }).errors.length === 0);
}

console.log('title rules');
{
  const shipped = 'Sedation Dentist Austin, TX (78747) | Anxiety-Free Dentistry | NextGen Dental | NextGen Dental Austin, TX';
  const r = audit({ title: shipped });
  check('double-branded title -> error', r.errors.some((e) => e.includes('brand appears 2x')));
  check('over-length title -> error', r.errors.some((e) => e.includes(`max ${LIMITS.titleMax}`)));

  // Exactly what PR #21 shipped for the homepage.
  const homepage = 'Top-Rated Family Dentist in South Austin (78747) | NextGen Dental';
  const h = audit({ route: '/', title: homepage });
  check('65-char homepage title -> error (the bug this gate exists for)', h.errors.some((e) => e.includes('65 chars')));
  check('65-char title is not misreported as double-branded', !h.errors.some((e) => e.includes('brand appears')));

  check('60-char title passes', audit({ route: '/', title: 'Your Trusted Family Dentist in South Austin | NextGen Dental' }).errors.length === 0);
  check('missing <title> -> error', auditPage('<html><head><link rel="canonical" href="' + SITE + '/x"/></head><body><h1>x</h1></body></html>', '/x').errors.some((e) => e.includes('missing <title>')));
}

console.log('HTML entities are decoded before measuring');
{
  // First real run against dist/ failed 4 in-limit titles because `&` ships as
  // `&amp;`. The audit was measuring markup, not what a search engine renders.
  check('&amp; -> &', decodeHtmlEntities('Braces &amp; Aligners') === 'Braces & Aligners');
  check('&lt; &gt; -> < >', decodeHtmlEntities('a &lt;b&gt; c') === 'a <b> c');
  check('numeric entity', decodeHtmlEntities('&#39;s') === "'s");
  check('hex entity', decodeHtmlEntities('&#x2019;') === '\u2019');
  check('single pass: &amp;lt; stays &lt;', decodeHtmlEntities('&amp;lt;') === '&lt;');
  check('&amp; decodes to one displayed character',
    decodeHtmlEntities('Dental Financing &amp; Insurance') === 'Dental Financing & Insurance');
  check('numeric and hex ampersands both decode',
    decodeHtmlEntities('Austin &#38; Buda &#x26; Kyle') === 'Austin & Buda & Kyle');
  check('title length uses rendered text, not encoded HTML',
    audit({ title: 'Dental Implant Process &amp; Recovery Timeline | NextGen Dental' })
      .errors.every((e) => !e.includes('title 63 chars')));

  // The four titles that actually failed CI, verbatim, as they appear in dist.
  const shipped = [
    'Dental Implant Process &amp; Recovery Timeline | NextGen Dental',
    'Tongue Pain: Causes &amp; When to See a Dentist | NextGen Dental',
    'Dental Financing &amp; Insurance | Austin, TX | NextGen Dental',
    'Guide to Orthodontics | Braces &amp; Aligners | NextGen Dental',
  ];
  for (const t of shipped) {
    const r = audit({ title: t });
    check(`in-limit title with &amp; passes: ${decodeHtmlEntities(t).slice(0, 34)}...`,
      !r.errors.some((e) => e.includes('chars (max')));
  }
  // and a genuinely over-limit title still fails after decoding
  check('genuinely over-limit title still errors',
    audit({ title: 'Dental Implant Process &amp; Recovery Timeline and More Words | NextGen Dental' })
      .errors.some((e) => e.includes('chars (max')));
  check('entity-encoded description measured decoded',
    audit({ desc: 'Straighten teeth &amp; smile with Invisalign clear aligners at NextGen Dental in South Austin, Texas. Book your consultation with our team today.' }).warnings.length === 0);
}

console.log('canonical must self-reference');
{
  check('expectedCanonical("/") is the bare origin', expectedCanonical('/') === SITE);
  check('expectedCanonical strips trailing slash', expectedCanonical('/services/invisalign/') === `${SITE}/services/invisalign`);

  check('correct self-referencing canonical passes',
    audit({ route: '/services/invisalign', title: 'Invisalign® Clear Aligners | Austin, TX | NextGen Dental' }).errors.length === 0);

  // Astro emits directory-format routes with a trailing slash; the built file path has none.
  check('trailing-slash difference is tolerated',
    audit({ route: '/services/invisalign', canonical: `${SITE}/services/invisalign/`,
            title: 'Invisalign® Clear Aligners | Austin, TX | NextGen Dental' }).errors.length === 0);

  check('canonical pointing at the homepage -> error',
    audit({ route: '/services/invisalign', canonical: `${SITE}/` }).errors.some((e) => e.includes('canonical mismatch')));

  check('canonical on the wrong domain -> error',
    audit({ canonical: 'https://nextgendentaltx.com/services/dental-implants' }).errors.some((e) => e.includes('canonical mismatch')));

  check('relative canonical -> error',
    audit({ canonical: '/services/dental-implants' }).errors.some((e) => e.includes('not absolute')));

  check('missing canonical -> error',
    audit({ canonical: null }).errors.some((e) => e.includes('missing canonical')));
}

console.log('noindex: required on 404, forbidden elsewhere');
{
  const t404 = 'Page Not Found | NextGen Dental';
  const d404 = 'The page you are looking for does not exist. Return to the NextGen Dental home page for South Austin family and cosmetic dentistry.';

  check('404 WITHOUT noindex -> error',
    auditPage(html({ route: '/404', title: t404, desc: d404, body: '<h1>404</h1>' }), '/404')
      .errors.some((e) => e.includes('must be noindex')));

  check('404 WITH noindex -> clean',
    auditPage(html({ route: '/404', title: t404, desc: d404, robots: 'noindex, follow', body: '<h1>404</h1>' }), '/404').errors.length === 0);

  check('noindex on an ordinary page -> error',
    audit({ robots: 'noindex, nofollow' }).errors.some((e) => e.includes('unexpected noindex')));

  check('index,follow on an ordinary page is fine', audit({ robots: 'index, follow' }).errors.length === 0);

  // A 404's canonical is not meaningfully self-referencing; it must not be enforced.
  check('404 is exempt from the canonical self-reference check',
    auditPage(html({ route: '/404', title: t404, desc: d404, robots: 'noindex, follow',
                     canonical: `${SITE}/`, body: '<h1>404</h1>' }), '/404')
      .errors.every((e) => !e.includes('canonical mismatch')));
}

console.log('markdown artifacts (Buda / About class)');
{
  check('** in body -> detected', findMarkdownArtifacts('<p>If you live in **Buda, Kyle, or Onion Creek**, you deserve</p>').length === 1);
  check('About line 169 case -> detected', findMarkdownArtifacts('<p>families in **Austin (78747)**, Buda, and Kyle.</p>').length === 1);
  check('bio-string case -> detected', findMarkdownArtifacts('<p>Now proudly serving the **South Austin** community</p>').length === 1);
  check('markdown -> page error', audit({ body: '<h1>t</h1><p>off **Interstate 35**, near</p>' }).errors.some((e) => e.includes('literal markdown')));
  check('<strong> is clean', findMarkdownArtifacts('<p>off <strong>Interstate 35</strong>, near</p>').length === 0);
  check('CSS/JS asterisks ignored', findMarkdownArtifacts('<style>/** c */ a{}</style><script>a**b</script><p>fine</p>').length === 0);
  check('markdown link syntax -> detected', findMarkdownArtifacts('<p>See [our page](/services) now</p>').length === 1);
  check('heading syntax -> detected', findMarkdownArtifacts('<p>ok</p>\n## Not a heading\n').length === 1);
  check('head excluded from visible text', !visibleText(html({ head: '<meta name="x" content="**y**">' })).includes('**y**'));
}

console.log('h1 and structured data');
{
  check('two h1 -> error', audit({ body: '<h1>a</h1><h1>b</h1>' }).errors.some((e) => e.includes('2 <h1>')));
  check('zero h1 -> warning not error', (() => { const r = audit({ body: '<p>no heading</p>' }); return r.warnings.some((w) => w.includes('no <h1>')) && !r.errors.length; })());
  check('unparseable JSON-LD -> flagged', invalidJsonLd('<script type="application/ld+json">{bad json}</script>').length === 1);
  check('valid JSON-LD -> clean', invalidJsonLd('<script type="application/ld+json">{"@type":"Dentist"}</script>').length === 0);
  const bc = '<script type="application/ld+json">{"@type":"BreadcrumbList","itemListElement":[{"item":"' + SITE + '/#"}]}</script>';
  check('placeholder "#" URL in schema -> flagged (the Buda breadcrumb)', invalidJsonLd(bc).length === 1);
}

console.log('images and descriptions');
{
  check('img without alt -> flagged', imagesMissingAlt('<img src="a.jpg">').length === 1);
  check('alt="" (decorative) allowed', imagesMissingAlt('<img src="a.jpg" alt="">').length === 0);
  check('img with alt clean', imagesMissingAlt('<img src="a.jpg" alt="A dentist">').length === 0);
  const buda = 'Looking for a top-rated dentist near Buda, TX? NextGen Dental is located just minutes north on I-35 in South Austin. comprehensive family & cosmetic dentistry.';
  check('lowercase sentence start -> warning', audit({ desc: buda }).warnings.some((w) => w.includes('lowercase sentence start')));
  check('well-formed description clean', audit().warnings.length === 0);
  check('short description -> warning', audit({ desc: 'Too short.' }).warnings.some((w) => w.includes('min')));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
