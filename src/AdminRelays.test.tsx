import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adminRelays, adminSaveFile, adminSetRelay, ApiError, setAdminApproval } from "./api";
import { confirmTarget, relayReady } from "./AdminRelays";
import { locales, text } from "./i18n";

type Seen = { url: string; method: string; headers: Headers; body: Record<string, unknown> };
const seen: Seen[] = [];
let answers: Array<() => Response> = [];
const json = (status: number, body: unknown) => () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const O = "http://armor.local:18080/";

beforeEach(() => {
  seen.length = 0; answers = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit = {}) => {
    seen.push({ url, method: init.method ?? "GET", headers: new Headers(init.headers), body: init.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {} });
    const next = answers.shift();
    if (!next) throw new Error("no answer prepared");
    return next();
  }));
});
afterEach(() => { setAdminApproval(""); vi.unstubAllGlobals(); });

describe("the two switches of the broker rules", () => {
  it("need the name typed again and six digits before the change can be sent", () => {
    const battery = { kind: "battery-write", node: "solar-1", state: "on" } as const;
    const alarm = { kind: "alarm-state-relay", node: "", state: "off" } as const;
    expect(confirmTarget(battery)).toBe("solar-1");
    expect(confirmTarget(alarm)).toBe("alarm-state-relay");
    expect(relayReady(battery, "solar-1", "123456")).toBe(true);
    expect(relayReady(battery, "solar-2", "123456")).toBe(false);
    expect(relayReady(battery, "solar-1", "12345")).toBe(false);
    expect(relayReady(battery, "solar-1", "12345a")).toBe(false);
    expect(relayReady({ ...battery, node: "Bad Node" }, "Bad Node", "123456")).toBe(false);
    expect(relayReady(alarm, "alarm-state-relay", "000000")).toBe(true);
    expect(relayReady(alarm, "solar-1", "000000")).toBe(false);
  });

  it("are asked for with the two confirmations and the code of the authenticator in the header, and are read as the server says", async () => {
    answers.push(json(200, { enabled: true, installed: true, battery_write: ["solar-1"], alarm_state_relay: false, approval: "totp" }),
      json(200, { ok: true, relay: "battery-write", node: "solar-1", state: "off", battery_write: [], alarm_state_relay: false }));
    expect((await adminRelays(O)).battery_write).toEqual(["solar-1"]);
    const done = await adminSetRelay(O, "battery-write", { node: "solar-1", state: "off", confirmText: "solar-1" }, "123456");
    expect(done.battery_write).toEqual([]);
    expect(seen[1]!.url).toContain("/api/v1/admin/mqtt/relays/battery-write");
    expect(seen[1]!.headers.get("X-Armor-Maint-Totp")).toBe("123456");
    expect(seen[1]!.body).toEqual({ node: "solar-1", state: "off", confirm: true, confirm_text: "solar-1" });
  });

  it("send the code of the authenticator with the broker rules file, only once it is typed", async () => {
    answers.push(json(200, { ok: true, restarted: [], mtime: 1 }), json(200, { ok: true, restarted: [], mtime: 2 }));
    await adminSaveFile(O, "mosquitto.acl", { content: "user x\n", restart: false });
    setAdminApproval("111111");
    await adminSaveFile(O, "mosquitto.acl", { content: "user x\n", restart: false });
    setAdminApproval("12ab");                                  // not six digits: not sent
    expect(seen.map(item => item.headers.get("X-Armor-Maint-Totp"))).toEqual([null, "111111"]);
  });

  it("have a text in every language, and the refusals of the agent each have their own", async () => {
    const keys = ["adm_relays", "adm_relays_help", "adm_relays_off", "adm_relays_battery", "adm_relays_battery_help", "adm_relays_alarm", "adm_relays_alarm_help", "adm_relays_node", "adm_relays_none",
      "adm_relays_open", "adm_relays_close", "adm_relays_state_open", "adm_relays_state_closed", "adm_relays_ask_battery", "adm_relays_ask_alarm", "adm_relays_type", "adm_relays_send", "adm_relays_done",
      "adm_totp", "adm_totp_help", "adm_totp_missing", "adm_err_acl_relays_disabled", "adm_err_confirmation_required", "adm_err_confirmation_mismatch", "adm_err_totp_required", "adm_err_totp_invalid",
      "adm_err_totp_not_enrolled", "adm_err_invalid_state", "adm_err_invalid_node_id", "sec_opt_aclrelays", "sec_opt_aclrelays_help", "sec_opt_aclrelays_warn"];
    for (const locale of locales) for (const key of keys) {
      expect(text(locale, key), `${locale} ${key}`).not.toBe(key);
    }
    for (const key of ["adm_relays_ask_battery", "adm_relays_ask_alarm"]) for (const locale of locales) expect(text(locale, key), `${locale} ${key}`).toContain("{state}");
    for (const locale of locales) expect(text(locale, "adm_relays_ask_battery")).toContain("{node}");
    for (const locale of locales) expect(text(locale, "adm_relays_type")).toContain("{target}");
    answers.push(json(403, { error: "totp_invalid" }));
    await expect(adminSetRelay(O, "alarm-state-relay", { state: "on", confirmText: "alarm-state-relay" }, "000000")).rejects.toMatchObject({ code: "totp_invalid" });
    expect(ApiError).toBeDefined();
  });
});
