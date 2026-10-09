import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { describeStep, fill, FirmwarePanel, firmwareNodes } from "./FirmwarePanel";
import { locales, requiredUiKeys, text } from "./i18n";
import type { NetworkOverview } from "./networkModel";

const device = (ip: string, fields: Record<string, unknown> = {}) => ({ ip, online: true, first_seen_ms: 0, last_seen_ms: 0, ...fields });
const network = (devices: unknown[]) => ({ nodes: [{ devices }], totals: { nodes: 1, stale: 0, devices: devices.length, online: devices.length, unknown: 0, internet: null }, events: [], outages: [] }) as unknown as NetworkOverview;

const found = network([
  device("192.168.0.235", { hostname: "armor-nodo-radar-1.local", ports: [{ port: 80, banner: "A.R.M.O.R. radar" }] }),
  device("192.168.0.236", { hostname: "armor-nodo-radar-2", ports: [{ port: 80, banner: "A.R.M.O.R. Radar" }] }),
  device("192.168.0.50", { vendor: "Espressif Inc." }),
  device("192.168.0.60", { hostname: "armor-pantalla", ports: [{ port: 80, banner: "A.R.M.O.R. HMI" }] }),
  device("192.168.0.1", { hostname: "router", vendor: "ZTE" }),
]);

describe("the node firmware screen", () => {
  it("lists the devices that look like nodes - also the ones already in the system - with the kind their panel says", () => {
    const nodes = firmwareNodes(found);
    expect(nodes.map(node => [node.ip, node.nodeId, node.kind])).toEqual([
      ["192.168.0.50", undefined, undefined],
      ["192.168.0.60", "pantalla", "hmi"],
      ["192.168.0.235", "nodo-radar-1", "radar"],
      ["192.168.0.236", "nodo-radar-2", "radar"],
    ]);
    expect(firmwareNodes(null)).toEqual([]);
  });

  it("shows the nodes of the chosen kind (and the ones whose kind is not known yet), and a start button that waits for a selection and a login", () => {
    const html = renderToStaticMarkup(createElement(FirmwarePanel, { t: key => text("en", key), origin: "http://x", isAdmin: true, network: found }));
    expect(html).toContain("nodo-radar-1");
    expect(html).toContain("nodo-radar-2");
    expect(html).toContain("192.168.0.50");
    expect(html).not.toContain("pantalla");
    expect(html).toMatch(new RegExp(`<button class="primary" type="submit" disabled="">${text("en", "fw_start")}</button>`));
  });

  it("is for administrators only", () => {
    const html = renderToStaticMarkup(createElement(FirmwarePanel, { t: key => text("es", key), origin: "http://x", isAdmin: false, network: found }));
    expect(html).toContain(text("es", "cs_admin_only"));
    expect(html).not.toContain("<input");
  });

  it("has every phrase in all seven languages, and a message for every reason the server gives", () => {
    const wanted = requiredUiKeys.filter(key => key.startsWith("fw_") || key === "tabFirmware");
    expect(wanted.length).toBeGreaterThan(60);
    for (const locale of locales) for (const key of wanted) expect(text(locale, key).trim().length, `${locale} ${key}`).toBeGreaterThan(0);
    const reasons = ["node_not_reachable", "panel_login_refused", "panel_login_failed", "upload_failed", "hash_mismatch", "did_not_come_back", "checksum_mismatch", "no_checksum", "no_release", "no_image_in_release", "github_unreachable", "download_failed", "bad_size", "not_firmware", "job_running", "no_panel_login", "invalid_address", "node_wrong_firmware", "node_not_firmware"];
    for (const reason of reasons) expect(requiredUiKeys, reason).toContain(`fw_err_${reason}`);
    for (const state of ["waiting", "checking", "signing_in", "uploading", "restarting", "done", "failed"]) expect(requiredUiKeys).toContain(`fw_state_${state}`);
  });

  it("says what a node is doing at each step, with the numbers that make it concrete, in every language", () => {
    expect(fill("{0} of {1} ({2}%)", 5, 10, 50)).toBe("5 of 10 (50%)");
    for (const locale of locales) {
      const t = (key: string) => text(locale, key);
      const uploading = describeStep(t, { address: "10.0.0.2", state: "uploading", sent: 512 * 1024, total: 1024 * 1024 });
      expect(uploading, locale).toContain("512");
      expect(uploading, locale).toContain("1024");
      expect(uploading, locale).toContain("50%");
      expect(uploading, locale).not.toContain("{");
      const restarting = describeStep(t, { address: "10.0.0.2", state: "restarting", waited_s: 7 }, "0.5.4");
      expect(restarting, locale).toContain("0.5.4");
      expect(restarting, locale).toContain("7");
      expect(describeStep(t, { address: "10.0.0.2", state: "done", version_after: "0.5.4" }), locale).toContain("0.5.4");
      expect(describeStep(t, { address: "10.0.0.2", state: "failed", error: "panel_login_refused" }), locale).toContain(text(locale, "fw_err_panel_login_refused"));
      for (const state of ["waiting", "checking", "signing_in"] as const) expect(describeStep(t, { address: "10.0.0.2", state }), `${locale} ${state}`).toBe(text(locale, `fw_step_${state}`));
    }
  });
});
