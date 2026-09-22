import http from "k6/http";
import { check, sleep } from "k6";

// Load test — see k6/README.md for target confirmation before running.
// Never point this at prod. Confirm with Chris before running against
// the shared QA/test Supabase project (E2E suite depends on it).

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
  const res = http.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    {
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
      },
    },
  );
  check(res, { "login succeeded": (r) => r.status === 200 });
  const { access_token: accessToken } = JSON.parse(res.body);
  return { accessToken };
}

export default function (data) {
  const headers = { Authorization: `Bearer ${data.accessToken}` };

  const schoolsRes = http.get(`${BASE_URL}/api/schools`, { headers });
  check(schoolsRes, { "schools 2xx/3xx": (r) => r.status < 400 });

  const schools = JSON.parse(schoolsRes.body || "[]");
  const firstId = Array.isArray(schools) ? schools[0]?.id : schools?.data?.[0]?.id;
  if (firstId) {
    const fitScoreRes = http.get(`${BASE_URL}/api/schools/${firstId}/fit-score`, { headers });
    check(fitScoreRes, { "fit-score 2xx/3xx": (r) => r.status < 400 });
  }

  sleep(1);
}
