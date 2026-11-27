// The three levels of a battery's states, and a module that does not read three of its cells (invented figures), as the server hands it to the Batteries screen.
import { describe, expect, it } from "vitest";
import { SOLAR_THRESHOLDS } from "./solarThresholds";
import { makerText, stateLevel, type SolarDeviceView, type SolarModuleReading } from "./solarModel";
import { bankFaults, blinking, moduleFaults } from "./solarFaults";

const levels = SOLAR_THRESHOLDS.levels;
const cells = Array.from({ length: 15 }, (_, index) => (index >= 3 && index <= 5 ? 0 : 3.33));
const module: SolarModuleReading = { n: 2, present: true, model: "US2000C", cells_v: cells, cells_unread: [3, 4, 5], flags: [{ column: "voltage", word: "UV", cell: 3 }, { column: "voltage", word: "High" }] };

describe("battery states", () => {
  it("tells a notice from a protection from a fault", () => {
    expect(stateLevel({ column: "voltage", word: "High" })).toBe(1);
    expect(stateLevel({ column: "system", word: "High" })).toBe(2);
    expect(stateLevel({ column: "voltage", word: "OV" })).toBe(2);
    expect(stateLevel({ column: "voltage", word: "NeverSeen" })).toBe(2);
    expect(stateLevel({ column: "base", word: "SysError" })).toBe(3);
  });

  it("names the three cells that are not read first, as a fault of the BMS, not as the lowest cells of the pack", () => {
    const found = moduleFaults(module, levels, true);
    expect(found.filter(item => item.code === "bms_fault").map(item => item.cell)).toEqual([4, 5, 6]);
    expect(found[0]!.code).toBe("bms_fault");
    expect(found.some(item => item.code === "bms_protect" && item.cell === 4 && item.detail === "voltage UV")).toBe(true);
    expect(found.some(item => item.code === "bms_notice" && item.severity === "warn")).toBe(true);
    expect(found.some(item => item.code === "cell_implausible" || item.code === "delta_high")).toBe(false);
  });

  it("keeps the fault in the list of the bank and never makes it blink", () => {
    const view: SolarDeviceView = { node_id: "solar-1", device: "bank-1", kind: "battery", received_at: "2000-01-01T00:00:00Z", stale: false, reading: { kind: "battery", node_id: "solar-1", device: "bank-1", timestamp_ms: 1, modules: 1, alarm: true, stack: [{ ...module, flags: undefined }] } };
    const faults = bankFaults([view], levels);
    expect(faults.filter(fault => fault.code === "bms_fault")).toHaveLength(3);
    expect(faults.some(fault => fault.code === "stack_alarm")).toBe(false);
    expect(blinking(faults, faults[0]!.stack, 2, 4)).toBe(false);
  });

  it("writes the maker, says when it is deduced and never makes one up", () => {
    expect(makerText({ manufacturer: "Pylon", manufacturer_source: "reported" }, "deduced")).toBe("Pylon");
    expect(makerText({ manufacturer: "Daly", manufacturer_source: "deduced" }, "deduced")).toBe("Daly (deduced)");
    expect(makerText({}, "deduced")).toBe("");
  });
});
