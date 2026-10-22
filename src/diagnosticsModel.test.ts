import { describe, expect, it } from "vitest";
import { ApiError, type DiagnosticTokenInfo } from "./api";
import { ASK_GAP_MS, askWait, buildTokenRequest, configEntries, diagnosticsErrorKey, leastStack, sortTokens, tokenState, ttlKey, TTL_CHOICES } from "./diagnosticsModel";
import { locales, text } from "./i18n";

const token = (extra: Partial<DiagnosticTokenInfo> = {}): DiagnosticTokenInfo => ({
  id: "dt-1", scope: "read_only", nodes: ["radar-1"], created_at: "2026-01-01T10:00:00.000Z", expires_at: "2026-01-01T12:00:00.000Z", created_by: "ana", status: "active", uses: 0, ...extra,
});
const at = (iso: string) => Date.parse(iso);

describe("the request for a diagnostic token", () => {
  it("offers 5 minutes, 30 minutes, 1 hour, 2 hours, 8 hours and 24 hours, each with its words in every language", () => {
    expect(TTL_CHOICES).toEqual([300, 1800, 3600, 7200, 28_800, 86_400]);
    for (const locale of locales) for (const seconds of TTL_CHOICES) expect(text(locale, ttlKey(seconds)), `${locale} ${seconds}`).not.toBe(ttlKey(seconds));
  });
  it("takes one to sixteen nodes, once each, and a duration between 5 minutes and 24 hours", () => {
    expect(buildTokenRequest([], 7200, "")).toBeNull();
    expect(buildTokenRequest(["b", "a", "b"], 7200, "")).toEqual({ nodes: ["a", "b"], ttl_s: 7200 });
    expect(buildTokenRequest(Array.from({ length: 17 }, (_, index) => `n${index}`), 7200, "")).toBeNull();
    expect(buildTokenRequest(Array.from({ length: 16 }, (_, index) => `n${index}`), 7200, "")).not.toBeNull();
    expect(buildTokenRequest(["a"], 299, "")).toBeNull();
    expect(buildTokenRequest(["a"], 86_401, "")).toBeNull();
    expect(buildTokenRequest(["a"], 300, "")).not.toBeNull();
    expect(buildTokenRequest(["a"], 86_400, "")).not.toBeNull();
    expect(buildTokenRequest(["a"], 7200.5, "")).toBeNull();
  });
  it("trims the note and cuts it to 48 characters, and leaves it out when it is empty", () => {
    expect(buildTokenRequest(["a"], 7200, "   visit   ")).toEqual({ nodes: ["a"], ttl_s: 7200, label: "visit" });
    expect(buildTokenRequest(["a"], 7200, "   ")).toEqual({ nodes: ["a"], ttl_s: 7200 });
    expect(buildTokenRequest(["a"], 7200, "x".repeat(80))!.label).toHaveLength(48);
  });
});

describe("the state of a token", () => {
  it("is revoked when it was revoked, expired when its time has passed even if the list is older, and active otherwise", () => {
    expect(tokenState(token(), at("2026-01-01T11:00:00.000Z"))).toBe("active");
    expect(tokenState(token(), at("2026-01-01T12:00:00.000Z"))).toBe("expired");
    expect(tokenState(token({ status: "expired" }), at("2026-01-01T11:00:00.000Z"))).toBe("expired");
    expect(tokenState(token({ status: "revoked", revoked_at: "2026-01-01T10:30:00.000Z" }), at("2026-01-01T11:00:00.000Z"))).toBe("revoked");
    expect(tokenState(token({ revoked_at: "2026-01-01T10:30:00.000Z" }), at("2026-01-01T11:00:00.000Z"))).toBe("revoked");
  });
  it("lists the active ones first, the soonest to expire first, then the others, the newest first", () => {
    const now = at("2026-01-01T11:00:00.000Z");
    const list = sortTokens([
      token({ id: "old", status: "expired", created_at: "2025-12-01T00:00:00.000Z", expires_at: "2025-12-01T02:00:00.000Z" }),
      token({ id: "late", expires_at: "2026-01-01T20:00:00.000Z" }),
      token({ id: "soon", expires_at: "2026-01-01T11:30:00.000Z" }),
      token({ id: "gone", status: "revoked", revoked_at: "2026-01-01T10:30:00.000Z", created_at: "2026-01-01T10:10:00.000Z" }),
    ], now);
    expect(list.map(item => item.id)).toEqual(["soon", "late", "gone", "old"]);
  });
});

describe("the package of a node", () => {
  it("puts the tasks with the least stack first and keeps five", () => {
    const tasks = ["a", "b", "c", "d", "e", "f"].map((name, index) => ({ name, stack_free: [900, 120, 500, 80, 700, 80][index]!, priority: 5, state: "B" }));
    expect(leastStack(tasks).map(task => task.name)).toEqual(["d", "f", "b", "c", "e"]);
    expect(leastStack(undefined)).toEqual([]);
  });
  it("lists the settings it allows to be read in order of name", () => {
    expect(configEntries({ b: "2", a: "1" })).toEqual([["a", "1"], ["b", "2"]]);
    expect(configEntries(undefined)).toEqual([]);
  });
});

describe("asking a node again", () => {
  it("waits fifteen seconds after the last time", () => {
    expect(ASK_GAP_MS).toBe(15_000);
    expect(askWait(null, 1000)).toBe(0);
    expect(askWait(1000, 6000)).toBe(10_000);
    expect(askWait(1000, 16_000)).toBe(0);
    expect(askWait(1000, 99_000)).toBe(0);
  });
});

describe("the words for an error of the server", () => {
  it("has a sentence in every language for each code the routes answer", () => {
    const codes = ["elevation_required", "invalid_request", "unknown_node", "too_many_tokens", "rate_limited", "forbidden", "no_package", "no_log"];
    for (const code of codes) expect(diagnosticsErrorKey(new ApiError(400, code))).toBe(`dg_err_${code}`);
    expect(diagnosticsErrorKey(new ApiError(429, "other"))).toBe("dg_err_rate_limited");
    expect(diagnosticsErrorKey(new ApiError(403, "other"))).toBe("dg_err_forbidden");
    expect(diagnosticsErrorKey(new ApiError(500, "other"))).toBe("dg_err_generic");
    expect(diagnosticsErrorKey(new Error("boom"))).toBe("dg_err_generic");
    for (const locale of locales) for (const key of [...codes.map(code => `dg_err_${code}`), "dg_err_generic"]) expect(text(locale, key), `${locale} ${key}`).not.toBe(key);
  });
});
