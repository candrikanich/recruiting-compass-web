#!/usr/bin/env node
/**
 * Builds data/schoolMetadata.json (mascot + athletics URL + colors) for issue #577.
 *
 * Sources (see planning/spike-576-wikidata-school-metadata.md — Wikidata was
 * dropped for 2.4% mascot coverage):
 *   1. Wikipedia "List of NCAA Division I/II/III institutions" tables — mascot/nickname
 *   2. glidej/ncaa-team-colors (MIT) — hex colors, D1 only (~347 schools)
 *   3. data/ncaaSchools.json (already in repo) — athletics URL, 99.8% coverage
 *
 * No runtime dependency on this script — it's a one-time/occasional build step.
 * Run: node scripts/build-school-metadata.mjs
 */

import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const WIKIPEDIA_PAGES = {
  D1: "List_of_NCAA_Division_I_institutions",
  D2: "List_of_NCAA_Division_II_institutions",
  D3: "List_of_NCAA_Division_III_institutions",
};

const COLORS_URL =
  "https://raw.githubusercontent.com/glidej/ncaa-team-colors/master/ncaa-team-colors.json";

// --- Wikitext cleaning -------------------------------------------------

/** `{{sort|Key|Display}}` → `Display` (used in D2/D3 School column for alphabetization) */
function resolveSortTemplate(text) {
  return text.replace(/\{\{sort\|[^|{}]*\|([^{}]*)\}\}/gi, "$1");
}

/** Strips refs, HTML comments, and remaining templates (innermost-first, no nesting assumed) */
function stripNoise(text) {
  let out = text
    .replace(/<ref[^>]*\/>/gs, "")
    .replace(/<ref[^>]*>.*?<\/ref>/gs, "")
    .replace(/<!--.*?-->/gs, "");
  while (/\{\{[^{}]*\}\}/.test(out)) {
    out = out.replace(/\{\{[^{}]*\}\}/g, "");
  }
  return out;
}

/** `[[Target|Display]]` → `Display`, `[[Target]]` → `Target` */
function resolveWikilinks(text) {
  return text
    .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, "$2")
    .replace(/\[\[([^\]]*)\]\]/g, "$1");
}

function cleanCell(raw) {
  return resolveWikilinks(stripNoise(resolveSortTemplate(raw)))
    .replace(/\s+/g, " ")
    .trim();
}

// --- Wikipedia table parsing --------------------------------------------

