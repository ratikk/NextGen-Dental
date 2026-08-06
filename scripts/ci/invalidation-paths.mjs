#!/usr/bin/env node
// Compute the minimal CloudFront invalidation path set between two release
// manifests. Prints one path per line; prints "/*" when a full invalidation
// is required (no previous manifest, or too many changed paths).
// Usage: node scripts/ci/invalidation-paths.mjs <oldManifest.json|-> <newManifest.json>
//
// Rules:
//   - Files present in both but with different sha256  -> invalidate
//   - Files removed in the new release                 -> invalidate
//   - Brand-new files need no invalidation (nothing cached under that path),
//     except we still invalidate their clean-URL variants for HTML.
//   - HTML files also get their clean-URL variants: /a/index.html -> /a/ and /a
//   - Hashed assets under _astro/ never change in place; they are skipped
//     unless removed (removed hashed assets don't need invalidation either).
//   - Cap: > 25 paths -> "/*" (a single wildcard invalidation is cheaper
//     than dozens of paths; first 1000 paths/month are free regardless).

import { readFileSync } from 'node:fs';

const [oldFile, newFile] = process.argv.slice(2);
if (!newFile) {
  console.error('usage: invalidation-paths.mjs <oldManifest.json|-> <newManifest.json>');
  process.exit(1);
}

if (oldFile === '-') {
  console.log('/*');
  process.exit(0);
}

const oldM = JSON.parse(readFileSync(oldFile, 'utf8'));
const newM = JSON.parse(readFileSync(newFile, 'utf8'));

const paths = new Set();

function addFor(rel) {
  paths.add('/' + rel);
  if (rel.endsWith('index.html')) {
    const dir = rel.slice(0, -'index.html'.length); // "" or "blog/"
    paths.add('/' + dir);                            // "/" or "/blog/"
    if (dir.length > 0) paths.add('/' + dir.replace(/\/$/, '')); // "/blog"
  }
}

for (const [rel, meta] of Object.entries(newM.files)) {
  if (rel.startsWith('_astro/')) continue; // content-hashed, immutable
  const prev = oldM.files[rel];
  if (prev && prev.sha256 !== meta.sha256) addFor(rel);
}
for (const rel of Object.keys(oldM.files)) {
  if (rel.startsWith('_astro/')) continue;
  if (!newM.files[rel]) addFor(rel); // removed -> purge cached copy
}

if (paths.size === 0) {
  // Nothing cached changed; still refresh the root as a safety net.
  console.log('/index.html');
  console.log('/');
  process.exit(0);
}

if (paths.size > 25) {
  console.log('/*');
} else {
  for (const p of [...paths].sort()) console.log(p);
}
