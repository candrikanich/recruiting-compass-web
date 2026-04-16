#!/usr/bin/env node
/**
 * Bundle Size Tracker
 *
 * Measures Nuxt client-side bundle output and optionally compares to a stored baseline.
 * Exits with code 1 if total gzip size grows more than THRESHOLD% vs baseline.
 *
 * Usage:
 *   node scripts/bundle-size.mjs           # report sizes only (no comparison)
 *   node scripts/bundle-size.mjs check     # compare to baseline, fail if >10% growth
 *   node scripts/bundle-size.mjs update    # write current sizes as new baseline
 *
 * npm scripts (defined in package.json):
 *   npm run bundle:check   →  build first, then check
 *   npm run bundle:update  →  build first, then update baseline
 *
 * Baseline file: scripts/bundle-size-baseline.json  (committed to git)
 * Build output:  .output/public/_nuxt/              (gitignored, produced by npm run build)
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, extname, dirname } from "path";
import { fileURLToPath } from "url";
import { gzipSync } from "zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const THRESHOLD = 0.1; // 10% — fail CI if total gzip grows more than this
const NUXT_OUTPUT_DIR = join(ROOT, ".output", "public", "_nuxt");
const BASELINE_FILE = join(__dirname, "bundle-size-baseline.json");

// ─── Measurement ───────────────────────────────────────────────────────────

function measureOutputDir() {
  if (!existsSync(NUXT_OUTPUT_DIR)) {
    console.error(
      `\nBuild output not found at .output/public/_nuxt/\nRun 'npm run build' first.\n`,
    );
    process.exit(1);
  }

  const files = readdirSync(NUXT_OUTPUT_DIR);
  let js = 0,
    jsGz = 0,
    css = 0,
    cssGz = 0;
  const chunks = [];

  for (const file of files) {
    const ext = extname(file).toLowerCase();
    if (ext !== ".js" && ext !== ".css") continue;

    const filePath = join(NUXT_OUTPUT_DIR, file);
    const raw = statSync(filePath).size;
    const gz = gzipSync(readFileSync(filePath)).length;

    chunks.push({ file, ext, raw, gz });

    if (ext === ".js") {
      js += raw;
      jsGz += gz;
    } else {
      css += raw;
      cssGz += gz;
    }
  }

  return { js, jsGz, css, cssGz, total: js + css, totalGz: jsGz + cssGz, chunks };
}

// ─── Formatting ────────────────────────────────────────────────────────────

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function pctChange(current, baseline) {
  if (!baseline) return "N/A";
  const pct = ((current - baseline) / baseline) * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function colorize(text, pct) {
  if (pct > THRESHOLD * 100) return `\x1b[31m${text}\x1b[0m`; // red
  if (pct > 0) return `\x1b[33m${text}\x1b[0m`; // yellow
  return `\x1b[32m${text}\x1b[0m`; // green
}

// ─── Commands ──────────────────────────────────────────────────────────────

function report(sizes) {
  console.log("\n=== Bundle Size Report ===");
  console.log(`JS:    ${kb(sizes.js)} raw  /  ${kb(sizes.jsGz)} gzip`);
  console.log(`CSS:   ${kb(sizes.css)} raw  /  ${kb(sizes.cssGz)} gzip`);
  console.log(`Total: ${kb(sizes.total)} raw  /  ${kb(sizes.totalGz)} gzip`);
  console.log(`Chunks: ${sizes.chunks.length} files\n`);
}

function check(sizes) {
  report(sizes);

  if (!existsSync(BASELINE_FILE)) {
    console.log(
      `No baseline found. Run 'npm run bundle:update' after a clean build on main to create one.\n`,
    );
    return;
  }

  const baseline = JSON.parse(readFileSync(BASELINE_FILE, "utf-8"));

  const jsChange = (sizes.jsGz - baseline.jsGz) / baseline.jsGz;
  const cssChange =
    baseline.cssGz > 0 ? (sizes.cssGz - baseline.cssGz) / baseline.cssGz : 0;
  const totalChange = (sizes.totalGz - baseline.totalGz) / baseline.totalGz;

  console.log("=== vs Baseline ===");
  console.log(`Baseline recorded: ${baseline.recordedAt}`);
  console.log(
    `JS   gzip: ${kb(sizes.jsGz)}  (${pctChange(sizes.jsGz, baseline.jsGz)})`,
  );
  console.log(
    `CSS  gzip: ${kb(sizes.cssGz)}  (${pctChange(sizes.cssGz, baseline.cssGz)})`,
  );

  const totalPct = totalChange * 100;
  const changeLabel = pctChange(sizes.totalGz, baseline.totalGz);

  console.log(
    `Total gzip: ${kb(sizes.totalGz)}  ${colorize(changeLabel, totalPct)}  (baseline: ${kb(baseline.totalGz)})\n`,
  );

  if (totalChange > THRESHOLD) {
    console.error(
      `\x1b[31mFAIL: Total bundle grew ${totalPct.toFixed(1)}% — exceeds ${THRESHOLD * 100}% threshold.\x1b[0m`,
    );
    console.error(
      `      Baseline: ${kb(baseline.totalGz)}, Current: ${kb(sizes.totalGz)}\n`,
    );
    console.error(
      `      If this growth is intentional, update the baseline on main:\n      npm run bundle:update\n`,
    );
    process.exit(1);
  }

  if (totalChange > 0) {
    console.log(
      `\x1b[33mPASS: Bundle grew ${totalPct.toFixed(1)}% — within the ${THRESHOLD * 100}% limit.\x1b[0m\n`,
    );
  } else {
    console.log(
      `\x1b[32mPASS: Bundle ${totalChange < 0 ? "shrunk" : "unchanged"} (${changeLabel}).\x1b[0m\n`,
    );
  }
}

function update(sizes) {
  report(sizes);

  const baseline = {
    js: sizes.js,
    jsGz: sizes.jsGz,
    css: sizes.css,
    cssGz: sizes.cssGz,
    total: sizes.total,
    totalGz: sizes.totalGz,
    chunkCount: sizes.chunks.length,
    recordedAt: new Date().toISOString(),
  };

  writeFileSync(BASELINE_FILE, JSON.stringify(baseline, null, 2) + "\n");
  console.log(`Baseline written to scripts/bundle-size-baseline.json`);
  console.log(
    `  Total gzip: ${kb(sizes.totalGz)} across ${sizes.chunks.length} chunks\n`,
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────

const command = process.argv[2] ?? "report";
const sizes = measureOutputDir();

if (command === "update") {
  update(sizes);
} else if (command === "check") {
  check(sizes);
} else {
  report(sizes);
}
