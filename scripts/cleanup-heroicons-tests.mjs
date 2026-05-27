#!/usr/bin/env node
/**
 * Cleanup: remove @heroicons/vue references from test files.
 *
 * Components no longer use heroicons (UIcon at runtime), so test mocks are
 * dead. Strip:
 *   - import { ... } from "@heroicons/vue/24/(outline|solid)";  (multi-line)
 *   - vi.mock("@heroicons/vue/24/(outline|solid)", () => ({ ... }));
 *
 * If a test directly used the imported icon as a value (rare), replace with
 * a sentinel string. Manual review still recommended.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const IMPORT_RE =
  /import\s*\{[^}]+\}\s*from\s*["']@heroicons\/vue\/24\/(outline|solid)["'];?\s*\n?/g;

// Match: vi.mock("@heroicons/vue/24/outline", () => ({ ... }));
// Greedy across multiple lines until matching close paren and semicolon.
const VI_MOCK_RE =
  /vi\.mock\(\s*["']@heroicons\/vue\/24\/(outline|solid)["']\s*,\s*\(\)\s*=>\s*\(\{[\s\S]*?\}\)\s*\);?\s*\n?/g;

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, files);
    else if (/\.(spec|test)\.(ts|tsx)$/.test(entry)) files.push(full);
  }
  return files;
}

const files = walk("tests");
const changed = [];
for (const f of files) {
  const original = readFileSync(f, "utf8");
  if (!original.includes("@heroicons/vue")) continue;
  let out = original.replace(IMPORT_RE, "").replace(VI_MOCK_RE, "");
  out = out.replace(/\n{3,}/g, "\n\n");
  if (out !== original) {
    writeFileSync(f, out);
    changed.push(f);
  }
}
console.log(`Cleaned ${changed.length} test files`);
for (const f of changed) console.log(`  ${f}`);
