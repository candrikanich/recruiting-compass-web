#!/usr/bin/env node
/**
 * Fetches all NCAA member institutions from the NCAA directory API and writes
 * them to data/ncaaSchools.json in the format: { D1: [...], D2: [...], D3: [...] }
 *
 * Each entry: { name: string, conference: string, website: string }
 *
 * Usage: node scripts/fetch-ncaa-schools.mjs
 */

import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, "../data/ncaaSchools.json");
const NCAA_API =
  "https://web3.ncaa.org/directory/api/directory/memberList?type=12";

console.log("Fetching NCAA member list...");
const response = await fetch(NCAA_API);

if (!response.ok) {
  throw new Error(`NCAA API returned ${response.status}: ${response.statusText}`);
}

const members = await response.json();
console.log(`Received ${members.length} total members`);

const divisionMap = { 1: "D1", 2: "D2", 3: "D3" };

const result = { D1: [], D2: [], D3: [] };

for (const member of members) {
  // Skip inactive/provisional members
  if (member.deactive === "Y" || member.provisionalMember) continue;

  const divKey = divisionMap[member.division];
  if (!divKey) continue; // skip associate members or unknown divisions

  const website = member.webSiteUrl
    ? member.webSiteUrl.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "").toLowerCase()
    : null;

  const athleticWebsite = member.athleticWebUrl
    ? member.athleticWebUrl.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "").toLowerCase()
    : null;

  const addr = member.memberOrgAddress ?? {};

  result[divKey].push({
    name: member.nameOfficial,
    conference: member.conferenceName ?? null,
    ...(website ? { website } : {}),
    ...(athleticWebsite ? { athleticWebsite } : {}),
    ...(member.nickname ? { nickname: member.nickname } : {}),
    ...(addr.city ? { city: addr.city } : {}),
    ...(addr.state ? { state: addr.state } : {}),
    ...(member.hex1 ? { colors: [member.hex1, member.hex2, member.hex3].filter(Boolean) } : {}),
  });
}

// Sort alphabetically within each division
for (const key of Object.keys(result)) {
  result[key].sort((a, b) => a.name.localeCompare(b.name));
}

console.log(`D1: ${result.D1.length} schools`);
console.log(`D2: ${result.D2.length} schools`);
console.log(`D3: ${result.D3.length} schools`);
console.log(`Total: ${result.D1.length + result.D2.length + result.D3.length} schools`);

writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));
console.log(`Written to ${OUTPUT_PATH}`);
