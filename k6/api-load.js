/* global __ENV, __VU */
import http from "k6/http";
import { check, sleep } from "k6";

// Load test — see k6/README.md for target confirmation before running.
// Never point this at prod. Confirm with Chris before running against
// the shared QA/test Supabase project (E2E suite depends on it).
//
// Exercises GET /api/schools/recommendations — real query weight
// (assembleSchoolRecommendations), currently wired into the schools-page
// empty state, no side effects. Originally targeted GET
// /api/schools/:id/fit-score, discovered 2026-09-22 to be dead/orphaned
// code (hardcodes `fitScore: null`, no frontend caller — the app now
// computes fit signals client-side via composables/useFitScore.ts). See
// k6/findings.md and the dead-code cleanup issue it links.
//
// Note: this endpoint is Redis-cached per athlete for 2 minutes
// (server/api/schools/recommendations.get.ts) — repeated calls from the
// same test account within that window hit cache, not real DB work. Keep
// this in mind when reading results; it isn't a pure DB-capacity signal
// either.
//
// Auth: QA's Supabase project has Turnstile captcha enabled on the public
// password-grant endpoint (real signup/login protection — correctly not
// disabled just for this script). setup() instead uses the service-role key
// to admin-generate a magic link for the test account, then redeems it via
// /auth/v1/verify — an admin-issued-link redemption, not a public
// credentialed sign-in, so it isn't captcha-gated.
//
// Account pool (#970): runs 2 and 3 (2026-09-22) both showed ~94% failure
// against server/middleware/rate-limit.ts's 60 req/min-per-(user,path)
// bucket — every VU shared ONE token, so all traffic collapsed onto a
// single rate-limit key regardless of which endpoint was under test.
// setup() now mints a token per pool account (TEST_EMAIL plus
// TEST_EMAIL_POOL_SIZE - 1 numbered siblings, e.g. k6-load-test-1@...) and
// each VU picks one via __VU % pool.length, spreading load across
// distinct rate-limit keys so the test can finally measure real
// application/DB capacity instead of the limiter's own ceiling.

// Ramp capped at 50 VUs + 1s sleep per iteration (~≤50 req/s from one source
// IP). A 2026-09-22 run at 10→100→500 VUs with no sleep tripped Vercel's
// built-in system DDoS mitigation on QA within ~90s — it auto-denied the
// test machine's IP (self-expired ~15min later), well before the app or
// Supabase ever showed real strain. See k6/findings.md. Raise this profile
// only a step at a time, watching the Vercel Firewall dashboard live.
export const options = {
  stages: [
    { duration: "1m", target: 5 },
    { duration: "2m", target: 20 },
    { duration: "2m", target: 50 },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"],
    http_req_failed: ["rate<0.05"],
  },
};

// Reuses the app's own env var names (from the repo's single root .env) —
// SUPABASE_SERVICE_ROLE_KEY is already there for other tooling; only
// BASE_URL and TEST_EMAIL are k6-specific additions. See k6/README.md.
const BASE_URL = __ENV.BASE_URL;
const SUPABASE_URL = __ENV.NUXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = __ENV.NUXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = __ENV.SUPABASE_SERVICE_ROLE_KEY;
const TEST_EMAIL = __ENV.TEST_EMAIL;
// Pool size 1 = old single-token behavior (still useful for smoke-checking
// the endpoint itself, just not for real load numbers). Default 5 matches
// the accounts seeded for #970 (k6-load-test@example.com plus
// k6-load-test-1..4@example.com).
const POOL_SIZE = parseInt(__ENV.TEST_EMAIL_POOL_SIZE || "5", 10);

function poolEmail(index) {
  if (index === 0) return TEST_EMAIL;
  const atIndex = TEST_EMAIL.indexOf("@");
  return `${TEST_EMAIL.slice(0, atIndex)}-${index}${TEST_EMAIL.slice(atIndex)}`;
}

function parseJsonOrThrow(res, label) {
  try {
    return JSON.parse(res.body);
  } catch {
    throw new Error(`k6 setup: ${label} response was not valid JSON: ${res.body}`);
  }
}

function mintAccessToken(email) {
  // Step 1: service-role admin-generates a magic link for the account. Not
  // captcha-gated — this is a trusted admin action, not a public sign-in.
  const linkRes = http.post(
    `${SUPABASE_URL}/auth/v1/admin/generate_link`,
    JSON.stringify({ type: "magiclink", email }),
    {
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    },
  );
  if (linkRes.status !== 200) {
    throw new Error(
      `k6 setup: generate_link for ${email} failed with status ${linkRes.status}: ${linkRes.body}`,
    );
  }
  const linkBody = parseJsonOrThrow(linkRes, `generate_link (${email})`);
  const hashedToken = linkBody.hashed_token || linkBody.properties?.hashed_token;
  if (typeof hashedToken !== "string" || hashedToken.length === 0) {
    throw new Error(`k6 setup: generate_link response for ${email} had no hashed_token: ${linkRes.body}`);
  }

  // Step 2: redeem the admin-issued link into a real session. This hits the
  // OTP-verification endpoint, not the password-grant endpoint, so captcha
  // protection on the latter doesn't apply here.
  const verifyRes = http.post(
    `${SUPABASE_URL}/auth/v1/verify`,
    // token_hash (not token) + no email — GoTrue rejects the hashed-token
    // form if email is present ("Only the token_hash and type should be
    // provided"), confirmed against a live run 2026-09-22.
    JSON.stringify({ type: "magiclink", token_hash: hashedToken }),
    {
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
      },
    },
  );
  if (verifyRes.status !== 200) {
    throw new Error(
      `k6 setup: verify for ${email} failed with status ${verifyRes.status}: ${verifyRes.body}`,
    );
  }
  const verifyBody = parseJsonOrThrow(verifyRes, `verify (${email})`);
  const accessToken = verifyBody.access_token;
  if (typeof accessToken !== "string" || accessToken.length === 0) {
    throw new Error(`k6 setup: verify response for ${email} had no access_token: ${verifyRes.body}`);
  }
  return accessToken;
}

export function setup() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("k6 setup: SUPABASE_SERVICE_ROLE_KEY is required (see k6/README.md)");
  }

  const accessTokens = [];
  for (let i = 0; i < POOL_SIZE; i++) {
    accessTokens.push(mintAccessToken(poolEmail(i)));
  }

  return { accessTokens };
}

export default function (data) {
  const token = data.accessTokens[__VU % data.accessTokens.length];
  const headers = { Authorization: `Bearer ${token}` };

  const res = http.get(`${BASE_URL}/api/schools/recommendations`, { headers });
  check(res, { "recommendations 2xx/3xx": (r) => r.status < 400 });
  sleep(1);
}
