/* global __ENV */
import http from "k6/http";
import { check } from "k6";

// Load test — see k6/README.md for target confirmation before running.
// Never point this at prod. Confirm with Chris before running against
// the shared QA/test Supabase project (E2E suite depends on it).
//
// Only exercises GET /api/schools/:id/fit-score — school LISTS are fetched
// client-side straight from Supabase (no server collection route exists at
// GET /api/schools), so a real school id is resolved once in setup() via a
// direct, RLS-scoped Supabase REST read using the logged-in test account's
// own access token.

export const options = {
  stages: [
    { duration: "1m", target: 10 },
    { duration: "2m", target: 100 },
    { duration: "2m", target: 500 },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"],
    http_req_failed: ["rate<0.05"],
  },
};

const BASE_URL = __ENV.BASE_URL;
const SUPABASE_URL = __ENV.SUPABASE_URL;
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY;
const TEST_EMAIL = __ENV.TEST_EMAIL;
const TEST_PASSWORD = __ENV.TEST_PASSWORD;

export function setup() {
  const loginRes = http.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    {
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
      },
    },
  );
  if (loginRes.status !== 200) {
    throw new Error(
      `k6 setup: login failed with status ${loginRes.status}: ${loginRes.body}`,
    );
  }

  let accessToken;
  try {
    accessToken = JSON.parse(loginRes.body).access_token;
  } catch {
    throw new Error(`k6 setup: login response was not valid JSON: ${loginRes.body}`);
  }
  if (typeof accessToken !== "string" || accessToken.length === 0) {
    throw new Error(`k6 setup: login response had no access_token: ${loginRes.body}`);
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
  const schools = JSON.parse(schoolRes.body);
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
}
