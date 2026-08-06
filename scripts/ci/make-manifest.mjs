#!/usr/bin/env node
// Generate an artifact manifest for a built site directory.
// Usage: node scripts/ci/make-manifest.mjs <distDir> <outFile>
// Output JSON: { generated, commit, ref, fileCount, totalBytes, files: { "<path>": { sha256, size } } }
// No dependencies — Node 18+ builtins only.

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const [distDir, outFile] = process.argv.slice(2);
if (!distDir || !outFile) {
  console.error('usage: make-manifest.mjs <distDir> <outFile>');
  process.exit(1);
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

const files = {};
let totalBytes = 0;
for (const full of walk(distDir).sort()) {
  const rel = relative(distDir, full).split(sep).join('/');
  const buf = readFileSync(full);
  const size = statSync(full).size;
  totalBytes += size;
  files[rel] = { sha256: createHash('sha256').update(buf).digest('hex'), size };
}

const manifest = {
  generated: new Date().toISOString(),
  commit: process.env.GITHUB_SHA || 'unknown',
  ref: process.env.GITHUB_REF_NAME || 'unknown',
  fileCount: Object.keys(files).length,
  totalBytes,
  files,
};

writeFileSync(outFile, JSON.stringify(manifest, null, 2));
console.log(`manifest: ${manifest.fileCount} files, ${totalBytes} bytes -> ${outFile}`);
