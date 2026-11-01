// @vitest-environment jsdom
import { createElement, useContext } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { panelUrl } from "./panelUrl";
import { KnownNodesContext } from "./knownNodes";
import { StreamRenewContext } from "./streamContext";
import { menuTourId } from "./tour/menuTourId";
import { alarmAdapter } from "./alarm/useAlarmDesignSync";
import { electricalAdapter } from "./electrical/useElectricalSync";
import { networkAdapter } from "./network/useNetworkSync";

describe("the address of the web panel of a node", () => {
  it("leaves port 80 out and keeps any other port", () => {
    expect(panelUrl({ ip: "192.168.0.50", port: 80 })).toBe("http://192.168.0.50/");
    expect(panelUrl({ ip: "192.168.0.50", port: 8080 })).toBe("http://192.168.0.50:8080/");
  });
});

describe("the shared contexts and ids that had no test", () => {
  it("know no nodes and renew no stream until the console provides them", () => {
    let known: unknown; let renew: unknown;
    function Probe() { known = useContext(KnownNodesContext); renew = useContext(StreamRenewContext); return null; }
    renderToStaticMarkup(createElement(Probe));
    expect(known).toEqual({ ids: [], ips: [] });
    expect(typeof renew).toBe("function");
    expect((renew as (id: string) => void)("camera-1")).toBeUndefined();
  });

  it("the tour of a menu is named after it, in lower case", () => {
    expect(menuTourId("Alarms")).toBe("menu-alarms");
    expect(menuTourId("siteDesigner")).toBe("menu-sitedesigner");
  });

  it("the three drawings keep themselves on the server under their own kind, key and browser copy", () => {
    const adapters = [alarmAdapter, electricalAdapter, networkAdapter];
    expect(new Set(adapters.map(adapter => adapter.kind)).size).toBe(3);
    expect(new Set(adapters.map(adapter => adapter.legacyKey)).size).toBe(3);
    for (const adapter of adapters) {
      expect(typeof adapter.read).toBe("function");
      expect(typeof adapter.save).toBe("function");
      expect(typeof adapter.build).toBe("function");
      expect(typeof adapter.parse).toBe("function");
    }
  });
});
