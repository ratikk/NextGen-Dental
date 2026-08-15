/**
 * trackApprovedEvent v2 — controlled conversion-event wrapper (PoC, hardened)
 * Fail-closed contract:
 *  - registered events only; required + optional properties enforced
 *  - string enum values only; own-property checks
 *  - websiteId must be a UUID (no placeholder default)
 *  - paths validated against an allow-list of static route shapes;
 *    unsafe/unrecognized paths fall back to a category pseudo-path
 *  - rejections return an error CODE ONLY — no echo of untrusted names,
 *    keys, or values anywhere in the return object
 */

const PAGE_CATEGORIES = Object.freeze(['home','service','blog','location','patient-info','about','contact','financing','other']);
const CTA_LOCATIONS   = Object.freeze(['header','hero','body','footer','sticky']);
const SERVICE_CATS    = Object.freeze(['preventive','cosmetic','restorative','emergency','orthodontic','other']);
// Every provider we may switch to, enumerated NOW. The registry is deep-frozen and
// guarded by blocking tests; a single-value enum meant that swapping booking vendor
// would silently drop every appointment_click (fail-closed by design, so no throw).
const BOOKING_PROVIDERS = Object.freeze(['zocdoc','direct','modento','other']);
const ARTICLE_CATS    = Object.freeze(['preventive','cosmetic','restorative','emergency','invisalign','veneers','other']);

export const EVENT_REGISTRY = Object.freeze({
  appointment_click: Object.freeze({
    required: Object.freeze(['page_category','cta_location','booking_provider']),
    properties: Object.freeze({ page_category: PAGE_CATEGORIES, cta_location: CTA_LOCATIONS, booking_provider: BOOKING_PROVIDERS }),
  }),
  phone_click: Object.freeze({
    required: Object.freeze(['page_category','cta_location']),
    properties: Object.freeze({ page_category: PAGE_CATEGORIES, cta_location: CTA_LOCATIONS }),
  }),
  form_start: Object.freeze({
    required: Object.freeze(['form_type']),
    properties: Object.freeze({ form_type: Object.freeze(['appointment','contact','booking']) }),
  }),
  form_submit_success: Object.freeze({
    required: Object.freeze(['form_type']),
    properties: Object.freeze({ form_type: Object.freeze(['appointment','contact','booking']) }),
  }),
  blog_to_service_click: Object.freeze({
    required: Object.freeze(['article_category','service_category']),
    properties: Object.freeze({ article_category: ARTICLE_CATS, service_category: SERVICE_CATS }),
  }),
});

const ALLOWED_ORIGINS = Object.freeze([
  'https://nextgendentalaustintx.com',
  'https://www.nextgendentalaustintx.com',
  'https://dev.nextgendentalaustintx.com',
]);

// Static route shapes for the current Astro site. Anything else is unsafe.
const PATH_ALLOWLIST = Object.freeze([
  /^\/$/,
  /^\/(about|contact|financing|patient-information|smile-gallery|reviews|blog|services|locations|patient-education)$/,
  /^\/(blog|services|locations|patient-education)\/[a-z0-9][a-z0-9-]{0,60}$/,
]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const MAX_URL_LEN = 200, MAX_VALUE_LEN = 24, MAX_PROP_COUNT = 8;

function looksLikeIdentifier(s) {
  if (s.length > MAX_VALUE_LEN) return true;
  if (/@/.test(s)) return true;
  if (/\d{7,}/.test(s.replace(/[\s().+-]/g, ''))) return true;
  if (/[0-9a-f]{8}-[0-9a-f]{4}/i.test(s)) return true;
  return false;
}

function fullyDecode(s) {           // bounded decode to defeat double-encoding
  for (let i = 0; i < 3; i++) {
    let d; try { d = decodeURIComponent(s); } catch { return null; }
    if (d === s) return s;
    s = d;
  }
  return s;
}

/**
 * Hybrid path policy (per review):
 *  - 'safe'      known first-party static route            -> record path
 *  - 'aggregate' first-party origin but unrecognized route -> /category/<cat> + warning counter
 *  - 'unsafe'    foreign origin, malformed, oversized, traversal,
 *                or identifier-like path                    -> REJECT event entirely
 * Rejected/aggregated URLs are never logged; only counts are kept.
 */
const pathPolicyStats = { aggregated: 0, rejected: 0 };
export function getPathPolicyStats() { return { ...pathPolicyStats }; }   // counts only — for "N unsafe-path events rejected" alerts
export function resetPathPolicyStats() { pathPolicyStats.aggregated = 0; pathPolicyStats.rejected = 0; }

export function classifyPageUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || rawUrl.length === 0 || rawUrl.length > MAX_URL_LEN) return { kind: 'unsafe' };
  let u;
  try { u = new URL(rawUrl, ALLOWED_ORIGINS[0]); } catch { return { kind: 'unsafe' }; }
  if (!ALLOWED_ORIGINS.includes(u.origin)) return { kind: 'unsafe' };            // foreign origin -> reject
  const decoded = fullyDecode(u.pathname);
  if (decoded === null) return { kind: 'unsafe' };
  let p = decoded.toLowerCase().replace(/\/{2,}/g, '/');
  if (p.includes('..')) return { kind: 'unsafe' };                               // traversal -> reject
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  if (/@/.test(p)) return { kind: 'unsafe' };                                    // email-like -> reject
  if (/\d{7,}/.test(p.replace(/[^0-9]/g, ''))) return { kind: 'unsafe' };       // phone-like -> reject
  if (!PATH_ALLOWLIST.some((re) => re.test(p))) return { kind: 'aggregate' };    // first-party unknown route -> aggregate + warn
  return { kind: 'safe', path: p };
}