async function fetchWikitext(page, attempt = 1) {
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${page}&format=json&prop=wikitext`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "recruiting-compass-web/1.0 (school-metadata-seed-build; https://github.com/candrikanich/recruiting-compass-web)",
    },
  });
  if (res.status === 429 && attempt <= 3) {
    const delay = attempt * 5000;
    console.log(
      `  429 for ${page}, retrying in ${delay}ms (attempt ${attempt})...`,
    );
    await sleep(delay);
    return fetchWikitext(page, attempt + 1);
  }
  if (!res.ok)
    throw new Error(`Wikipedia fetch failed for ${page}: ${res.status}`);
  const json = await res.json();
  if (!json.parse?.wikitext?.["*"])
    throw new Error(`No wikitext returned for ${page}`);
  return json.parse.wikitext["*"];
}

/**
 * D1 table: pipe-table, one column per line (`|Col1`, `|Col2`, ...), rows split on `|-`.
 * Columns: School, Common name, Nickname, City, State, Type, Subdivision, Primary.
 */
function parseD1Table(wikitext) {
  const results = [];
  const lines = wikitext.split("\n");
  let inTable = false;
  let columns = [];

  const flushRow = () => {
    if (columns.length >= 3) {
      const name = cleanCell(columns[0]);
      const commonName = cleanCell(columns[1]);
      const nickname = cleanCell(columns[2]);
      if (name && nickname) results.push({ name, commonName, nickname });
    }
    columns = [];
  };

  for (const line of lines) {
    if (/^\{\|\s*class="wikitable sortable"/.test(line)) {
      inTable = true;
      continue;
    }
    if (!inTable) continue;
    if (line.startsWith("|}")) {
      flushRow();
      break;
    }
    if (line.startsWith("|-")) {
      flushRow();
      continue;
    }
    if (line.startsWith("!")) continue; // header row
    if (line.startsWith("|")) {
      columns.push(line.slice(1));
    } else if (columns.length > 0) {
      // continuation of a multi-line template/refn inside the current column
      columns[columns.length - 1] += " " + line;
    }
  }
  return results;
}

/**
 * D2/D3 tables: `!scope=row| [[School]]` header cell, followed by a single
 * `||`-delimited data line whose first field is the nickname.
 */
function parseScopeRowTable(wikitext) {
  const results = [];
  const lines = wikitext.split("\n");
  let pendingSchoolRaw = null;
  let schoolBuffer = "";

  for (const line of lines) {
    const scopeMatch = line.match(/^!scope="?row"?\|(.*)$/);
    if (scopeMatch) {
      if (pendingSchoolRaw !== null && schoolBuffer) {
        // previous school had no data line captured (shouldn't normally happen)
      }
      pendingSchoolRaw = scopeMatch[1];
      schoolBuffer = pendingSchoolRaw;
      continue;
    }
    if (
      pendingSchoolRaw !== null &&
      line.startsWith("|") &&
      !line.startsWith("|-") &&
      !line.startsWith("|+")
    ) {
      const dataLine = line.slice(1);
      const firstField = dataLine.split("||")[0];
      const name = cleanCell(schoolBuffer);
      const nickname = cleanCell(firstField);
      if (name && nickname) results.push({ name, nickname });
      pendingSchoolRaw = null;
      schoolBuffer = "";
      continue;
    }
    if (pendingSchoolRaw !== null && !line.startsWith("|-")) {
      // continuation line (e.g. multi-line refn inside the school cell)
      schoolBuffer += " " + line;
    }
  }
  return results;
}

async function fetchDivision(division, page) {
  const wikitext = await fetchWikitext(page);
  const rows =
    division === "D1" ? parseD1Table(wikitext) : parseScopeRowTable(wikitext);
  return rows.map((row) => ({ ...row, division }));
}

// --- Colors dataset ------------------------------------------------------

async function fetchColors() {
  const res = await fetch(COLORS_URL);
  if (!res.ok) throw new Error(`Colors fetch failed: ${res.status}`);
  return res.json();
}

function normalizeCompact(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/** Matches a school's { name, commonName, nickname } against the colors dataset entries. */
function buildColorsIndex(colorEntries) {
  const byCompactName = new Map();
  for (const entry of colorEntries) {
    byCompactName.set(normalizeCompact(entry.name), entry.colors);
  }
  return byCompactName;
}

function findColors(colorsByCompactName, commonName, nickname) {
  const exact = colorsByCompactName.get(
    normalizeCompact(`${commonName} ${nickname}`),
  );
  if (exact) return exact;
  // fallback: some common names differ slightly from the colors dataset's school name
  // (e.g. "St." vs "Saint"); try swapping to catch the common variants.
  const variants = [
    commonName.replace(/^St\.?\s/i, "Saint "),
    commonName.replace(/^Saint\s/i, "St. "),
  ];
  for (const variant of variants) {
    const match = colorsByCompactName.get(
      normalizeCompact(`${variant} ${nickname}`),
    );
    if (match) return match;
  }
  return null;
}

// --- ncaaSchools.json cross-reference -------------------------------------

function loadNcaaSchools() {
  const raw = readFileSync(join(ROOT, "data/ncaaSchools.json"), "utf8");
  const byDivision = JSON.parse(raw); // { D1: [...], D2: [...], D3: [...] }
  const list = Object.values(byDivision).flat();
  const byExactName = new Map();
  const byCompactName = new Map();
  for (const school of list) {
    byExactName.set(school.name, school);
    byCompactName.set(normalizeCompact(school.name), school);
    byCompactName.set(
      normalizeCompact(school.name.replace(/^the\s+/i, "")),
      school,
    );
  }
  return { byExactName, byCompactName };
}

function stripLeadingThe(name) {
  return name.replace(/^the\s+/i, "");
}

function findAthleticsUrl(ncaaIndex, name) {
  const exact = ncaaIndex.byExactName.get(name);
  if (exact?.athleticWebsite) return normalizeUrl(exact.athleticWebsite);
  const fuzzy =
    ncaaIndex.byCompactName.get(normalizeCompact(name)) ??
    ncaaIndex.byCompactName.get(normalizeCompact(stripLeadingThe(name)));
  if (fuzzy?.athleticWebsite) return normalizeUrl(fuzzy.athleticWebsite);
  return null;
}

function normalizeUrl(url) {
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

// --- Main ------------------------------------------------------------------

async function main() {
  console.log("Fetching Wikipedia division tables...");
  const divisions = [];
  for (const [division, page] of Object.entries(WIKIPEDIA_PAGES)) {
    divisions.push(await fetchDivision(division, page));
    await sleep(1000); // stay under Wikipedia rate limits
  }
  const [d1, d2, d3] = divisions;
  console.log(
    `  D1: ${d1.length} schools, D2: ${d2.length} schools, D3: ${d3.length} schools`,
  );

  console.log("Fetching NCAA team colors dataset...");
  const colorEntries = await fetchColors();
  const colorsByCompactName = buildColorsIndex(colorEntries);
  console.log(`  ${colorEntries.length} color entries (D1 only)`);

  const ncaaIndex = loadNcaaSchools();

  const allRows = [...d1, ...d2, ...d3];
  const metadata = {};
  let colorMatches = 0;
  let athleticsMatches = 0;

  for (const row of allRows) {
    // D1 rows carry a separate "common name" used by the colors dataset; D2/D3 rows don't,
    // so fall back to the full school name for color lookups (mostly D1-only anyway).
    const commonName = row.commonName ?? row.name;
    const colors = findColors(colorsByCompactName, commonName, row.nickname);
    const athleticsUrl = findAthleticsUrl(ncaaIndex, row.name);

    if (colors) colorMatches++;
    if (athleticsUrl) athleticsMatches++;

    metadata[row.name] = {
      mascot: row.nickname,
      athleticsUrl,
      colors: colors ?? null,
      conferenceUrl: null, // populated by #578 (conferenceUrls.json)
      division: row.division,
    };
  }

  const outPath = join(ROOT, "data/schoolMetadata.json");
  writeFileSync(outPath, JSON.stringify(metadata, null, 2) + "\n");

  const total = Object.keys(metadata).length;
  console.log(`\nWrote ${outPath}`);
  console.log(`  ${total} schools total`);
  console.log(`  mascot: ${total}/${total} (100%, every row has a nickname)`);
  console.log(
    `  colors: ${colorMatches}/${total} (${((colorMatches / total) * 100).toFixed(1)}%)`,
  );
  console.log(
    `  athleticsUrl: ${athleticsMatches}/${total} (${((athleticsMatches / total) * 100).toFixed(1)}%)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
