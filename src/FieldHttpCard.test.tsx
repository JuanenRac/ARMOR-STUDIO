import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adminFirewall, adminSetFieldHttp, changeStaging, readStaging } from "./api";
import { FIELD_HTTP_WORD, FieldHttpCard, fieldHttpReady } from "./FieldHttpCard";
import { StagingCard } from "./StagingCard";
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
afterEach(() => vi.unstubAllGlobals());

describe("the field-http switch of the firewall", () => {
  it("needs the word typed again and six digits before the change can be sent", () => {
    expect(FIELD_HTTP_WORD).toBe("field-http");
    expect(fieldHttpReady("field-http", "123456")).toBe(true);
    expect(fieldHttpReady("field-http", "12345")).toBe(false);
    expect(fieldHttpReady("field-http", "12345a")).toBe(false);
    expect(fieldHttpReady("field_http", "123456")).toBe(false);
    expect(fieldHttpReady("", "123456")).toBe(false);
  });

  it("is read as the server says and changed with the confirmation and the code of the authenticator in the header", async () => {
    answers.push(json(200, { enabled: true, installed: true, field_http: false, approval: "totp" }), json(200, { ok: true, state: "on", installed: true, field_http: true, approval: "totp" }));
    expect((await adminFirewall(O)).field_http).toBe(false);
    const done = await adminSetFieldHttp(O, { state: "on", confirmText: "field-http" }, "123456");
    expect(done.field_http).toBe(true);
    expect(seen[1]!.url).toContain("/api/v1/admin/firewall/field-http");
    expect(seen[1]!.method).toBe("POST");
    expect(seen[1]!.headers.get("X-Armor-Maint-Totp")).toBe("123456");
    expect(seen[1]!.body).toEqual({ state: "on", confirm: true, confirm_text: "field-http" });
  });

  it("keeps the refusal of the agent as its own code", async () => {
    answers.push(json(403, { error: "field_http_disabled" }));
    await expect(adminSetFieldHttp(O, { state: "on", confirmText: "field-http" }, "000000")).rejects.toMatchObject({ code: "field_http_disabled" });
  });

  it("has a text in every language", () => {
    const keys = ["adm_fhttp", "adm_fhttp_help", "adm_fhttp_off", "adm_fhttp_missing", "adm_fhttp_ask", "adm_fhttp_done", "adm_err_field_http_disabled", "adm_err_firewall_not_loaded", "adm_err_firewall_failed",
      "sec_opt_fieldhttp", "sec_opt_fieldhttp_help", "sec_opt_fieldhttp_warn", "mt_staging", "mt_staging_help", "mt_staging_label", "mt_staging_env"];
    for (const locale of locales) for (const key of keys) expect(text(locale, key), `${locale} ${key}`).not.toBe(key);
    for (const locale of locales) expect(text(locale, "adm_fhttp_ask")).toContain("{state}");
  });
});

describe("the trial of a new server before the switch", () => {
  it("is read and chosen as a boolean, nothing else", async () => {
    answers.push(json(200, { enabled: false, source: "env", wait_s: 30 }), json(200, { enabled: true, source: "studio", wait_s: 30 }));
    expect((await readStaging(O)).enabled).toBe(false);
    const done = await changeStaging(O, true);
    expect([done.enabled, done.source]).toEqual([true, "studio"]);
    expect(seen[1]!.method).toBe("PUT");
    expect(seen[1]!.url).toContain("/api/v1/admin/maintenance/staging");
    expect(seen[1]!.body).toEqual({ enabled: true });
  });
});

describe("the two cards while the server has not answered yet", () => {
  const t = (key: string) => text("en", key);
  it("show nothing (the field-http card never offers a control before it knows the option is on, and the trial card waits for its state)", () => {
    expect(renderToStaticMarkup(createElement(FieldHttpCard, { t, origin: O }))).toBe("");
    expect(renderToStaticMarkup(createElement(StagingCard, { t, origin: O }))).toBe("");
  });
});
