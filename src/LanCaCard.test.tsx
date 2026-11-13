import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LAN_CA_WORD, lanCaAddressOk, lanCaReady } from "./LanCaCard";
import { adminLanCa, adminLanCaOrder } from "./api";
import { locales, text } from "./i18n";

const O = "http://127.0.0.1:8080";
const seen: Array<{ url: string; method: string; headers: Headers; body: unknown }> = [];
const answers: Response[] = [];
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  seen.length = 0; answers.length = 0;
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    seen.push({ url: String(input), method: init?.method ?? "GET", headers: new Headers(init?.headers), body: init?.body ? JSON.parse(String(init.body)) : undefined });
    return answers.shift() ?? json(500, { error: "none" });
  }));
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("the order of the local authority of the LAN", () => {
  it("needs a well formed address, the word typed again and six digits before it can be sent", () => {
    expect(LAN_CA_WORD).toBe("lan-ca");
    expect(lanCaAddressOk("192.168.0.180")).toBe(true);
    for (const bad of ["", "192.168.0", "192.168.0.256", "a.b.c.d", "192.168.0.1; id", "::1"]) expect(lanCaAddressOk(bad), bad).toBe(false);
    expect(lanCaReady("192.168.0.180", "lan-ca", "123456")).toBe(true);
    expect(lanCaReady("192.168.0.180", "lan-ca", "12345")).toBe(false);
    expect(lanCaReady("192.168.0.180", "lan_ca", "123456")).toBe(false);
    expect(lanCaReady("300.1.1.1", "lan-ca", "123456")).toBe(false);
  });

  it("reads the state, with the ones near their end, and sends the order with the code in the header", async () => {
    answers.push(json(200, { enabled: true, installed: true, authority: { days_left: 3000, sha256: "AA" }, certificate: { days_left: 12, sha256: "BB" }, renew_days: 30, expiring: ["certificate"], approval: "totp" }), json(200, { ok: true, action: "rotate", devices_must_reinstall: true, enabled: true }));
    expect((await adminLanCa(O)).expiring).toEqual(["certificate"]);
    const done = await adminLanCaOrder(O, { action: "rotate", ip: "192.168.0.180", confirmText: "lan-ca" }, "123456");
    expect(done.devices_must_reinstall).toBe(true);
    expect(seen[1]!.url).toContain("/api/v1/admin/lan-ca");
    expect(seen[1]!.method).toBe("POST");
    expect(seen[1]!.headers.get("X-Armor-Maint-Totp")).toBe("123456");
    expect(seen[1]!.body).toEqual({ action: "rotate", ip: "192.168.0.180", confirm: true, confirm_text: "lan-ca" });
  });

  it("keeps the refusal of the server as its own code", async () => {
    answers.push(json(403, { error: "lan_ca_disabled" }));
    await expect(adminLanCaOrder(O, { action: "setup", ip: "192.168.0.180", confirmText: "lan-ca" }, "000000")).rejects.toMatchObject({ code: "lan_ca_disabled" });
  });

  it("has its words in every language, translated and not repeated", () => {
    for (const id of ["lanca_title", "lanca_help", "lanca_off", "lanca_missing", "lanca_authority", "lanca_certificate", "lanca_days", "lanca_none", "lanca_expiring", "lanca_ip", "lanca_setup", "lanca_renew", "lanca_rotate", "lanca_ask", "lanca_rotate_warn", "lanca_done"]) {
      const words = new Set<string>();
      for (const locale of locales) { const phrase = text(locale, id); expect(phrase.trim().length, `${locale} ${id}`).toBeGreaterThan(1); expect(phrase, `${locale} ${id}`).not.toBe(id); words.add(phrase); }
      expect(words.size, `${id} is translated, not repeated`).toBe(8);
    }
    for (const locale of locales) expect(text(locale, "lanca_days")).toContain("{days}");
  });
});
