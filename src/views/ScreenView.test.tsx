// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { text } from "../i18n";

const health = { nodes: [], waiting: [], totals: { nodes: 0, stale: 0, with_warnings: 0 }, levels: { low_heap_b: 40000, low_heap_clear_b: 50000, restarts_per_day: 3, abnormal_window_min: 60, flap_reconnects: 5, flap_window_min: 10, weak_signal_dbm: -80 } } as Record<string, unknown>;
const item = (node_id: string, family: string, stale = false) => ({
  node_id, family, firmware: "0.3.9", board: "lcd7box", stale, status: stale ? "stale" : "ok", received_at: "2026-01-01T10:00:00.000Z", warnings: [], restarts_24h: 0,
  report: { kind: "node_health", node_id, family, firmware: "0.3.9", uptime_s: 100, reset_reason: "power_on", heap_free: 100000, heap_min: 90000, link: "wifi", link_up: true, broker_reconnects: 0 },
});

vi.mock("../api", async importOriginal => ({ ...(await importOriginal<typeof import("../api")>()), readNodeHealth: vi.fn(async () => health), listNodePanels: vi.fn(async () => ({ panels: [] })) }));

import { ScreenView } from "./ScreenView";

let root: Root | null = null;
let host: HTMLElement | null = null;
const t = (key: string, ...args: (string | number)[]) => args.reduce<string>((sentence, value, index) => sentence.replace(`{${index}}`, String(value)), text("en", key));

const draw = async () => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => { root!.render(createElement(ScreenView, { t, origin: "http://srv:8080", isAdmin: true })); });
  await act(async () => { await Promise.resolve(); });
  return host;
};

describe("the touch panel menu", () => {
  beforeEach(() => { (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; });
  afterEach(async () => { await act(async () => { root?.unmount(); }); host?.remove(); root = null; host = null; });

  it("says that no wall panel has reported yet", async () => {
    health.nodes = [item("radar-x", "radar"), item("s1", "solar")];
    const view = await draw();
    expect(view.textContent).toContain(t("scr_none"));
    expect(view.querySelectorAll("[data-tour='scr-node']").length).toBe(0);
  });

  it("lists only the wall panels, each with the buttons of a node and its health card, and counts the ones that answer", async () => {
    health.nodes = [item("radar-x", "radar"), item("hmi-1", "hmi"), item("hmi-2", "hmi", true)];
    const view = await draw();
    const cards = [...view.querySelectorAll("[data-tour='scr-node']")];
    expect(cards.length).toBe(2);
    expect(view.textContent).toContain("hmi-1");
    expect(cards.map(card => card.textContent).join(" ")).not.toContain("radar-x");
    expect(view.textContent).toContain(t("scr_count", 1, 2));
    expect(cards[0].querySelectorAll(".nt-btn").length).toBeGreaterThan(3);
    expect(cards[1].querySelector(`[aria-label="${t("forgetNode")}"]`)).not.toBeNull();
  });
});