/** Back-compat helper used by tests: safe path string or null. */
export function normalizePath(rawUrl) {
  const c = classifyPageUrl(rawUrl);
  return c.kind === 'safe' ? c.path : null;
}

export function trackApprovedEvent(eventName, props, pageUrl, websiteId) {
  if (typeof websiteId !== 'string' || !UUID_RE.test(websiteId)) return { ok: false, error: 'invalid_website_id' };
  if (typeof eventName !== 'string' || !Object.hasOwn(EVENT_REGISTRY, eventName)) return { ok: false, error: 'unapproved_event' };
  const spec = EVENT_REGISTRY[eventName];

  if (props === null || typeof props !== 'object' || Array.isArray(props)) return { ok: false, error: 'invalid_properties' };
  const keys = Object.keys(props);                                  // own enumerable keys only; caller object never mutated
  if (keys.length > MAX_PROP_COUNT) return { ok: false, error: 'too_many_properties' };

  const data = {};
  for (const key of keys) {
    if (!Object.hasOwn(spec.properties, key)) return { ok: false, error: 'unknown_property' };
    const value = props[key];
    if (typeof value !== 'string')            return { ok: false, error: 'invalid_value_type' };
    if (looksLikeIdentifier(value))           return { ok: false, error: 'identifier_like_value' };
    if (!spec.properties[key].includes(value)) return { ok: false, error: 'value_not_in_allowlist' };
    data[key] = value;
  }
  for (const req of spec.required) {
    if (!Object.hasOwn(data, req)) return { ok: false, error: 'missing_required_property' };
  }

  const cls = classifyPageUrl(pageUrl);
  if (cls.kind === 'unsafe') {                                      // foreign origin / malformed / identifier-like: fail closed
    pathPolicyStats.rejected += 1;                                  // count only; URL never logged
    return { ok: false, error: 'unsafe_page_url' };
  }
  let url, warnings;
  if (cls.kind === 'aggregate') {                                   // first-party but unrecognized route: keep the count, warn ops
    pathPolicyStats.aggregated += 1;
    url = Object.hasOwn(data, 'page_category') ? `/category/${data.page_category}` : '/unrecognized';
    warnings = ['unrecognized_route'];
  } else {
    url = cls.path;
  }

  // Payload object INTENDED for transmission (Umami /api/send shape).
  // The live network request, headers, cookie absence, and server handling
  // are verified in staging — not claimed here.
  const result = { ok: true, payload: { type: 'event', payload: { website: websiteId, url, name: eventName, data } } };
  if (warnings) result.warnings = warnings;
  return result;
}


// ---------------------------------------------------------------------------
// Site wiring (browser side)

const WEBSITE_IDS = Object.freeze({
  'dev.nextgendentalaustintx.com': '70b20ce6-d664-4105-976e-cf98cbe9b3ed', // staging
  'nextgendentalaustintx.com':     '86e99b8f-36ca-443c-a88f-a6b2aa68c5ba', // production
  'www.nextgendentalaustintx.com': '86e99b8f-36ca-443c-a88f-a6b2aa68c5ba', // production
});

/** Returns the Umami website UUID for a hostname, or null (=> no tracking). */
export function resolveWebsiteId(hostname) {
  return Object.hasOwn(WEBSITE_IDS, hostname) ? WEBSITE_IDS[hostname] : null;
}

/** Maps a normalized pathname to the page_category enum. */
export function pageCategoryFor(pathname) {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/services')) return 'service';
  if (pathname.startsWith('/blog')) return 'blog';
  if (pathname.startsWith('/locations')) return 'location';
  if (pathname.startsWith('/patient-information') || pathname.startsWith('/patient-education')) return 'patient-info';
  if (pathname.startsWith('/about')) return 'about';
  if (pathname.startsWith('/contact')) return 'contact';
  if (pathname.startsWith('/financing')) return 'financing';
  return 'other';
}

/**
 * Validate and (if approved) hand the event to the Umami tracker.
 * Fail-silent by design: analytics must never break the site. Only error
 * CODES are logged; never values.
 */
export function sendApprovedEvent(eventName, props = {}) {
  try {
    if (typeof window === 'undefined') return { ok: false, error: 'not_browser' };
    const id = resolveWebsiteId(window.location.hostname);
    if (id === null) return { ok: false, error: 'untracked_host' }; // localhost/previews
    const result = trackApprovedEvent(eventName, props, window.location.pathname, id);
    if (!result.ok) {
      console.debug('[analytics] rejected:', result.error);
      return result;
    }
    // umami's script attaches url/session itself (query strings excluded via
    // data attributes); we pass only the validated event name + data.
    window.umami?.track(eventName, result.payload.payload.data);
    return result;
  } catch {
    return { ok: false, error: 'send_failed' };
  }
}
