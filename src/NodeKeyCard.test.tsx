// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { locales, text } from "./i18n";
import { NODE_ID, NodeKeyCard, SHOWN_MS } from "./NodeKeyCard";

const t = (key: string) => text("en", key);
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const KEY = "ab".repeat(32);
const seen: string[] = [];
let answer: () => Response = () => json(200, { node_id: "alarm-1", token: "t", strict: false, command_key: KEY });
let root: Root | null = null;
const host = document.createElement("div");
const settle = async () => { await act(async () => { await vi.advanceTimersByTimeAsync(20); }); };

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  seen.length = 0;
  answer = () => json(200, { node_id: "alarm-1", token: "t", strict: false, command_key: KEY });
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => { seen.push(`${init?.method ?? "GET"} ${new URL(String(input)).pathname}`); return answer(); }));
});
afterEach(async () => { await act(async () => { root?.unmount(); }); root = null; vi.useRealTimers(); vi.unstubAllGlobals(); });

async function show(isAdmin = true): Promise<HTMLElement> {
  root = createRoot(host);
  act(() => { root!.render(createElement(NodeKeyCard, { t, origin: "http://127.0.0.1:8080", isAdmin })); });
  await settle();
  return host;
}
const type = (view: HTMLElement, value: string) => act(() => {
  const input = view.querySelector("input") as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
const press = async (view: HTMLElement, testid: string) => { await act(async () => { (view.querySelector(`[data-testid=${testid}]`) as HTMLButtonElement).click(); await vi.advanceTimersByTimeAsync(20); }); };

describe("the key of a node for the signed commands", () => {
  it("is for an administrator only, and the id must look like the id of a node before it can be asked", async () => {
    expect((await show(false)).querySelector("[data-testid=nodekey]")).toBeNull();
    await act(async () => { root?.unmount(); }); root = null;
    const view = await show();
    expect((view.querySelector("[data-testid=nodekey-read]") as HTMLButtonElement).disabled).toBe(true);
    for (const bad of ["Alarm 1", "../x", "-a", "a".repeat(65)]) { type(view, bad); expect((view.querySelector("[data-testid=nodekey-read]") as HTMLButtonElement).disabled, bad).toBe(true); expect(NODE_ID.test(bad)).toBe(false); }
    type(view, "alarm-1");
    expect((view.querySelector("[data-testid=nodekey-read]") as HTMLButtonElement).disabled).toBe(false);
  });

  it("reads the key from the token route, shows it, copies it and forgets it after a minute", async () => {
    const copied: string[] = [];
    vi.stubGlobal("navigator", { clipboard: { writeText: async (value: string) => { copied.push(value); } } });
    const view = await show();
    type(view, "alarm-1");
    await press(view, "nodekey-read");
    expect(seen).toEqual(["GET /api/v1/admin/nodes/alarm-1/token"]);
    expect((view.querySelector("[data-testid=nodekey-shown] input") as HTMLInputElement).value).toBe(KEY);
    await press(view, "nodekey-copy");
    expect(copied).toEqual([KEY]);
    await act(async () => { await vi.advanceTimersByTimeAsync(SHOWN_MS + 10); });
    expect(view.querySelector("[data-testid=nodekey-shown]")).toBeNull();
    expect(view.textContent).not.toContain(KEY);
  });

  it("says the option is off when the server gives no key, and explains a refusal", async () => {
    answer = () => json(200, { node_id: "alarm-1", token: "t", strict: false });
    const view = await show();
    type(view, "alarm-1");
    await press(view, "nodekey-read");
    expect(view.querySelector("[data-testid=nodekey-off]")).not.toBeNull();
    expect(view.querySelector("[data-testid=nodekey-shown]")).toBeNull();
    answer = () => json(422, { error: "invalid_node_id" });
    await press(view, "nodekey-read");
    expect(view.textContent).toContain(t("nk_bad_id"));
  });

  it("has its words in the eight languages, translated and not repeated", () => {
    for (const key of ["nk_title", "nk_help", "nk_id", "nk_read", "nk_key", "nk_copy", "nk_copied", "nk_clears", "nk_off", "nk_bad_id"]) {
      const words = new Set<string>();
      for (const locale of locales) { const phrase = text(locale, key); expect(phrase, `${locale} ${key}`).not.toBe(key); words.add(phrase); }
      expect(words.size, key).toBeGreaterThanOrEqual(6);
    }
  });
});
