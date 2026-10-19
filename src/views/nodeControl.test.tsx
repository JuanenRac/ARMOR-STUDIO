import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { locales, text } from "../i18n";
import type { NodeControlOperation, NodeHealthItem, NodeHealthLevels } from "../api";
import { NodeCard } from "./NodeHealth";
import { ActionMenu, ControlDialog, GroupActions, OperationView } from "./NodeControl";

const levels: NodeHealthLevels = { low_heap_b: 30000, low_heap_clear_b: 40000, restarts_per_day: 3, abnormal_window_min: 60, flap_reconnects: 3, flap_window_min: 15, weak_signal_dbm: -80, weak_signal_reports: 3, silent_after_s: 180 };
const base = (family: NodeHealthItem["family"], id: string, extra: Partial<NodeHealthItem["report"]> = {}, stale = false): NodeHealthItem => ({
  node_id: id, family, firmware: "0.3.6", received_at: new Date().toISOString(), stale, status: stale ? "stale" : "ok", restarts_24h: 0, warnings: [],
  report: { kind: "node_health", node_id: id, timestamp_ms: 1, family, firmware: "0.3.6", uptime_s: 3_600, reset_reason: "power_on", heap_free: 142_000, heap_min: 98_000, link: "ethernet", link_up: true, broker_reconnects: 1, ...extra },
});
const t = (language: Parameters<typeof text>[0]) => (key: string) => text(language, key);
const noop = () => undefined;
const card = (node: NodeHealthItem, language: Parameters<typeof text>[0] = "en", isAdmin = true, withControl = true) =>
  renderToStaticMarkup(createElement(NodeCard, { t: t(language), node, levels, now: Date.now(), opened: false, toggle: noop, origin: "http://x", isAdmin, forget: noop, control: withControl ? noop : undefined }));

describe("the orders for a node, on its health card", () => {
  it("offers the Actions menu to an administrator and hides it from anybody else", () => {
    expect(card(base("radar", "north-1"))).toContain('aria-haspopup="menu"');
    expect(card(base("radar", "north-1"), "en", false)).not.toContain("aria-haspopup");
    expect(card(base("radar", "north-1"), "en", false)).not.toContain(">Actions<");
  });
  it("does not offer it for a node that has gone silent", () => {
    expect(card(base("radar", "north-1", {}, true))).not.toContain("aria-haspopup");
  });
  it("shows the state chips to everybody: paused with the time left, standby with who, maintenance", () => {
    const html = card(base("alarm", "alarm-1", { control_state: "standby", control_since_ms: 1_700_000_000_000, control_by: "maria", maintenance: true, maintenance_until_s: 600 }), "en", false);
    expect(html).toContain("nc-chips-alarm-1");
    expect(html).toContain("Standby since");
    expect(html).toContain("by maria");
    expect(html).toContain("Maintenance until");
    expect(card(base("radar", "north-1", { control_state: "paused", control_until_s: 1200 }), "en", false)).toContain("Paused · 20 min left");
    expect(card(base("radar", "north-1"))).not.toContain("nc-chips");
  });
  it("lists the orders in the state the node is in, in every language, with Power on for a node in standby", () => {
    for (const language of locales) {
      const running = renderToStaticMarkup(createElement(ActionMenu, { t: t(language), node: base("solar", "s1"), choose: noop, startOpen: true }));
      const standby = renderToStaticMarkup(createElement(ActionMenu, { t: t(language), node: base("solar", "s1", { control_state: "standby" }), choose: noop, startOpen: true }));
      for (const html of [running, standby]) expect(html, language).not.toContain("nc_");
      expect(running).toContain(text(language, "nc_op_pause"));
      expect(standby).toContain(text(language, "nc_op_poweron"));
      expect(standby).not.toContain(`>${text(language, "nc_op_pause")}<`);
    }
    const open = renderToStaticMarkup(createElement(ActionMenu, { t: t("en"), node: base("solar", "s1", { control_state: "standby" }), choose: noop, startOpen: true }));
    expect(open).toContain(">Power on<");
    expect(open).not.toMatch(/factory|erase|reset to|deep sleep|power off/i);
  });
});

describe("the orders for all the nodes", () => {
  it("gives the four group orders in the header, in every language, and disables them when no node reported lately", () => {
    for (const language of locales) {
      const html = renderToStaticMarkup(createElement(GroupActions, { t: t(language), nodes: [base("radar", "r1")], choose: noop }));
      for (const key of ["nc_all_restart", "nc_all_pause", "nc_all_standby", "nc_all_resume"]) expect(html, `${language} ${key}`).toContain(text(language, key));
      expect(html).not.toContain("nc_");
    }
    expect(renderToStaticMarkup(createElement(GroupActions, { t: t("en"), nodes: [base("radar", "r1", {}, true)], choose: noop }))).toContain("disabled");
    expect(renderToStaticMarkup(createElement(GroupActions, { t: t("en"), nodes: [base("radar", "r1")], choose: noop }))).toContain('data-tour="sys-health-control"');
  });
});

const dialog = (language: Parameters<typeof text>[0], request: Parameters<typeof ControlDialog>[0]["request"]) =>
  renderToStaticMarkup(createElement(ControlDialog, { t: t(language), origin: "http://x", request, close: noop, started: noop }));

