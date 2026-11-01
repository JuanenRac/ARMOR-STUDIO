import { describe, expect, it } from "vitest";
import raw from "./ux.config.json";
import { UX } from "./config";
import { DEFAULT_PREFS } from "../prefs";

describe("the configuration file of the small checks", () => {
  it("has the schema and values inside the safe bounds", () => {
    expect(raw.schema).toBe("armor-studio/ux-config/1");
    expect(UX.credentials.passwordMinimumFloor).toBeGreaterThanOrEqual(8);
    expect(UX.credentials.passwordMinimumFallback).toBeGreaterThanOrEqual(UX.credentials.passwordMinimumFloor);
    expect(UX.credentials.pinMinDigits).toBeGreaterThanOrEqual(4);
    expect(UX.credentials.pinMaxDigits).toBeGreaterThanOrEqual(UX.credentials.pinMinDigits);
    expect(UX.shortcuts.help).toHaveLength(1);
    expect(UX.shortcuts.sidebar).toHaveLength(1);
    expect(UX.unloadGuard.statuses).toContain("saving");
  });

  it("the defaults it gives to the preferences are the conservative ones: warn only, shortcuts on", () => {
    expect(DEFAULT_PREFS.refuseRemoteHttp).toBe(false);
    expect(DEFAULT_PREFS.shortcuts).toBe(true);
  });
});
