import { trackApprovedEvent, normalizePath, classifyPageUrl, getPathPolicyStats, resetPathPolicyStats, EVENT_REGISTRY, BOOKING_PROVIDERS, normalizeBookingProvider } from './trackApprovedEvent.mjs';

let pass = 0, fail = 0;
const check = (label, cond) => { cond ? pass++ : fail++; if (!cond) console.log(`FAIL  ${label}`); };
const WID = '3f1c2b9a-1111-4222-8333-abcdefabcdef';
const ok  = (n,p,u) => trackApprovedEvent(n,p,u,WID);

// ---------- happy path: every approved enum value for every event ----------
for (const [name, spec] of Object.entries(EVENT_REGISTRY)) {
  const base = {};
  for (const r of spec.required) base[r] = spec.properties[r][0];
  for (const [key, values] of Object.entries(spec.properties)) {
    for (const v of values) {
      const r = ok(name, { ...base, [key]: v }, '/contact');
      check(`${name}.${key}=${v} accepted`, r.ok);
    }
  }
}

// ---------- required-property enforcement ----------
check('appointment_click {} rejected',            ok('appointment_click', {}, '/').error === 'missing_required_property');
check('appointment_click partial rejected',       ok('appointment_click', {page_category:'service'}, '/').error === 'missing_required_property');
check('phone_click missing cta rejected',         ok('phone_click', {page_category:'blog'}, '/').error === 'missing_required_property');
check('form_start {} rejected',                   ok('form_start', {}, '/').error === 'missing_required_property');
check('blog_to_service_click partial rejected',   ok('blog_to_service_click', {article_category:'emergency'}, '/').error === 'missing_required_property');

// ---------- event / property / value rejection ----------
check('unregistered event',        ok('page_scrolled', {}, '/').error === 'unapproved_event');
check('non-string event',          ok(42, {}, '/').error === 'unapproved_event');
check('prototype event name',      ok('toString', {}, '/').error === 'unapproved_event');
check('unknown property',          ok('form_start', {form_type:'appointment', patient:'x'}, '/').error === 'unknown_property');
check('prototype property key',    ok('form_start', {form_type:'appointment', constructor:'x'}, '/').error === 'unknown_property');
check('off-allowlist enum',        ok('form_start', {form_type:'walk-in'}, '/').error === 'value_not_in_allowlist');
check('null value',                ok('form_start', {form_type:null}, '/').error === 'invalid_value_type');
check('undefined value',           ok('form_start', {form_type:undefined}, '/').error === 'invalid_value_type');
check('numeric value',             ok('form_start', {form_type:1}, '/').error === 'invalid_value_type');
check('boolean value',             ok('form_start', {form_type:true}, '/').error === 'invalid_value_type');
check('array value',               ok('form_start', {form_type:['appointment']}, '/').error === 'invalid_value_type');
check('object value',              ok('form_start', {form_type:{a:1}}, '/').error === 'invalid_value_type');
check('null props',                ok('form_start', null, '/').error === 'invalid_properties');
check('array props',               ok('form_start', [], '/').error === 'invalid_properties');
check('excessive property count',  ok('form_start', Object.fromEntries(Array.from({length:9},(_,i)=>[`k${i}`,'v'])), '/').error === 'too_many_properties');
check('email-like value',          ok('phone_click', {page_category:'a@b.com', cta_location:'body'}, '/').error === 'identifier_like_value');
check('phone-like value',          ok('phone_click', {page_category:'(512) 649-4419', cta_location:'body'}, '/').error === 'identifier_like_value');
check('long free text',            ok('form_start', {form_type:'I have severe pain in my lower left molar'}, '/').error === 'identifier_like_value');
check('uuid-like value',           ok('phone_click', {page_category:'8f5dbcc3-559d-4bbf', cta_location:'body'}, '/').error === 'identifier_like_value');
check('unicode free text',         ok('form_start', {form_type:'दर्द बहुत ज़्यादा है, कृपया मदद करें'}, '/').error === 'identifier_like_value');

