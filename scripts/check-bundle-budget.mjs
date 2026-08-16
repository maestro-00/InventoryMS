#!/usr/bin/env node
/**
 * Enforce plan.md JS transfer budgets against Vite `dist/`.
 * Budgets (compressed gzip estimate from raw file size when .gz absent):
 * - initial compressed JavaScript <= 250 KiB
 * - total initial transfer (entry JS + CSS + index.html) <= 500 KiB
 * - any lazy route chunk <= 150 KiB
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";

const DIST = path.resolve("dist");
const ASSETS = path.join(DIST, "assets");

const INITIAL_JS_BUDGET_KIB = 250;
const INITIAL_TRANSFER_BUDGET_KIB = 500;
const LAZY_CHUNK_BUDGET_KIB = 150;

function kib(bytes) {
  return bytes / 1024;
}

function gzipSize(filePath) {
  const raw = readFileSync(filePath);
  const gzPath = `${filePath}.gz`;
  if (existsSync(gzPath)) return statSync(gzPath).size;
  return gzipSync(raw).length;
}

function fail(message) {
  console.error(`bundle-budget: FAIL — ${message}`);
  process.exitCode = 1;
}

if (!existsSync(DIST) || !existsSync(ASSETS)) {
  fail("dist/assets missing; run `pnpm build` first");
  process.exit(process.exitCode ?? 1);
}

const files = readdirSync(ASSETS).map((name) => path.join(ASSETS, name));
const jsFiles = files.filter((f) => f.endsWith(".js"));
const cssFiles = files.filter((f) => f.endsWith(".css"));
const indexHtml = path.join(DIST, "index.html");

if (jsFiles.length === 0) {
  fail("no JavaScript assets found under dist/assets");
  process.exit(process.exitCode ?? 1);
}

// Vite marks the entry as index-*.js; remaining JS files are lazy chunks.
const entryCandidates = jsFiles.filter((f) => /[/\\]index-.*\.js$/.test(f));
const entryJs =
  entryCandidates[0] ?? jsFiles.sort((a, b) => gzipSize(a) - gzipSize(b))[0];
const lazyChunks = jsFiles.filter((f) => f !== entryJs);

const entryJsGzip = gzipSize(entryJs);
const cssGzip = cssFiles.reduce((sum, f) => sum + gzipSize(f), 0);
const htmlGzip = existsSync(indexHtml) ? gzipSize(indexHtml) : 0;
const initialTransfer = entryJsGzip + cssGzip + htmlGzip;

console.log("bundle-budget report");
console.log(
  `  entry JS: ${path.basename(entryJs)} ${kib(entryJsGzip).toFixed(1)} KiB gzip`,
);
console.log(`  CSS total: ${kib(cssGzip).toFixed(1)} KiB gzip`);
console.log(`  index.html: ${kib(htmlGzip).toFixed(1)} KiB gzip`);
console.log(`  initial transfer: ${kib(initialTransfer).toFixed(1)} KiB gzip`);
console.log(`  lazy chunks: ${lazyChunks.length}`);

if (kib(entryJsGzip) > INITIAL_JS_BUDGET_KIB) {
  fail(
    `initial JS ${kib(entryJsGzip).toFixed(1)} KiB exceeds ${INITIAL_JS_BUDGET_KIB} KiB`,
  );
}
if (kib(initialTransfer) > INITIAL_TRANSFER_BUDGET_KIB) {
  fail(
    `initial transfer ${kib(initialTransfer).toFixed(1)} KiB exceeds ${INITIAL_TRANSFER_BUDGET_KIB} KiB`,
  );
}

for (const chunk of lazyChunks) {
  const size = gzipSize(chunk);
  const label = path.basename(chunk);
  console.log(`  chunk ${label}: ${kib(size).toFixed(1)} KiB gzip`);
  if (kib(size) > LAZY_CHUNK_BUDGET_KIB) {
    fail(
      `lazy chunk ${label} ${kib(size).toFixed(1)} KiB exceeds ${LAZY_CHUNK_BUDGET_KIB} KiB`,
    );
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}
console.log("bundle-budget: PASS");
