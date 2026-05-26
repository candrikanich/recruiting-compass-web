#!/usr/bin/env node
/**
 * Codemod: @heroicons/vue → <UIcon name="i-heroicons-*">
 *
 * Transforms:
 *   import { XMarkIcon } from "@heroicons/vue/24/outline"
 *   <XMarkIcon class="..." /> → <UIcon name="i-heroicons-x-mark" class="..." />
 *   <XMarkIcon class="..." />  (solid)  → name="i-heroicons-x-mark-solid"
 *
 * Component-ref usages (:icon="XIcon", icon: XIcon) → string form
 * with iconify name. Consumer components must be updated to render UIcon
 * from the string.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const VARIANT_SUFFIX = { outline: "", solid: "-solid" };

function toKebab(pascal) {
  return pascal
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/([a-zA-Z])(\d)/g, "$1-$2")
    .replace(/(\d)([A-Z])/g, "$1-$2")
    .toLowerCase();
}

function iconifyName(pascalName, variant) {
  const base = pascalName.replace(/Icon$/, "");
  return `i-heroicons-${toKebab(base)}${VARIANT_SUFFIX[variant]}`;
}

const IMPORT_RE =
  /import\s*\{([^}]+)\}\s*from\s*["']@heroicons\/vue\/24\/(outline|solid)["'];?\s*\n?/g;

function buildIconMap(content) {
  const map = new Map();
  let m;
  IMPORT_RE.lastIndex = 0;
  while ((m = IMPORT_RE.exec(content)) !== null) {
    const variant = m[2];
    const names = m[1]
      .split(",")
      .map((s) => s.trim().replace(/\s+as\s+\w+/, ""))
      .filter(Boolean);
    for (const name of names) {
      if (!map.has(name)) map.set(name, iconifyName(name, variant));
    }
  }
  return map;
}

function stripImports(content) {
  return content.replace(IMPORT_RE, "");
}

function replaceJsxUsages(content, map) {
  let out = content;
  for (const [name, iconName] of map) {
    const selfClose = new RegExp(`<${name}(\\s[^>]*)?/>`, "g");
    out = out.replace(selfClose, (_match, attrs = "") => {
      return `<UIcon name="${iconName}"${attrs || ""} />`;
    });
    const openTag = new RegExp(`<${name}(\\s[^>]*)?>`, "g");
    out = out.replace(openTag, (_match, attrs = "") => {
      return `<UIcon name="${iconName}"${attrs || ""}>`;
    });
    const closeTag = new RegExp(`</${name}>`, "g");
    out = out.replace(closeTag, `</UIcon>`);
  }
  return out;
}

function replacePropRefs(content, map) {
  let out = content;
  for (const [name, iconName] of map) {
    const propBind = new RegExp(`:icon="${name}"`, "g");
    out = out.replace(propBind, `icon="${iconName}"`);
    const dataObj = new RegExp(`\\bicon:\\s*${name}\\b`, "g");
    out = out.replace(dataObj, `icon: "${iconName}"`);
  }
  return out;
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".nuxt" || entry === ".output") {
      continue;
    }
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, files);
    } else if (/\.(vue|ts)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

function processFile(path) {
  const original = readFileSync(path, "utf8");
  if (!original.includes("@heroicons/vue")) return null;
  const map = buildIconMap(original);
  if (map.size === 0) return null;
  let out = replaceJsxUsages(original, map);
  out = replacePropRefs(out, map);
  out = stripImports(out);
  out = out.replace(/\n{3,}/g, "\n\n");
  if (out === original) return null;
  writeFileSync(path, out);
  return { path, icons: map.size };
}

const ROOTS = [
  "pages",
  "components",
  "composables",
  "layouts",
  "plugins",
  "middleware",
];
const files = [];
for (const root of ROOTS) {
  try {
    walk(root, files);
  } catch {
    // root may not exist
  }
}

const results = [];
for (const f of files) {
  const r = processFile(f);
  if (r) results.push(r);
}

console.log(`Processed ${results.length} files`);
for (const r of results) console.log(`  ${r.path}  (${r.icons} icons)`);
