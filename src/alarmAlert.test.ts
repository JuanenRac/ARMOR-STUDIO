import { describe, expect, it } from "vitest";
import { newCriticalAlarms } from "./alarmAlert";
import type { Alarm } from "./api";

const alarm = (id: string, severity: Alarm["severity"], acknowledged = false) => ({ id, key: id, source: { type: "device", id }, severity, code: "smoke", raised_at: "x", ...(acknowledged ? { acknowledged_at: "y" } : {}) }) as Alarm;

describe("newCriticalAlarms", () => {
  it("does not announce what was there when the console opened", () => {
    const first = newCriticalAlarms(null, [alarm("a", "critical")]);
    expect(first.fresh).toEqual([]);
    expect(newCriticalAlarms(first.known, [alarm("a", "critical")]).fresh).toEqual([]);
  });
  it("announces a new critical alarm, once, and not a warning or an acknowledged one", () => {
    const known = new Set(["a"]);
    const step = newCriticalAlarms(known, [alarm("a", "critical"), alarm("b", "critical"), alarm("c", "warning"), alarm("d", "critical", true)]);
    expect(step.fresh.map(item => item.id)).toEqual(["b"]);
    expect(newCriticalAlarms(step.known, [alarm("a", "critical"), alarm("b", "critical")]).fresh).toEqual([]);
  });
});