describe("the dialog of an order", () => {
  it("asks for the name of the node to restart it and warns the alarm panel is unwatched for about a minute", () => {
    const html = dialog("en", { operation: "restart", scope: "node", node: base("alarm", "alarm-1"), label: "nc_op_restart" });
    expect(html).toContain("Type the name of the node to confirm: alarm-1");
    expect(html).toContain("alarm panel");
    expect(html).toContain("disabled");
  });
  it("explains the two ways of restarting all, with Rolling first and recommended, and asks for the word RESTART", () => {
    const html = dialog("en", { operation: "restart", scope: "all", label: "nc_op_restart", count: 4 });
    expect(html).toContain("Rolling (recommended)");
    expect(html).toContain("Now");
    expect(html.indexOf("Rolling")).toBeLessThan(html.indexOf("<strong>Now"));
    expect(html).toContain("Type RESTART to confirm");
    expect(html).toContain("4 node(s)");
  });
  it("warns that the house is not protected for a pause or a standby of the alarm panel and says what standby is", () => {
    const pause = dialog("en", { operation: "pause", scope: "node", node: base("alarm", "alarm-1"), label: "nc_op_pause" });
    expect(pause).toContain("the house is NOT protected");
    expect(pause).toContain("auto-resume");
    expect(pause).toContain('value="60"');
    const standby = dialog("en", { operation: "standby", scope: "node", node: base("radar", "north-1"), label: "nc_op_standby" });
    expect(standby).toContain("NOT watched");
    expect(standby).toContain("never a power-off");
    expect(standby).toContain("Type the name of the node to confirm: north-1");
  });
  it("asks for no typing to resume, to identify or to read the diagnostics, and for the length where it applies", () => {
    expect(dialog("en", { operation: "resume", scope: "node", node: base("radar", "n"), label: "nc_op_resume" })).not.toContain("to confirm");
    expect(dialog("en", { operation: "diagnostics", scope: "node", node: base("radar", "n"), label: "nc_op_diagnostics" })).not.toContain("to confirm");
    expect(dialog("en", { operation: "identify", scope: "node", node: base("radar", "n"), label: "nc_op_identify" })).toContain('value="30"');
    expect(dialog("en", { operation: "maintenance_on", scope: "node", node: base("radar", "n"), label: "nc_op_maintenance_on" })).toContain('value="60"');
  });
  it("is complete in the eight languages for every order", () => {
    for (const language of locales) for (const operation of ["restart", "pause", "standby", "resume", "identify", "diagnostics", "maintenance_on", "maintenance_off"] as const) {
      for (const scope of ["node", "all"] as const) {
        if (scope === "all" && !["restart", "pause", "standby", "resume"].includes(operation)) continue;
        const html = dialog(language, { operation, scope, node: scope === "node" ? base("alarm", "alarm-1") : undefined, label: `nc_op_${operation}`, count: 3 });
        expect(html, `${language} ${operation} ${scope}`).not.toMatch(/nc_[a-z_]+/);
        expect(html, `${language} ${operation} ${scope}`).not.toContain("{0}");
      }
    }
  });
});

describe("the progress of an order", () => {
  const order: NodeControlOperation = {
    id: "abcd1234", scope: "all", operation: "restart", mode: "rolling", actor: "juan", created_at: "2000-01-01T00:00:00Z", updated_at: "2000-01-01T00:01:00Z", state: "running",
    nodes: [
      { node_id: "radar-1", family: "radar", stage: "back", acknowledged_at: "2000-01-01T00:00:02Z", offline_at: "2000-01-01T00:00:05Z", back_at: "2000-01-01T00:00:40Z", back_after_s: 40, firmware_before: "0.6.8", firmware_after: "0.6.9" },
      { node_id: "solar-1", family: "solar", stage: "refused", refusal: "busy_battery" },
      { node_id: "elec-1", family: "electrical", stage: "offline" },
      { node_id: "hmi-1", family: "hmi", stage: "no_answer" },
      { node_id: "alarm-1", family: "alarm", stage: "not_back" },
    ],
  };
  it("shows every node with its steps, the reason of a refusal in words and what did not come back", () => {
    const html = renderToStaticMarkup(createElement(OperationView, { t: t("en"), operation: order, dismiss: noop }));
    for (const id of ["radar-1", "solar-1", "elec-1", "hmi-1", "alarm-1"]) expect(html).toContain(`nc-line-${id}`);
    expect(html).toContain("order sent");
    expect(html).toContain("acknowledged");
    expect(html).toContain("back after 40 s");
    expect(html).toContain("firmware 0.6.8 → 0.6.9");
    expect(html).toContain("running a battery operation");
    expect(html).toContain("no answer");
    expect(html).toContain("did not come back");
    expect(html).toContain("In progress");
    expect(html).toContain("Rolling (recommended)");
  });
  it("shows the snapshot a diagnostics order returns and the state a pause left the node in", () => {
    const diagnostics: NodeControlOperation = { ...order, scope: "node", operation: "diagnostics", state: "done", nodes: [{ node_id: "radar-1", family: "radar", stage: "applied", state: "paused", until_s: 1800, diagnostics: { firmware: "0.6.9", uptime_s: 7200, reset_reason: "software", heap_free: 120_000, heap_min: 80_000, rssi: -61, mqtt_connected: true, state: "paused", maintenance: false } }] };
    const html = renderToStaticMarkup(createElement(OperationView, { t: t("en"), operation: diagnostics, dismiss: noop }));
    expect(html).toContain("nc-diagnostics");
    expect(html).toContain("0.6.9");
    expect(html).toContain("-61 dBm");
    expect(html).toContain("now paused");
    expect(html).toContain("Finished: 1 done, 0 failed.");
  });
  it("is complete in the eight languages", () => {
    for (const language of locales) {
      const html = renderToStaticMarkup(createElement(OperationView, { t: t(language), operation: order, dismiss: noop }));
      expect(html, language).not.toMatch(/nc_[a-z_]+/);
      expect(html, language).not.toContain("{0}");
    }
  });
});
