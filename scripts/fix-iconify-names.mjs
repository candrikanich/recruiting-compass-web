#!/usr/bin/env node
/**
 * Fix iconify names from the heroicons codemod where consecutive capitals
 * weren't split correctly. PascalCase → kebab missed boundaries like:
 *   XMark → xmark   (should be x-mark)
 *   XCircle → xcircle (should be x-circle)
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const REPLACEMENTS = [
  [/i-heroicons-xmark\b/g, "i-heroicons-x-mark"],
  [/i-heroicons-xcircle\b/g, "i-heroicons-x-circle"],
];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".nuxt" || entry === ".output") {
      continue;
    }
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, files);
    else if (/\.(vue|ts|tsx)$/.test(entry)) files.push(full);
  }
  return files;
}

const ROOTS = [
  "pages",
  "components",
  "composables",
  "layouts",
  "plugins",
  "middleware",
  "utils",
  "tests",
];
const files = [];
for (const root of ROOTS) {
  try {
    walk(root, files);
  } catch {
    // skip
  }
}
files.push("error.vue", "app.vue");

const changed = [];
for (const f of files) {
  let content;
  try {
    content = readFileSync(f, "utf8");
  } catch {
    continue;
  }
  let out = content;
  for (const [re, repl] of REPLACEMENTS) {
    out = out.replace(re, repl);
  }
  if (out !== content) {
    writeFileSync(f, out);
    changed.push(f);
  }
}
console.log(`Fixed ${changed.length} files`);
for (const f of changed) console.log(`  ${f}`);
