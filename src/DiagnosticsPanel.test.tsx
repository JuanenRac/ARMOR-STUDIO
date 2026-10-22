import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { DeliveredDiagnostics, DiagnosticTokenCreated, DiagnosticTokenInfo } from "./api";
import { DiagnosticsPanel, PackageSummary, TokenRules, TokenSecret, TokenTable } from "./DiagnosticsPanel";
import { locales, text } from "./i18n";
import source from "./DiagnosticsPanel.tsx?raw";

const t = (language: Parameters<typeof text>[0] = "en") => (key: string) => text(language, key);
const noop = () => undefined;
/** What the markup makes of an apostrophe. */
const esc = (value: string): string => value.replace(/'/g, "&#x27;");
const now = Date.parse("2026-01-01T11:00:00.000Z");
const created: DiagnosticTokenCreated = {
  id: "dt-1", token: "armor-diag-SECRETSECRETSECRET", scope: "read_only", nodes: ["radar-1", "alarm-1"], label: "installer", created_at: "2026-01-01T11:00:00.000Z", expires_at: "2026-01-01T13:00:00.000Z", created_by: "ana",
};
const info = (extra: Partial<DiagnosticTokenInfo> = {}): DiagnosticTokenInfo => ({
  id: "dt-1", scope: "read_only", nodes: ["radar-1"], label: "installer", created_at: "2026-01-01T10:00:00.000Z", expires_at: "2026-01-01T12:00:00.000Z", created_by: "ana", status: "active", uses: 3, last_used_at: "2026-01-01T10:30:00.000Z", ...extra,
});
const delivered = (data: DeliveredDiagnostics["data"]): DeliveredDiagnostics => ({ at: "2026-01-01T11:00:00.000Z", requested_by: "ana", data });
const fullPackage = delivered({
  detail: "package",
  heap: { internal_free: 52_000, internal_min: 20_000, internal_largest: 30_000, total_free: 4_000_000, total_min: 3_900_000, psram_free: 3_900_000 },
  tasks: [{ name: "mqtt", stack_free: 400, priority: 5, state: "B" }, { name: "radar", stack_free: 90, priority: 6, state: "R" }, { name: "wifi", stack_free: 800, priority: 3, state: "B" }],
  resets: { reason: "task_wdt", uptime_s: 7200, guard_restarts_in_hour: 1 },
  boot: { cause: "task_watchdog", reset_reason: "task_wdt", uptime_before_s: 3600, heap_internal_free: 22_000, heap_internal_largest: 9_000, coredump: true, deliberate: false, guard: false },
  memory_gate: { closed: true, transitions: 2, close_free: 24_000, close_block: 8_000, open_free: 40_000, open_block: 16_000 },
  versions: { firmware: "0.9.1", idf: "v5.4", board: "s3-wifi", sensors: [{ name: "ld2450", version: "2.1" }] },
  config: { "wifi.channel": "6", "mqtt.host": "broker.local" },
  coredump: { present: true, size: 65_536, summary: { task: "radar", reason: "LoadProhibited", pc: "0x400d1234", backtrace: ["0x400d1234", "0x400d2345"] } },
  log: "boot ok\nmqtt connected", truncated: true,
});

describe("what a token can and cannot do, on the screen", () => {
  it("says it only reads, that it can never give an order, that it expires and can be revoked, in every language", () => {
    for (const language of locales) {
      const html = renderToStaticMarkup(createElement(TokenRules, { t: t(language) }));
      for (const key of ["dg_rules_title", "dg_can_1", "dg_cannot_1", "dg_cannot_2", "dg_limits_1", "dg_limits_2", "dg_limits_3"]) {
        expect(html, `${language} ${key}`).toContain(esc(text(language, key)));
        expect(text(language, key), `${language} ${key}`).not.toBe(key);
      }
      expect(html).not.toContain("dg_");
    }
    const en = renderToStaticMarkup(createElement(TokenRules, { t: t() }));
    expect(en).toContain("cannot give any order");
    expect(en).toContain("revoke it at any moment");
  });
});

describe("the secret of a new token", () => {
  it("shows the token once with a Copy button and says it cannot be seen again, in every language", () => {
    for (const language of locales) {
      const html = renderToStaticMarkup(createElement(TokenSecret, { t: t(language), created, close: noop }));
      expect(html, language).toContain("armor-diag-SECRETSECRETSECRET");
      expect(html, language).toContain(esc(text(language, "dg_copy")));
      expect(html, language).toContain(esc(text(language, "dg_done")));
      expect(html, language).toContain("radar-1, alarm-1");
      expect(html).not.toContain("dg_");
    }
    expect(renderToStaticMarkup(createElement(TokenSecret, { t: t(), created, close: noop }))).toContain("This is the only time it is shown");
  });
  it("is never written to the storage of the browser", () => {
    expect(source).not.toMatch(/localStorage|sessionStorage|indexedDB|document\.cookie/);
  });
  it("is not in the markup of the screen once it is closed (the panel starts without one)", () => {
    const html = renderToStaticMarkup(createElement(DiagnosticsPanel, { t: t(), origin: "http://x", isAdmin: true }));
    expect(html).not.toContain("armor-diag-");
    expect(html).not.toContain("dg-secret");
  });
});

describe("the list of tokens", () => {
  it("shows the state, the nodes, the uses and the last use, and offers Revoke only for an active one", () => {
    const html = renderToStaticMarkup(createElement(TokenTable, { t: t(), now, revoke: noop, tokens: [info(), info({ id: "dt-2", status: "revoked", revoked_at: "2026-01-01T10:40:00.000Z", uses: 0, last_used_at: undefined }), info({ id: "dt-3", expires_at: "2026-01-01T10:45:00.000Z", status: "expired" })] }));
    expect(html).toContain("active");
    expect(html).toContain("revoked");
    expect(html).toContain("expired");
    expect(html).toContain("never");
    expect(html.match(/>Revoke</g)).toHaveLength(1);
    expect(html).toContain('data-testid="dg-token-dt-1"');
    expect(html).not.toContain("armor-diag-");
  });
  it("says there is none, in every language, and has every column header", () => {
    for (const language of locales) {
      expect(renderToStaticMarkup(createElement(TokenTable, { t: t(language), tokens: [], now, revoke: noop }))).toContain(esc(text(language, "dg_list_none")));
      const html = renderToStaticMarkup(createElement(TokenTable, { t: t(language), tokens: [info()], now, revoke: noop }));
      for (const key of ["dg_c_note", "dg_c_nodes", "dg_c_status", "dg_c_expires", "dg_c_uses", "dg_c_last", "dg_c_by", "dg_status_active", "dg_revoke"]) expect(html, `${language} ${key}`).toContain(esc(text(language, key)));
      expect(html).not.toContain("dg_");
    }
  });
});

describe("the package a node handed over", () => {
  it("summarises the versions, why it last started, the memory, the tasks with the least stack, the gate, the core dump, the settings and the log", () => {
    const html = renderToStaticMarkup(createElement(PackageSummary, { t: t(), entry: fullPackage, kind: "package" }));
    expect(html).toContain("0.9.1");
    expect(html).toContain("v5.4");
    expect(html).toContain("a task stopped answering");
    expect(html).toContain("51 KB");
    expect(html.indexOf("radar: 90 B free")).toBeGreaterThan(-1);
    expect(html.indexOf("radar: 90 B free")).toBeLessThan(html.indexOf("mqtt: 400 B free"));
    expect(html).toContain("closed: the node holds back new work");
    expect(html).toContain("Crashed in the task radar");
    expect(html).toContain("LoadProhibited");
    expect(html).toContain("0x400d2345");
    expect(html).toContain("wifi.channel");
    expect(html).toContain("mqtt connected");
    expect(html).toContain("The log was cut to fit.");
  });
  it("shows only the log when that is all the node delivered", () => {
    const html = renderToStaticMarkup(createElement(PackageSummary, { t: t(), kind: "log", entry: delivered({ detail: "log", log: "line one", truncated: false }) }));
    expect(html).toContain("line one");
    expect(html).toContain("Log received");
    expect(html).not.toContain('data-testid="dg-memory"');
    expect(html).not.toContain('data-testid="dg-tasks"');
  });
  it("reads without a phrase left untranslated in any language", () => {
    for (const language of locales) {
      const html = renderToStaticMarkup(createElement(PackageSummary, { t: t(language), entry: fullPackage, kind: "package" }));
      for (const marker of ["dg_", "nh_", "nc_"]) expect(html, `${language} ${marker}`).not.toContain(marker);
    }
  });
});

describe("the tab", () => {
  it("tells anybody but an administrator that it is for administrators, and asks nothing", () => {
    const html = renderToStaticMarkup(createElement(DiagnosticsPanel, { t: t(), origin: "http://x", isAdmin: false }));
    expect(html).toContain("Diagnostics of the nodes");
    expect(html).not.toContain("dg-panel");
    expect(html).not.toContain("Issue the token");
  });
  it("shows an administrator the rules, the form to issue a token with its six durations (2 hours by default) and the list", () => {
    for (const language of locales) {
      const html = renderToStaticMarkup(createElement(DiagnosticsPanel, { t: t(language), origin: "http://x", isAdmin: true }));
      expect(html, language).toContain('data-testid="dg-rules"');
      expect(html, language).toContain(esc(text(language, "dg_issue")));
      expect(html, language).toContain(esc(text(language, "dg_ttl_7200")));
      expect(html, language).toContain(esc(text(language, "dg_ttl_300")));
      expect(html, language).toContain(esc(text(language, "dg_ttl_86400")));
      expect(html, language).toContain(esc(text(language, "dg_node_title")));
      expect(html, language).not.toContain("dg_");
    }
    const html = renderToStaticMarkup(createElement(DiagnosticsPanel, { t: t(), origin: "http://x", isAdmin: true }));
    expect(html).toMatch(/<option value="7200" selected="">2 hours \(recommended\)<\/option>|<option selected="" value="7200">2 hours \(recommended\)<\/option>/);
  });
});
