import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adminAddAccount, adminRemoveAccount, adminSaveFile, adminServices, adminStatus, ApiError, setAdminSecret } from "../api";
import { locales, text } from "../i18n";

type Seen = { url: string; method: string; headers: Headers };
const seen: Seen[] = [];
let answers: Array<() => Response> = [];
const json = (status: number, body: unknown) => () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const O = "http://armor.local:8080/";
const HEADER = "X-Armor-Admin-Sensitive-Token";

beforeEach(() => {
  seen.length = 0; answers = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit = {}) => {
    seen.push({ url, method: init.method ?? "GET", headers: new Headers(init.headers) });
    const next = answers.shift();
    if (!next) throw new Error("no answer prepared");
    return next();
  }));
});
afterEach(() => { setAdminSecret(""); vi.unstubAllGlobals(); });

describe("the second secret of the admin agent", () => {
  it("goes with the changes to the broker rules, the env files and the accounts once it is typed, and with nothing else", async () => {
    answers.push(json(200, { ok: true, restarted: [], mtime: 1 }), json(200, { ok: true, user: "u", password: "p" }), json(200, { ok: true }), json(200, { services: [] }), json(200, { ok: true, restarted: [], mtime: 2 }));
    await adminSaveFile(O, "server.env", { content: "A=1\n", restart: false });
    expect(seen[0]!.headers.get(HEADER)).toBeNull();                      // nothing typed: nothing sent
    setAdminSecret("  the-second-secret-of-the-agent  ");
    await adminAddAccount(O, "node", "north-2");
    await adminRemoveAccount(O, "field-node-north-2");
    await adminServices(O);
    await adminSaveFile(O, "mosquitto.acl", { content: "user x\n", restart: true });
    expect(seen.map(item => item.headers.get(HEADER))).toEqual([null, "the-second-secret-of-the-agent", "the-second-secret-of-the-agent", null, "the-second-secret-of-the-agent"]);
  });

  it("is forgotten when the screen is left, and the agent's answer about its protection is read", async () => {
    answers.push(json(200, { available: true, sensitive_writes: { mode: "second_token", protected: true } }), json(200, { available: true, sensitive_writes: null }), json(200, { ok: true, restarted: [], mtime: 1 }));
    expect((await adminStatus(O)).sensitive_writes).toEqual({ mode: "second_token", protected: true });
    expect((await adminStatus(O)).sensitive_writes).toBeNull();           // an older agent does not say
    setAdminSecret("x".repeat(30));
    setAdminSecret("");
    await adminSaveFile(O, "server.env", { content: "A=1\n", restart: false });
    expect(seen[2]!.headers.get(HEADER)).toBeNull();
  });

  it("a refusal of the agent reaches the console as its own code, with a text in every language", async () => {
    answers.push(json(403, { error: "sensitive_token_required" }), json(403, { error: "sensitive_read_only" }));
    await expect(adminSaveFile(O, "server.env", { content: "A=1\n", restart: false })).rejects.toMatchObject({ code: "sensitive_token_required" });
    await expect(adminSaveFile(O, "server.env", { content: "A=1\n", restart: false })).rejects.toBeInstanceOf(ApiError);
    for (const locale of locales) for (const key of ["adm_err_sensitive_token_required", "adm_err_sensitive_read_only", "adm_sensitive_open", "adm_sensitive_read_only", "adm_sensitive_second", "adm_sensitive_second_help"]) {
      expect(text(locale, key), `${locale} ${key}`).not.toBe(key);
      expect(text(locale, key).length, `${locale} ${key}`).toBeGreaterThan(10);
    }
  });
});
