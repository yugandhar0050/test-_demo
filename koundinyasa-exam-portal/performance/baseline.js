
import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = "https://d2ulirdq336tyh.cloudfront.net";

export const options = {
  vus: 10,
  duration: "30s",

  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<2000"],
    checks: ["rate>0.99"],
  },
};

export default function () {
  const frontend = http.get(`${BASE_URL}/`);

  check(frontend, {
    "frontend returns 200": (r) => r.status === 200,
  });

  const backend = http.get(`${BASE_URL}/api/health`);

  check(backend, {
    "backend returns 200": (r) => r.status === 200,
    "database connected": (r) =>
      r.status === 200 &&
      r.json("database") === "connected",
  });

  sleep(2);
}
