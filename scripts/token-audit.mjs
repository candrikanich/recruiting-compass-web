#!/usr/bin/env node
/**
 * Token Audit Script
 *
 * Scans Vue and CSS files for hardcoded visual values that should use design tokens.
 * - Errors: hardcoded colors in <style> blocks or inline style attributes
 * - Warnings: hardcoded colors in <script> sections (Chart.js/canvas configs are exempt)
 *
 * Usage:
 *   node scripts/token-audit.mjs          # full scan
 *   node scripts/token-audit.mjs --errors-only  # exit 1 on errors only (CI mode)
 *
 * Suppress a specific line: add // audit-ignore at end of line
 *
 * Exit codes: 0 = clean, 1 = errors found
 */

import { readFileSync, readdirSync } from "fs";
import { join, extname, relative } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const SCAN_DIRS = ["components", "pages", "layouts", "assets/styles"];
const SKIP_ASSET_FILES = [
  "theme.css",
  "main.css",
  "theme.utilities.css",
  "transitions.css",
];

const IGNORE_PATHS = [
  "node_modules",
  ".nuxt",
  ".output",
  ".vercel",
  "coverage",
  "dist",
];

const IGNORE_COMMENT = /audit-ignore/;

// Hex color pattern (3-8 hex digits, word boundary)
const HEX_RE = /#([0-9a-fA-F]{3,8})\b/g;
// rgba/rgb pattern
const RGBA_RE = /rgba?\s*\([^)]+\)/g;

// Known token suggestions — map lowercase hex → suggestion string
const TOKEN_MAP = {
  "#f4f6fa": "--background",
  "#fafbfd": "--card",
  "#f3f3f5": "--input-background",
  "#e8edf5": "--muted",
  "#717182": "--muted-foreground",
  "#e9ebef": "--accent",
  "#030213": "--foreground or --primary",
  "#d4183d": "--destructive",
  // brand-blue
  "#eff6ff": "bg-brand-blue-50",
  "#dbeafe": "bg-brand-blue-100",
  "#bfdbfe": "bg-brand-blue-200",
  "#93c5fd": "bg-brand-blue-300",
  "#60a5fa": "bg-brand-blue-400",
  "#3b82f6": "brand-blue-500 utility or var(--color-brand-blue-500)",
  "#2563eb": "brand-blue-600 utility or var(--color-brand-blue-600)",
  "#1d4ed8": "brand-blue-700 utility or var(--color-brand-blue-700)",
  "#1e40af": "bg-brand-blue-800",
  // brand-emerald
  "#10b981": "brand-emerald-500 utility or var(--color-brand-emerald-500)",
  "#059669": "brand-emerald-600 utility or var(--color-brand-emerald-600)",
  "#047857": "brand-emerald-700 utility or var(--color-brand-emerald-700)",
  // brand-orange
  "#f97316": "brand-orange-500 utility or var(--color-brand-orange-500)",
  "#ea580c": "brand-orange-600 utility or var(--color-brand-orange-600)",
  "#f59e0b": "brand-orange-500 (amber → use orange palette)",
  // brand-purple
  "#a855f7": "brand-purple-500 utility or var(--color-brand-purple-500)",
  "#9333ea": "brand-purple-600 utility or var(--color-brand-purple-600)",
  "#8b5cf6": "brand-purple-500 (violet → use purple palette)",
  // brand-red
  "#ef4444": "brand-red-500 utility or var(--color-brand-red-500)",
  "#dc2626": "brand-red-600 utility or var(--color-brand-red-600)",
  "#b91c1c": "brand-red-700 utility or var(--color-brand-red-700)",
  // brand-slate
  "#64748b": "brand-slate-500 utility or var(--color-brand-slate-500)",
  "#475569": "brand-slate-600 utility or var(--color-brand-slate-600)",
  "#334155": "brand-slate-700 utility or var(--color-brand-slate-700)",
  "#1e293b": "brand-slate-800 utility or var(--color-brand-slate-800)",
  "#0f172a": "brand-slate-900 utility or var(--color-brand-slate-900)",
  // brand-indigo
  "#4f46e5": "brand-indigo-600 utility or var(--color-brand-indigo-600)",
  "#6366f1": "brand-indigo-500 utility or var(--color-brand-indigo-500)",
  // shadows → use tokens
  "#000": "--shadow-card or --shadow-lg (for box-shadow values)",
};

