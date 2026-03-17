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
  console.error("Usage: npx tsx scripts/seed-nces-schools.ts /path/to/ccd_file.dat");
  process.exit(1);
}

// ⚠️  UPDATE THESE POSITIONS from the companion file before running
// These are placeholder column definitions — verify against your companion file
// The companion file (Documentation > DIRECTORY > Companion File) lists byte positions
const COLUMNS = {
  NCESSCH: { start: 0, length: 12 },
  SCHNAM: { start: 12, length: 60 },
  LSTATE: { start: 72, length: 2 },
  LCITY: { start: 74, length: 30 },
  LZIP: { start: 104, length: 5 },
  LATCOD: { start: 190, length: 10 },
  LONCOD: { start: 200, length: 11 },
  STATUS: { start: 220, length: 2 },
  GSHI: { start: 240, length: 2 },
};

function parseField(line: string, col: { start: number; length: number }): string {
  return line.substring(col.start, col.start + col.length).trim();
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function upsertBatch(rows: object[]): Promise<void> {
  const { error } = await supabase
    .from("nces_schools")
    .upsert(rows, { onConflict: "nces_id" });
  if (error) console.error(`Batch error (continuing): ${error.message}`);
}

async function main(): Promise<void> {
  if (!fs.existsSync(csvPath)) {
    console.error(`File not found: ${csvPath}`);
    process.exit(1);
  }

  console.log(`Reading: ${csvPath}`);

  const rl = readline.createInterface({ input: fs.createReadStream(csvPath) });
  let batch: object[] = [];
  let total = 0;
  let skipped = 0;
  let isFirstLine = true;

  for await (const line of rl) {
    // Skip header row if present
    if (isFirstLine) {
      isFirstLine = false;
      const firstField = parseField(line, COLUMNS.NCESSCH);
      if (firstField.toUpperCase() === "NCESSCH" || !/^\d/.test(firstField)) {
        console.log("Header row detected, skipping.");
        continue;
      }
    }

    const status = parseField(line, COLUMNS.STATUS);
    const gradeHigh = parseField(line, COLUMNS.GSHI);

    // Filter: operational (STATUS=1) high schools (GSHI=12)
    if (status !== "1" || gradeHigh !== "12") {
      skipped++;
      continue;
    }

    const latStr = parseField(line, COLUMNS.LATCOD);
    const lngStr = parseField(line, COLUMNS.LONCOD);
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (isNaN(lat) || isNaN(lng)) {
      console.warn(`Warning: null coordinates for NCESSCH=${parseField(line, COLUMNS.NCESSCH)}`);
    }

    batch.push({
      nces_id: parseField(line, COLUMNS.NCESSCH),
      name: parseField(line, COLUMNS.SCHNAM),
      city: parseField(line, COLUMNS.LCITY) || null,
      state: parseField(line, COLUMNS.LSTATE) || null,
      zip: parseField(line, COLUMNS.LZIP) || null,
      latitude: isNaN(lat) ? null : lat,
      longitude: isNaN(lng) ? null : lng,
    });
    total++;

    if (batch.length >= 500) {
      await upsertBatch(batch);
      process.stdout.write(`\rInserted ${total} schools...`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await upsertBatch(batch);
  }

  console.log(`\nDone.`);
  console.log(`Inserted: ${total}`);
  console.log(`Skipped:  ${skipped}`);
  console.log(
    `\nExpected ~27,000 rows. If count differs significantly, verify STATUS/GSHI column positions in COLUMNS config.`,
  );
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
