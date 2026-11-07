
import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = "https://d2ulirdq336tyh.cloudfront.net";

export const options = {
  scenarios: {
    students: {
      executor: "ramping-vus",
      startVUs: 0,
      gracefulRampDown: "15s",
      stages: [
        { duration: "1m", target: 10 },
        { duration: "1m", target: 50 },
        { duration: "1m", target: 100 },
        { duration: "1m", target: 250 },
        { duration: "2m", target: 500 },
        { duration: "1m", target: 500 },
        { duration: "1m", target: 0 },
      ],
    },
  },

  thresholds: {
    http_req_failed: [
      {
        threshold: "rate<0.01",
        abortOnFail: true,
        delayAbortEval: "1m",
      },
    ],
    http_req_duration: [
      {
        threshold: "p(95)<2000",
        abortOnFail: true,
        delayAbortEval: "1m",
      },
    ],
    checks: ["rate>0.99"],
  },
};

export default function () {
  const response = http.get(`${BASE_URL}/api/health`, {
    timeout: "10s",
    tags: { endpoint: "health" },
  });

  check(response, {
    "API is healthy": (r) => r.status === 200,
    "Database connected": (r) =>
      r.status === 200 &&
      r.json("database") === "connected",
  });

  // Each virtual user waits between checks.
  sleep(20);
}
