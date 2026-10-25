// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NodeToolbar, type ToolbarProps } from "./NodeToolbar";
import { panelFromNetwork } from "./NodeTools";
import { text } from "../i18n";
import type { NodeHealthItem } from "../api";
import type { NetworkOverview } from "../networkModel";

let root: Root | null = null;
let host: HTMLElement | null = null;
const t = (key: string) => text("en", key);
const health = { node_id: "r1", family: "radar", stale: false, status: "ok", report: { control_state: "running", maintenance: false } } as unknown as NodeHealthItem;

const draw = async (props: Partial<ToolbarProps>) => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  const full: ToolbarProps = { t, origin: "http://srv:8080", id: "r1", panel: { ip: "192.168.0.220", port: 80 }, silent: false, health, isAdmin: true, detailsOpen: false, toggleDetails: () => undefined, control: () => undefined, forget: () => undefined, ...props };
  await act(async () => { root!.render(createElement(NodeToolbar, full)); });
  return host;
};
const labels = (view: HTMLElement) => [...view.querySelectorAll(".nt-btn")].map(item => item.getAttribute("aria-label"));

describe("the icon buttons of a field node", () => {
  beforeEach(() => { (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; });
  afterEach(async () => { await act(async () => { root?.unmount(); }); host?.remove(); root = null; host = null; });

  it("offers the panel, the configuration through the server, the details and the orders of a running node to an administrator", async () => {
    const view = await draw({});
    const links = [...view.querySelectorAll("a.nt-btn")].map(item => item.getAttribute("href"));
    expect(links).toEqual(["http://192.168.0.220/", "http://srv:8080/api/v1/nodes/r1/panel/"]);
    const names = labels(view);
    for (const key of ["nh_details", "nc_op_pause", "nc_op_standby", "nc_op_restart", "nc_op_identify", "nc_op_diagnostics"]) expect(names).toContain(t(key));
    expect(names).not.toContain(t("forgetNode"));
    expect(view.querySelectorAll(".nt-btn svg").length).toBe(names.length);
  });

  it("gives no orders and no configuration to someone who is not an administrator, and only forgets a node that is silent", async () => {
    const plain = await draw({ isAdmin: false });
    expect(labels(plain)).toEqual([t("rn_open_direct"), t("nh_details")]);
    await act(async () => { root?.unmount(); });
    plain.remove();
    const silent = await draw({ silent: true, health: { ...health, stale: true } as NodeHealthItem });
    expect(labels(silent)).toContain(t("forgetNode"));
    expect(labels(silent)).not.toContain(t("nc_op_restart"));
  });

  it("tells the click of an order and the click of forgetting", async () => {
    const control = vi.fn(), forget = vi.fn();
    const view = await draw({ control, forget, silent: true });
    await act(async () => { (view.querySelector(`[aria-label="${t("nc_op_restart")}"]`) as HTMLElement).click(); });
    expect(control).toHaveBeenCalledWith({ operation: "restart", label: "nc_op_restart" });
    await act(async () => { (view.querySelector(`[aria-label="${t("forgetNode")}"]`) as HTMLElement).click(); });
    expect(forget).toHaveBeenCalledTimes(1);
  });

  it("finds the own panel of a node from what the network node found", () => {
    const network = { nodes: [{ devices: [{ ip: "192.168.0.226", hostname: "armor-solar-1.local" }, { ip: "192.168.0.220", hostname: "nodo-radar-1" }] }] } as unknown as NetworkOverview;
    expect(panelFromNetwork(network, "solar-1")).toEqual({ ip: "192.168.0.226", port: 80 });
    expect(panelFromNetwork(network, "nodo-radar-1")).toEqual({ ip: "192.168.0.220", port: 80 });
    expect(panelFromNetwork(network, "other")).toBeNull();
    expect(panelFromNetwork(null, "x")).toBeNull();
  });
});
