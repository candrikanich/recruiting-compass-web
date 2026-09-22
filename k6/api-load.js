/* global __ENV */
import http from "k6/http";
import { check, sleep } from "k6";

// Load test — see k6/README.md for target confirmation before running.
// Never point this at prod. Confirm with Chris before running against
// the shared QA/test Supabase project (E2E suite depends on it).
//
// Only exercises GET /api/schools/:id/fit-score — school LISTS are fetched
// client-side straight from Supabase (no server collection route exists at
// GET /api/schools), so a real school id is resolved once in setup() via a
// direct, RLS-scoped Supabase REST read using the minted session's own
// access token.
//
// Auth: QA's Supabase project has Turnstile captcha enabled on the public
// password-grant endpoint (real signup/login protection — correctly not
// disabled just for this script). setup() instead uses the service-role key
// to admin-generate a magic link for the test account, then redeems it via
// /auth/v1/verify — an admin-issued-link redemption, not a public
// credentialed sign-in, so it isn't captcha-gated.

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

function parseJsonOrThrow(res, label) {
  try {
    return JSON.parse(res.body);
  } catch {
    throw new Error(`k6 setup: ${label} response was not valid JSON: ${res.body}`);
  }
}

export function setup() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("k6 setup: SUPABASE_SERVICE_ROLE_KEY is required (see k6/README.md)");
  }

  // Step 1: service-role admin-generates a magic link for the test account.
  // Not captcha-gated — this is a trusted admin action, not a public sign-in.
  const linkRes = http.post(
    `${SUPABASE_URL}/auth/v1/admin/generate_link`,
    JSON.stringify({ type: "magiclink", email: TEST_EMAIL }),
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
      `k6 setup: generate_link failed with status ${linkRes.status}: ${linkRes.body}`,
    );
  }
  const linkBody = parseJsonOrThrow(linkRes, "generate_link");
  const hashedToken = linkBody.hashed_token || linkBody.properties?.hashed_token;
  if (typeof hashedToken !== "string" || hashedToken.length === 0) {
    throw new Error(`k6 setup: generate_link response had no hashed_token: ${linkRes.body}`);
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
      `k6 setup: verify failed with status ${verifyRes.status}: ${verifyRes.body}`,
    );
  }
  const verifyBody = parseJsonOrThrow(verifyRes, "verify");
  const accessToken = verifyBody.access_token;
  if (typeof accessToken !== "string" || accessToken.length === 0) {
    throw new Error(`k6 setup: verify response had no access_token: ${verifyRes.body}`);
  }

  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
    apikey: SUPABASE_ANON_KEY,
  };

  // RLS-scoped read via the logged-in test account's own token — returns
  // only schools that account can see, same as the app's own client-side query.
  const schoolRes = http.get(`${SUPABASE_URL}/rest/v1/schools?select=id&limit=1`, {
    headers: authHeaders,
  });
  if (schoolRes.status !== 200) {
    throw new Error(
      `k6 setup: schools lookup failed with status ${schoolRes.status}: ${schoolRes.body}`,
    );
  }
  const schools = parseJsonOrThrow(schoolRes, "schools lookup");
  if (!Array.isArray(schools) || schools.length === 0) {
    throw new Error(
      "k6 setup: test account has no schools — seed at least one before running this load test",
    );
  }

  return { accessToken, schoolId: schools[0].id };
}

export default function (data) {
  const headers = { Authorization: `Bearer ${data.accessToken}` };

  const fitScoreRes = http.get(`${BASE_URL}/api/schools/${data.schoolId}/fit-score`, { headers });
  check(fitScoreRes, { "fit-score 2xx/3xx": (r) => r.status < 400 });
  sleep(1);
}
