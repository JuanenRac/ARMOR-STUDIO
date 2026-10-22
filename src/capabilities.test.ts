import { describe, expect, it } from "vitest";
import { parseCapabilities, resolveCapabilities, type CapabilityAction } from "./capabilities";

const ACTIONS: CapabilityAction[] = ["arm", "disarm", "acknowledge", "operate", "camera_control", "administer", "manage_users", "security_settings"];
const announcement = (actions: Partial<Record<CapabilityAction, boolean>>, features: string[] = []) => ({ version: 1, actions, features, security: { "alarm.disarm_pin": "if_set", locked: [] } });

describe("what the person may do", () => {
  it("believes the server when it announces its capabilities, and allows nothing it did not name", () => {
    const parsed = parseCapabilities(announcement({ arm: true, disarm: false, acknowledge: true }, ["security_settings"]));
    const caps = resolveCapabilities("admin", parsed);
    expect(caps.announced).toBe(true);
    expect(caps.can("arm")).toBe(true);
    expect(caps.can("disarm")).toBe(false);
    expect(caps.can("administer")).toBe(false);   // an administrator by role, but the server did not say it: the server decides
    expect(caps.has("security_settings")).toBe(true);
    expect(caps.has("something_new")).toBe(false);
    expect(caps.security?.["alarm.disarm_pin"]).toBe("if_set");
  });

  it("works the capabilities out from the role for a server that announces none, exactly as before", () => {
    const allowed = (role: "admin" | "operator" | "viewer" | "panel") => ACTIONS.filter(action => resolveCapabilities(role, null).can(action));
    expect(allowed("admin")).toEqual(["arm", "disarm", "acknowledge", "operate", "camera_control", "administer", "manage_users"]);
    expect(allowed("operator")).toEqual(["arm", "disarm", "acknowledge", "operate", "camera_control"]);
    expect(allowed("viewer")).toEqual([]);
    expect(allowed("panel")).toEqual([]);
    expect(allowed("admin")).not.toContain("security_settings");   // the page for it needs a route only the new server has
    expect(resolveCapabilities("admin", null).announced).toBe(false);
    expect(resolveCapabilities("admin", null).has("security_settings")).toBe(false);
    expect(ACTIONS.filter(action => resolveCapabilities(undefined, null).can(action))).toEqual([]);
  });

  it("ignores a field that is not what this version knows", () => {
    expect(parseCapabilities(undefined)).toBeNull();
    expect(parseCapabilities("yes")).toBeNull();
    expect(parseCapabilities({ version: 2, actions: {}, features: [] })).toBeNull();
    expect(parseCapabilities({ version: 1, actions: null, features: [] })).toBeNull();
    expect(parseCapabilities({ version: 1, actions: { arm: "yes", disarm: true }, features: ["a", 3] })).toEqual({ version: 1, actions: { disarm: true }, features: ["a"], security: undefined });
  });
});