// ---------- no-echo guarantee: rejected input never appears in the result ----------
const SECRETS = ['ratik.nanda@gmail.com', '5126494419', 'patient-jane-doe'];
const echoes = [
  ok(SECRETS[0], {}, '/'),                                              // sensitive event name
  ok('form_start', {[SECRETS[0]]:'x'}, '/'),                            // sensitive property key
  ok('form_start', {form_type:SECRETS[1]}, '/'),                        // sensitive value
  ok('phone_click', {page_category:SECRETS[2], cta_location:'body'}, '/'),
];
for (const r of echoes) {
  const s = JSON.stringify(r);
  check(`no echo of untrusted input (${r.error})`, !r.ok && SECRETS.every(x => !s.includes(x)));
}

// ---------- websiteId fail-closed ----------
check('missing websiteId',   trackApprovedEvent('form_start', {form_type:'appointment'}, '/').error === 'invalid_website_id');
check('placeholder websiteId', trackApprovedEvent('form_start', {form_type:'appointment'}, '/', 'WEBSITE_ID').error === 'invalid_website_id');
check('malformed websiteId', trackApprovedEvent('form_start', {form_type:'appointment'}, '/', 'not-a-uuid').error === 'invalid_website_id');

// ---------- path policy ----------
check('own-origin absolute ok',    normalizePath('https://nextgendentalaustintx.com/services/invisalign') === '/services/invisalign');
check('staging origin ok',         normalizePath('https://dev.nextgendentalaustintx.com/blog') === '/blog');
check('foreign origin -> unsafe', classifyPageUrl('https://evil.example.com/services/invisalign').kind === 'unsafe');
check('query stripped',            normalizePath('/services/invisalign?utm_source=fb&gclid=1') === '/services/invisalign');
check('fragment stripped',         normalizePath('/contact#form') === '/contact');
check('trailing slash',            normalizePath('/blog/') === '/blog');
check('repeated slashes',          normalizePath('/blog//dental-emergency-what-to-do') === '/blog/dental-emergency-what-to-do');
check('uppercase normalized',      normalizePath('/Services/Invisalign') === '/services/invisalign');
check('encoded email rejected',    normalizePath('/blog/jane%40example.com') === null);
check('encoded phone rejected',    normalizePath('/blog/call-5126494419') === null);
check('double-encoded rejected',   normalizePath('/blog/jane%2540example.com') === null);
check('path traversal rejected',   normalizePath('/services/../admin') === null);
check('unknown route rejected',    normalizePath('/keystatic/secret-draft') === null);
check('deep path rejected',        normalizePath('/blog/2026/08/07/post') === null);
check('very long URL rejected',    normalizePath('/blog/' + 'a'.repeat(300)) === null);
check('invalid URL rejected',      normalizePath('ht!tp://%%%') === null);
check('non-string URL rejected',   normalizePath(12345) === null);

// ---------- hybrid path policy on full event calls ----------
resetPathPolicyStats();
const uns = ok('phone_click', {page_category:'blog', cta_location:'body'}, '/blog/jane%40example.com?x=1');
check('identifier-like path -> event rejected', !uns.ok && uns.error === 'unsafe_page_url');
check('rejected URL not echoed', !JSON.stringify(uns).includes('jane'));
const forx = ok('form_start', {form_type:'appointment'}, 'https://evil.example.com/x');
check('foreign origin -> event rejected', !forx.ok && forx.error === 'unsafe_page_url');
const agg = ok('phone_click', {page_category:'blog', cta_location:'body'}, '/keystatic/whatever-page');
check('first-party unknown route -> aggregated', agg.ok && agg.payload.payload.url === '/category/blog');
check('aggregation carries warning', Array.isArray(agg.warnings) && agg.warnings.includes('unrecognized_route'));
check('aggregated raw path absent', !JSON.stringify(agg).includes('keystatic'));
const agg2 = ok('form_start', {form_type:'appointment'}, '/some/unknown/deep/route');
check('aggregate without category -> /unrecognized', agg2.ok && agg2.payload.payload.url === '/unrecognized');
const stats = getPathPolicyStats();
check('stats: 2 rejected counted', stats.rejected === 2);
check('stats: 2 aggregated counted', stats.aggregated === 2);
check('stats expose counts only', Object.keys(stats).sort().join(',') === 'aggregated,rejected');

