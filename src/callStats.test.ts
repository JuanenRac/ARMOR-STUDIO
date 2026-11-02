import { beforeEach, describe, expect, it } from "vitest";
import { callReport, clearCalls, recordCall, routeShape, summarizeCalls } from "./callStats";

describe("callStats", () => {
  beforeEach(() => clearCalls());

  it("keeps only the first four parts of a route, never a query or an id further down", () => {
    expect(routeShape("https://casa.example/api/v1/cameras/gate/snapshot?ticket=SECRET")).toBe("/api/v1/cameras/gate/…");
    expect(routeShape("/api/v1/alarms")).toBe("/api/v1/alarms");
    expect(routeShape("")).toBe("/");
  });

  it("counts calls, refusals, server errors and calls with no answer, per route", () => {
    const now = 1_000_000;
    recordCall("get", "/api/v1/state", 200, 20, now - 1000);
    recordCall("GET", "/api/v1/state", 200, 40, now - 2000);
    recordCall("GET", "/api/v1/state", 500, 90, now - 3000);
    recordCall("POST", "/api/v1/alarm/command", 403, 10, now - 4000);
    recordCall("GET", "/api/v1/alarms", 0, 8000, now - 120_000);
    const summary = summarizeCalls(now);
    expect([summary.lastMinute, summary.clientErrors, summary.serverErrors, summary.failures]).toEqual([4, 1, 1, 1]);
    expect(summary.routes[0]).toMatchObject({ route: "/api/v1/state", method: "GET", calls: 3, serverErrors: 1, avgMs: 50, maxMs: 90 });
  });

  it("forgets the oldest calls past the limit and holds nothing of the query in the report", () => {
    for (let index = 0; index < 600; index += 1) recordCall("GET", `/api/v1/x?secret=${index}`, 200, 1, index);
    expect(summarizeCalls(600).routes[0]?.calls).toBe(500);
    expect(callReport(summarizeCalls(600))).not.toContain("secret");
  });
});
