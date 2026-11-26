// @vitest-environment jsdom
// "Verify" and the fault list, mounted: nothing is written unless the server's switch is on, the battery was read again and a person confirmed.
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BankPanel, FaultList } from "./BatteryBank";
import { BatteryVerify } from "./BatteryVerify";
import { text } from "./i18n";
import { bankFaults } from "./solarFaults";
import { SOLAR_THRESHOLDS } from "./solarThresholds";
import { bankSummary, type BatteryView } from "./solarTotals";
import type { VerifyTarget } from "./solarVerify";
import { byText, fakeServer, mount } from "./testLive";

const O = "http://armor.local:18080/";
const t = (key: string) => text("en", key);
afterEach(() => { vi.unstubAllGlobals(); document.body.innerHTML = ""; });

const stack: BatteryView = {
  node_id: "solar-1", device: "bank-a", kind: "battery", received_at: "2030-01-01T10:00:00.000Z", stale: false,
  reading: { kind: "battery", node_id: "solar-1", device: "bank-a", timestamp_ms: 1, modules: 1, stack: [{ n: 1, present: true, model: "US2000C", cells_v: [3.3, 3.72], counters: { bat_ov_times: 523 } }] },
};
const counter: VerifyTarget = { kind: "counter", stack: "solar-1/bank-a", node: "solar-1", module: 1, counter: "bat_ov_times", value: 523 };
const props = (target: VerifyTarget, isAdmin = true) => ({ t, origin: O, isAdmin, target, stack, levels: SOLAR_THRESHOLDS.levels, close: () => undefined });
const catalog = { ops: [], limits: { serial_pattern: "^[A-Z0-9]{8,24}$", no_serial: "-" } };
const armed = { id: "op-1", node: "solar-1", port: 1, op: "clear_stats", stage: "armed", snapshot_before: "## stat\nBat OV Times : 523\n" };

describe("verify a figure of a battery", () => {
  it("keeps the write button disabled, with the reason, when the server's switch is off", async () => {
    fakeServer({ "GET /api/v1/solar/battery-ops/catalog": { enabled: false, catalog } });
    const view = await mount(createElement(BatteryVerify, props(counter)));
    await view.settle();
    expect(view.host.textContent).toContain(t("bm_off"));
    expect((byText(view.host, t("solx_clear_button")) as HTMLButtonElement).disabled).toBe(true);
    await view.unmount();
  });

  it("offers no write for a measured value, for a health count or to someone who is not an administrator", async () => {
    const calls = fakeServer({});
    for (const [target, admin, reason] of [
      [{ kind: "live", stack: "solar-1/bank-a", node: "solar-1", module: 1, code: "cell_over", cell: 2 }, true, "solx_clear_not_stored"],
      [{ kind: "soh", stack: "solar-1/bank-a", node: "solar-1", module: 1, cell: 2, value: 4 }, true, "solx_clear_no_command"],
      [counter, false, "solx_clear_admin"],
    ] as const) {
      const view = await mount(createElement(BatteryVerify, props(target, admin)));
      expect(view.host.textContent).toContain(t(reason));
      expect((byText(view.host, t("solx_clear_button")) as HTMLButtonElement).disabled).toBe(true);
      await view.unmount();
    }
    expect(calls.filter(call => call.method === "POST")).toEqual([]);
  });

  it("reads the battery again first and writes only after the box is ticked", async () => {
    const calls = fakeServer({
      "GET /api/v1/solar/battery-ops/catalog": { enabled: true, catalog },
      "POST /api/v1/solar/battery-ops": armed,
      "POST /api/v1/solar/battery-ops/op-1/execute": { ...armed, stage: "done", outcome: "ok" },
    });
    const view = await mount(createElement(BatteryVerify, props(counter)));
    await view.settle();
    const serial = view.host.querySelectorAll("input")[1];
    const { act } = await import("react");
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(serial, "HPTCR03261B14030");
      serial.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await view.click(byText(view.host, t("solx_read_battery")));
    expect(view.host.textContent).toContain("523");
    expect(calls.filter(call => call.method === "POST").map(call => call.body)).toEqual([{ node: "solar-1", port: 1, op: "clear_stats", serial: "HPTCR03261B14030" }]);
    const write = byText(view.host, t("solx_clear_button")) as HTMLButtonElement;
    expect(write.disabled).toBe(true);
    await view.click(view.host.querySelector("input[type='checkbox']"));
    await view.click(byText(view.host, t("solx_clear_button")));
    expect(calls.some(call => call.path.endsWith("/op-1/execute"))).toBe(true);
    expect(view.host.textContent).toContain(t("bm_result_ok"));
    await view.unmount();
  });

  it("lists a cell fault with its place, an icon and words, and hands it to verify", async () => {
    const verify = vi.fn();
    const view = await mount(createElement(FaultList, { t, faults: bankFaults([stack], SOLAR_THRESHOLDS.levels), verify, choose: () => undefined }));
    expect(view.host.textContent).toContain(t("solx_fault_cell_over"));
    expect(view.host.querySelector("li.fault.sl-blink-fault")?.textContent).toContain("✖");
    await view.click(byText(view.host, t("solx_verify")));
    expect(verify).toHaveBeenCalledWith({ kind: "live", stack: "solar-1/bank-a", node: "solar-1", module: 1, code: "cell_over", cell: 2 });
    await view.unmount();
    const fine = await mount(createElement(FaultList, { t, faults: [], verify, choose: () => undefined }));
    expect(fine.host.textContent).toContain(t("solx_all_ok"));
    await fine.unmount();
    const bank = await mount(createElement(BankPanel, { t, bank: bankSummary([stack]), stacks: [stack] }));
    expect(bank.host.textContent).toContain("3.720 V");
    await bank.unmount();
  });
});