// ---------- deep-freeze: the registry cannot be weakened at runtime ----------
let threw = 0;
try { EVENT_REGISTRY.form_start.properties.form_type.push('walk-in'); } catch { threw++; }
try { EVENT_REGISTRY.appointment_click.required.pop(); } catch { threw++; }
try { EVENT_REGISTRY.form_start.properties.form_type[0] = 'hacked'; } catch { threw++; }
try { EVENT_REGISTRY.newEvent = {}; } catch { threw++; }
check('all 4 mutation attempts throw', threw === 4);
check('enum unchanged after attack', EVENT_REGISTRY.form_start.properties.form_type.join(',') === 'appointment,contact,booking');
check('required unchanged after attack', EVENT_REGISTRY.appointment_click.required.length === 3);
check('unapproved value still rejected post-attack', ok('form_start', {form_type:'walk-in'}, '/contact').error === 'value_not_in_allowlist');
check('required still enforced post-attack', ok('appointment_click', {page_category:'home', cta_location:'hero'}, '/').error === 'missing_required_property');

// ---------- caller object not mutated; payload shape ----------
const props = Object.freeze({page_category:'service', cta_location:'hero', booking_provider:'zocdoc'});
const r1 = ok('appointment_click', props, '/services/invisalign?utm_source=x');
check('frozen caller props accepted (no mutation)', r1.ok);
check('payload url normalized', r1.payload.payload.url === '/services/invisalign');
check('payload website id set', r1.payload.payload.website === WID);


// ---------- site wiring ----------
import { resolveWebsiteId, pageCategoryFor } from './trackApprovedEvent.mjs';
check('dev host -> dev id', resolveWebsiteId('dev.nextgendentalaustintx.com') === '70b20ce6-d664-4105-976e-cf98cbe9b3ed');
check('apex host -> prod id', resolveWebsiteId('nextgendentalaustintx.com') === '86e99b8f-36ca-443c-a88f-a6b2aa68c5ba');
check('www host -> prod id', resolveWebsiteId('www.nextgendentalaustintx.com') === '86e99b8f-36ca-443c-a88f-a6b2aa68c5ba');
check('localhost -> null (no tracking)', resolveWebsiteId('localhost') === null);
check('foreign host -> null', resolveWebsiteId('evil.example.com') === null);
check('category /', pageCategoryFor('/') === 'home');
check('category service', pageCategoryFor('/services/invisalign') === 'service');
check('category blog', pageCategoryFor('/blog/x') === 'blog');
check('category patient-ed', pageCategoryFor('/patient-education/faq') === 'patient-info');
check('category unknown', pageCategoryFor('/keystatic') === 'other');

// ---------- booking provider is swappable (Zocdoc is paid marketing, temporary) ----------
// Before this, booking_provider was Object.freeze(['zocdoc']). The day the vendor
// changed, every appointment_click would have been rejected as value_not_in_allowlist
// and dropped silently, because sendApprovedEvent is fail-closed and never throws.
const bp = EVENT_REGISTRY.appointment_click.properties.booking_provider;
check('enum carries every provider we may switch to',
  bp.join(',') === 'zocdoc,direct,modento,other');
for (const provider of ['zocdoc', 'direct', 'modento', 'other']) {
  check(`booking_provider=${provider} accepted`,
    ok('appointment_click', { page_category: 'home', cta_location: 'header', booking_provider: provider }, '/').ok);
}
check('an unlisted provider is still rejected',
  ok('appointment_click', { page_category: 'home', cta_location: 'header', booking_provider: 'some-new-vendor' }, '/').error === 'value_not_in_allowlist');
// normalizeBookingProvider is the backstop for the config/registry split: if
// clinicInfo.booking.provider is ever set to a vendor missing from this enum,
// fold to 'other' rather than let a fail-closed rejection eat the conversion.
for (const p of BOOKING_PROVIDERS) {
  check(`normalize keeps known provider ${p}`, normalizeBookingProvider(p) === p);
}
check('unknown vendor folds to other', normalizeBookingProvider('some-new-vendor') === 'other');
check('undefined folds to other', normalizeBookingProvider(undefined) === 'other');
check('empty string folds to other', normalizeBookingProvider('') === 'other');
check('normalized unknown vendor is ACCEPTED by the registry (event survives)',
  ok('appointment_click', { page_category: 'home', cta_location: 'header',
      booking_provider: normalizeBookingProvider('brand-new-scheduler') }, '/').ok);

check('provider enum is frozen', (() => {
  try { bp.push('rogue'); return false; } catch { return bp.length === 4; }
})());

console.log(`\nnode ${process.version} · ${pass} passed · ${fail} failed · exit ${fail ? 1 : 0}`);
process.exit(fail ? 1 : 0);