const ARGS = process.argv.slice(2);
const ERRORS_ONLY = ARGS.includes("--errors-only");

function getSuggestion(hex) {
  return TOKEN_MAP[hex.toLowerCase()] ?? null;
}

function lineNumber(content, charOffset) {
  return content.substring(0, charOffset).split("\n").length;
}

function collectFiles(dir) {
  const files = [];
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (
        IGNORE_PATHS.some(
          (p) => full.includes(`/${p}/`) || full.endsWith(`/${p}`),
        )
      )
        continue;
      if (entry.isDirectory()) {
        files.push(...collectFiles(full));
      } else if ([".vue", ".css"].includes(extname(full))) {
        files.push(full);
      }
    }
  } catch {
    // dir may not exist (e.g. layouts/)
  }
  return files;
}

function parseVueSections(content) {
  const templateMatch = content.match(/<template[^>]*>([\s\S]*?)<\/template>/);
  const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  const styleMatches = [
    ...content.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g),
  ];
  return {
    template: templateMatch
      ? {
          text: templateMatch[1],
          start: templateMatch.index,
        }
      : null,
    script: scriptMatch
      ? { text: scriptMatch[1], start: scriptMatch.index }
      : null,
    styles: styleMatches.map((m) => ({
      text: m[1],
      start: m.index,
    })),
  };
}

/**
 * Audit a single file.
 * Returns { errors, warnings } arrays of { line, value, context, suggestion }.
 */
function auditFile(filePath) {
  const content = readFileSync(filePath, "utf8");
  const isVue = extname(filePath) === ".vue";

  // Skip canonical token source files
  if (!isVue && SKIP_ASSET_FILES.some((f) => filePath.endsWith(f))) {
    return { errors: [], warnings: [] };
  }

  const errors = [];
  const warnings = [];

  function addError(lineNum, value, context, suggestion) {
    errors.push({ line: lineNum, value, context, suggestion });
  }

  function addWarning(lineNum, value, context, suggestion) {
    warnings.push({ line: lineNum, value, context, suggestion });
  }

  function scanForHex(text, startLine, isError, context) {
    const lines = text.split("\n");
    lines.forEach((line, i) => {
      if (IGNORE_COMMENT.test(line)) return;
      for (const m of line.matchAll(HEX_RE)) {
        const hex = `#${m[1]}`;
        const suggestion =
          getSuggestion(hex) ??
          (isError
            ? "use a CSS variable from theme.css or brand palette token"
            : "if in canvas/chart config, add // audit-ignore to suppress");
        if (isError) {
          addError(startLine + i, hex, context, suggestion);
        } else {
          addWarning(startLine + i, hex, context, suggestion);
        }
      }
    });
  }

  function scanRgbaInStyle(text, startLine) {
    const lines = text.split("\n");
    lines.forEach((line, i) => {
      if (IGNORE_COMMENT.test(line)) return;
      for (const m of line.matchAll(RGBA_RE)) {
        const val = m[0];
        // Skip fully-transparent rgba which is a common utility
        if (/rgba\s*\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/.test(val)) continue;
        addError(
          startLine + i,
          val,
          "style block",
          "--shadow-card, --shadow-lg, or --border token",
        );
      }
    });
  }

  if (isVue) {
    const { template, script, styles } = parseVueSections(content);

    // <style> blocks → errors
    for (const style of styles) {
      const startLine = lineNumber(content, style.start);
      scanForHex(style.text, startLine, true, "<style> block");
      scanRgbaInStyle(style.text, startLine);
    }

    // <template> inline style attributes → errors
    if (template) {
      const startLine = lineNumber(content, template.start);
      const lines = template.text.split("\n");
      lines.forEach((line, i) => {
        if (IGNORE_COMMENT.test(line)) return;
        if (!line.includes("style=")) return;
        for (const m of line.matchAll(HEX_RE)) {
          const hex = `#${m[1]}`;
          addError(
            startLine + i,
            hex,
            "inline style attribute",
            getSuggestion(hex) ?? "use a CSS variable from theme.css",
          );
        }
        for (const m of line.matchAll(RGBA_RE)) {
          addError(
            startLine + i,
            m[0],
            "inline style attribute",
            "--shadow-* or --border token",
          );
        }
      });
    }

    // <script> → warnings (Chart.js and canvas configs require raw hex)
    if (script) {
      const startLine = lineNumber(content, script.start);
      scanForHex(
        script.text,
        startLine,
        false,
        "<script> (chart/canvas config?)",
      );
    }
  } else {
    // Plain CSS — all hardcoded hex is an error
    const lines = content.split("\n");
    lines.forEach((line, i) => {
      if (IGNORE_COMMENT.test(line)) return;
      for (const m of line.matchAll(HEX_RE)) {
        const hex = `#${m[1]}`;
        addError(
          i + 1,
          hex,
          "CSS file",
          getSuggestion(hex) ?? "use a CSS variable from theme.css",
        );
      }
      for (const m of line.matchAll(RGBA_RE)) {
        if (/rgba\s*\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/.test(m[0])) continue;
        addError(
          i + 1,
          m[0],
          "CSS file",
          "--shadow-card, --shadow-lg, or --border token",
        );
      }
    });
  }

  return { errors, warnings };
}

