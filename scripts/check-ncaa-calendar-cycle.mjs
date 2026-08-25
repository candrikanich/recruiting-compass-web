#!/usr/bin/env node
/**
 * Phase 5 — NCAA recruiting-calendar refresh checker.
 *
 * The sport calendars in utils/recruitingCalendar/ are hand-transcribed from the
 * official NCAA D1 PDFs for ONE season (see SEASON there). NCAA publishes the next
 * season's PDFs each spring/summer to the same S3 bucket. This script HEAD-checks
 * whether the NEXT season's PDFs exist yet. It does NOT parse or auto-update dates
 * (graphical PDFs; compliance-sensitive) — it only tells a human it's time to
 * re-transcribe. A scheduled routine runs it quarterly and opens a GitHub issue
 * when the next cycle appears.
 *
 * Usage: node scripts/check-ncaa-calendar-cycle.mjs [SEASON]
 *   SEASON defaults to NEXT_SEASON below. Pass e.g. "2026-27" to sanity-check the
 *   current (already-transcribed) cycle — it should report all found.
 *
 * Exit code: 0 always (a checker, not a gate). Machine-readable result on the last
 * stdout line as `RESULT: <json>` so a routine can act on it.
 */

const BUCKET =
  "https://ncaaorg.s3.amazonaws.com/compliance/recruiting/calendar";

// The season currently transcribed into utils/recruitingCalendar/. Bump when you
// re-transcribe. (Kept here rather than imported so this script stays dependency-free.)
const CURRENT_SEASON = "2026-27";
const NEXT_SEASON = "2027-28";

/** Build the D1 per-sport PDF URLs for a season. Mirrors the real NCAA filenames. */
export function d1Urls(season) {
  // Most codes follow {season}D1Rec_{CODE}RecruitingCalendar.pdf.
  const codes = [
    "MBA",
    "WSB",
    "MBB",
    "WBB",
    "XCTF",
    "WVB",
    "MGO",
    "MLA",
    "WLA",
  ];
  const urls = codes.map((code) => ({
    code,
    url: `${BUCKET}/${season}/${season}D1Rec_${code}RecruitingCalendar.pdf`,
  }));
  // Football breaks the infix mold: FBS/FCS (no MFB).
  urls.push({
    code: "FBS",
    url: `${BUCKET}/${season}/${season}D1Rec_FBSRecruitingCalendar.pdf`,
  });
  urls.push({
    code: "FCS",
    url: `${BUCKET}/${season}/${season}D1Rec_FCSRecruitingCalendar.pdf`,
  });
  // The "Other Sports" catch-all uses an EN-DASH (U+2013) in the year in the filename
  // (verified: the ASCII-hyphen variant 404s). NOTE: this one PDF also carries the
  // per-sport OTHER_* sub-calendars (soccer/swim/hockey/rowing/field-hockey/wrestling
  // AND women's gymnastics) — re-transcribing it must refresh all of them.
  const enDashSeason = season.replace("-", "–");
  urls.push({
    code: "Other",
    url: `${BUCKET}/${season}/${enDashSeason}D1Rec_OtherRecruitingCalendar.pdf`,
  });
  // D2 combined all-sports calendar.
  urls.push({
    code: "D2_ALL",
    url: `${BUCKET}/${season}/${season}D2Rec_RecruitingCalendar_AllSports.pdf`,
  });
  return urls;
}

async function headOk(url) {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "manual" });
    return res.status;
  } catch (err) {
    return `ERR:${err?.message ?? "fetch failed"}`;
  }
}

async function main() {
  const season = process.argv[2] || NEXT_SEASON;
  const targets = d1Urls(season);
  const results = await Promise.all(
    targets.map(async (t) => ({ ...t, status: await headOk(t.url) })),
  );

  const found = results.filter((r) => r.status === 200);

  console.log(`NCAA calendar cycle check — season ${season}`);
  console.log(`  transcribed season: ${CURRENT_SEASON}`);
  console.log(`  found ${found.length}/${results.length} published PDFs`);
  for (const r of results) {
    console.log(
      `   ${r.status === 200 ? "✓" : "✗"} ${r.code}  (${r.status})  ${r.url}`,
    );
  }

  const cycleAvailable = season !== CURRENT_SEASON && found.length > 0;
  if (cycleAvailable) {
    console.log(
      `\n⚠️  ${found.length} PDF(s) for ${season} are live — time to re-transcribe utils/recruitingCalendar/ and bump SEASON.`,
    );
  } else if (season === CURRENT_SEASON) {
    console.log(`\n(sanity check of the current transcribed season)`);
  } else {
    console.log(`\nNo ${season} PDFs published yet — nothing to do.`);
  }

  console.log(
    `RESULT: ${JSON.stringify({
      season,
      currentSeason: CURRENT_SEASON,
      total: results.length,
      found: found.length,
      cycleAvailable,
      foundCodes: found.map((r) => r.code),
      urls: found.map((r) => r.url),
    })}`,
  );
}

const invokedDirectly =
  process.argv[1] && process.argv[1].endsWith("check-ncaa-calendar-cycle.mjs");
if (invokedDirectly) {
  main().catch((err) => {
    console.error("check failed:", err);
    console.log(`RESULT: ${JSON.stringify({ error: String(err) })}`);
    process.exit(0);
  });
}
