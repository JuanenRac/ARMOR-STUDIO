import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { locales, text } from "../i18n";
import type { NodeHealthItem, NodeHealthLevels } from "../api";
import { NodeCard, NodeHealth } from "./NodeHealth";

const levels: NodeHealthLevels = { low_heap_b: 30000, low_heap_clear_b: 40000, restarts_per_day: 3, abnormal_window_min: 60, flap_reconnects: 3, flap_window_min: 15, weak_signal_dbm: -80, weak_signal_reports: 3, silent_after_s: 180 };
const radar: NodeHealthItem = {
  node_id: "north-1", family: "radar", firmware: "0.6.9", board: "s3-wifi", received_at: new Date().toISOString(), stale: false, status: "warning", restarts_24h: 3,
  warnings: [{ code: "node_low_memory", detail: { heap_free: 12000 } }, { code: "node_weak_signal", detail: { rssi_dbm: -83 } }],
  report: { kind: "node_health", node_id: "north-1", timestamp_ms: 1, family: "radar", firmware: "0.6.9", board: "s3-wifi", uptime_s: 93_784, reset_reason: "task_wdt", heap_free: 12_000, heap_min: 9_000,
            link: "wifi", link_up: true, rssi_dbm: -83, broker_reconnects: 4, low_stack_tasks: 1, last_error: "armor-mqtt: the broker refused the identity" },
};
const cable: NodeHealthItem = {
  node_id: "alarm-1", family: "alarm", firmware: "0.3.6", received_at: new Date().toISOString(), stale: false, status: "ok", restarts_24h: 0, warnings: [],
  report: { kind: "node_health", node_id: "alarm-1", timestamp_ms: 1, family: "alarm", firmware: "0.3.6", uptime_s: 3_600, reset_reason: "power_on", heap_free: 142_000, heap_min: 98_000, link: "ethernet", link_up: true, broker_reconnects: 1 },
};

const card = (node: NodeHealthItem, language: Parameters<typeof text>[0] = "en", isAdmin = true) =>
  renderToStaticMarkup(createElement(NodeCard, { t: (key: string) => text(language, key), node, levels, now: Date.now(), opened: false, toggle: () => undefined, origin: "http://x", isAdmin, forget: () => undefined }));

describe("the health of the nodes, in the System menu", () => {
  it("shows what a node says about itself and the warnings the server raised, with no phrase left untranslated in any language", () => {
    for (const language of locales) {
      const html = card(radar, language);
      expect(html).toContain("north-1");
      expect(html).toContain("0.6.9");
      expect(html).toContain("armor-mqtt: the broker refused the identity");
      expect(html).toContain("-83 dBm");
      for (const marker of ["nh_", "alarm_node_"]) expect(html, `${language}: ${marker}`).not.toContain(marker);
    }
  });

  it("marks a restart nobody asked for, the memory that is low and a signal that is very weak", () => {
    const html = card(radar);
    expect(html).toContain("watchdog (a task stopped)");
    expect(html).toContain("unexpected");
    expect(html).toContain("Short of memory");
    expect(html).toContain("Weak Wi-Fi signal");
    expect(html).toContain("very weak");
    expect(html).toContain('class="low"');
    expect(html).toContain("12 KB");
  });

  it("shows a healthy node on a cable without a signal and without a warning", () => {
    const html = card(cable);
    expect(html).toContain("Ethernet cable");
    expect(html).not.toContain("dBm");
    expect(html).not.toContain("nh-warnings");
    expect(html).toContain("healthy");
    expect(html).toContain("none logged");
    expect(html).toContain("139 KB");
  });

  it("offers Forget only to an administrator", () => {
    expect(card(cable, "en", true)).toContain(">Forget<");
    expect(card(cable, "en", false)).not.toContain(">Forget<");
  });

  it("has every phrase of the card in the eight languages, with the placeholders where they belong", () => {
    const keys = ["nh_title", "nh_help", "nh_levels", "nh_none", "nh_none_help", "nh_waiting", "nh_forget_q", "nh_heap_min", "nh_up_before", "alarm_node_low_memory", "alarm_node_frequent_resets", "alarm_node_link_flapping", "alarm_node_weak_signal"];
    for (const language of locales) {
      for (const key of keys) expect(text(language, key), `${language}: ${key}`).not.toBe(key);
      if (language !== "en") expect(text(language, "nh_title"), language).not.toBe(text("en", "nh_title"));
      for (const hole of ["{0}", "{1}", "{2}", "{3}", "{4}"]) expect(text(language, "nh_levels"), `${language}: ${hole}`).toContain(hole);
      expect(text(language, "nh_forget_q")).toContain("{0}");
    }
  });

  it("draws the section (the totals come with the first answer) and says what the levels are for", () => {
    const html = renderToStaticMarkup(createElement(NodeHealth, { t: (key: string) => text("en", key), origin: "http://x", isAdmin: true }));
    expect(html).toContain("Health of the nodes");
    expect(html).toContain('data-tour="sys-health"');
  });
});