// ─── Main ────────────────────────────────────────────────────────────────────

let totalErrors = 0;
let totalWarnings = 0;
let filesWithErrors = 0;
let filesWithWarnings = 0;
let totalScanned = 0;

const allFiles = SCAN_DIRS.flatMap((d) => collectFiles(join(ROOT, d)));
totalScanned = allFiles.length;

console.log(`\nToken Audit`);
console.log(`Scanning ${totalScanned} file(s)...\n`);

for (const file of allFiles) {
  const { errors, warnings } = auditFile(file);
  if (errors.length === 0 && warnings.length === 0) continue;

  const relPath = relative(ROOT, file);
  console.log(relPath);

  for (const e of errors) {
    console.log(`  ✗ L${e.line}: [${e.context}] ${e.value}`);
    console.log(`    → use: ${e.suggestion}`);
  }

  if (!ERRORS_ONLY) {
    for (const w of warnings) {
      console.log(`  ! L${w.line}: [${w.context}] ${w.value}`);
      console.log(`    → ${w.suggestion}`);
    }
  }

  console.log();

  if (errors.length > 0) filesWithErrors++;
  if (warnings.length > 0) filesWithWarnings++;
  totalErrors += errors.length;
  totalWarnings += warnings.length;
}

console.log(`=== Summary ===`);
console.log(`Files scanned:        ${totalScanned}`);
console.log(`Files with errors:    ${filesWithErrors}`);
if (!ERRORS_ONLY) {
  console.log(`Files with warnings:  ${filesWithWarnings}`);
}
console.log(`Errors:               ${totalErrors}`);
if (!ERRORS_ONLY) {
  console.log(
    `Warnings:             ${totalWarnings} (chart/canvas configs — review manually)`,
  );
}
console.log();

if (totalErrors > 0) {
  console.log(
    `❌ ${totalErrors} error(s) found — hardcoded values in style blocks or inline styles.`,
  );
  console.log(
    `   Fix by replacing with CSS variables or Tailwind brand utilities.`,
  );
  console.log(
    `   Suppress intentional exceptions with // audit-ignore at end of line.`,
  );
  process.exit(1);
} else if (!ERRORS_ONLY && totalWarnings > 0) {
  console.log(
    `⚠️  ${totalWarnings} warning(s) in script sections — review chart/canvas configs.`,
  );
  process.exit(0);
} else {
  console.log(`✅ No violations found.`);
  process.exit(0);
}
