import fs from "fs";
import readline from "readline";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NUXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Usage: npx tsx scripts/seed-nces-schools.ts /path/to/ccd_file.csv");
  process.exit(1);
}

if (!fs.existsSync(csvPath)) {
  console.error(`File not found: ${csvPath}`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function upsertBatch(rows: object[]): Promise<void> {
  const { error } = await supabase
    .from("nces_schools")
    .upsert(rows, { onConflict: "nces_id" });
  if (error) console.error(`\nBatch error (continuing): ${error.message}`);
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

async function main(): Promise<void> {
  console.log(`Reading: ${csvPath}`);
  const rl = readline.createInterface({ input: fs.createReadStream(csvPath) });

  let headers: string[] = [];
  let batch: object[] = [];
  let total = 0;
  let skipped = 0;
  let isFirstLine = true;

  for await (const line of rl) {
    if (!line.trim()) continue;

    if (isFirstLine) {
      headers = parseCSVLine(line).map((h) => h.replace(/^\uFEFF/, "")); // strip BOM
      isFirstLine = false;
      console.log(`Headers detected: ${headers.length} columns`);
      // Validate required columns exist
      const required = ["NCESSCH", "SCH_NAME", "LCITY", "LSTATE", "LZIP", "SY_STATUS", "GSHI"];
      const missing = required.filter((f) => !headers.includes(f));
      if (missing.length) {
        console.error(`Missing required columns: ${missing.join(", ")}`);
        process.exit(1);
      }
      continue;
    }

    const values = parseCSVLine(line);
    const get = (col: string) => (values[headers.indexOf(col)] ?? "").trim();

    // Filter: SY_STATUS=1 (Open), GSHI=12 (offers grade 12)
    if (get("SY_STATUS") !== "1" || get("GSHI") !== "12") {
      skipped++;
      continue;
    }

    batch.push({
      nces_id:   get("NCESSCH"),
      name:      get("SCH_NAME"),
      city:      get("LCITY") || null,
      state:     get("LSTATE") || null,
      zip:       get("LZIP") || null,
      latitude:  null, // not available in 2024-25 CCD CSV
      longitude: null,
    });
    total++;

    if (batch.length >= 500) {
      await upsertBatch(batch);
      process.stdout.write(`\rInserted ${total} schools...`);
      batch = [];
    }
  }

  if (batch.length > 0) await upsertBatch(batch);

  console.log(`\nDone.`);
  console.log(`Inserted: ${total}`);
  console.log(`Skipped:  ${skipped}`);
  console.log(`\nExpected ~27,000 rows. Verify: SELECT COUNT(*) FROM nces_schools;`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
