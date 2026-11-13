// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { locales, text } from "../i18n";
import { fakeServer, mount } from "../testLive";
import { ContractSummary } from "./ContractSummary";

const O = "http://armor.local:18080/";
const t = (key: string) => text("en", key);
afterEach(() => { vi.unstubAllGlobals(); document.body.innerHTML = ""; });

const status = (nodes: Array<{ node_id: string; contract: string | null; status: "current" | "older" | "newer" | "unknown" }>) => ({
  server: "0.8.1.3", nodes: nodes.map(node => ({ family: "radar", ...node })),
  totals: { current: nodes.filter(node => node.status === "current").length, older: nodes.filter(node => node.status === "older").length, newer: nodes.filter(node => node.status === "newer").length, unknown: nodes.filter(node => node.status === "unknown").length },
});

describe("the contract version of the nodes", () => {
  it("counts the nodes by state and names the ones that are behind or ahead, telling to update the first", async () => {
    fakeServer({ "GET /api/v1/contract": status([{ node_id: "radar-1", contract: "0.8.1.3", status: "current" }, { node_id: "alarm-1", contract: "0.7.9", status: "older" }, { node_id: "hmi-1", contract: "0.9.0", status: "newer" }, { node_id: "solar-1", contract: null, status: "unknown" }]) });
    const view = await mount(createElement(ContractSummary, { t, origin: O }));
    const box = view.host.querySelector("[data-testid=contract-summary]");
    expect(box?.textContent).toContain("0.8.1.3");
    const names = [...view.host.querySelectorAll("[data-testid=contract-nodes] strong")].map(item => item.textContent);
    expect(names).toEqual(["alarm-1", "hmi-1"]);
    expect(view.host.querySelectorAll("[data-testid=contract-nodes] li")[0]?.textContent).toContain(t("ctrs_update"));
    expect(view.host.querySelectorAll("[data-testid=contract-nodes] li")[1]?.textContent).not.toContain(t("ctrs_update"));
    await view.unmount();
  });

  it("lists nobody when every node is current, and shows nothing when the server has no such route or no node", async () => {
    fakeServer({ "GET /api/v1/contract": status([{ node_id: "radar-1", contract: "0.8.1.3", status: "current" }]) });
    const ok = await mount(createElement(ContractSummary, { t, origin: O }));
    expect(ok.host.querySelector("[data-testid=contract-summary]")).not.toBeNull();
    expect(ok.host.querySelector("[data-testid=contract-nodes]")).toBeNull();
    await ok.unmount();
    fakeServer({});
    const old = await mount(createElement(ContractSummary, { t, origin: O }));
    expect(old.host.innerHTML).toBe("");
    await old.unmount();
    fakeServer({ "GET /api/v1/contract": status([]) });
    const none = await mount(createElement(ContractSummary, { t, origin: O }));
    expect(none.host.innerHTML).toBe("");
    await none.unmount();
  });

  it("has its words in every language, with the version in the help", () => {
    for (const id of ["ctrs_title", "ctrs_help", "ctrs_current", "ctrs_older", "ctrs_newer", "ctrs_unknown", "ctrs_update"]) {
      for (const locale of locales) { const phrase = text(locale, id); expect(phrase.trim().length, `${locale} ${id}`).toBeGreaterThan(1); expect(phrase, `${locale} ${id}`).not.toBe(id); }
    }
    for (const locale of locales) expect(text(locale, "ctrs_help")).toContain("{server}");
  });
});
