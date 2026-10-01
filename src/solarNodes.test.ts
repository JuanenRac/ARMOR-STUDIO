import { describe, expect, it } from "vitest";
import { summariseNodes } from "./SolarNodes";
import type { SolarDeviceView, SolarRegistration } from "./solarModel";

const registration = (node_id: string, device: string, kind: "inverter" | "battery"): SolarRegistration => ({ node_id, device, kind, name: device, model: "voltronic", connection: "rs232", notes: "", created_at: "" });
const view = (node_id: string, device: string, kind: "inverter" | "battery", extra: Partial<SolarDeviceView> = {}): SolarDeviceView =>
  ({ node_id, device, kind, reading: {} as SolarDeviceView["reading"], received_at: "2026-01-01T00:00:10.000Z", stale: false, ...extra });

describe("solar nodes", () => {
  it("counts what each node reads and how it is doing", () => {
    const nodes = summariseNodes(
      [view("solar-1", "inv", "inverter"), view("solar-2", "bat", "battery", { stale: true }), view("solar-3", "inv", "inverter", { example: true })],
      [registration("solar-1", "inv", "inverter"), registration("solar-1", "bat", "battery"), registration("solar-4", "inv", "inverter")],
    );
    expect(nodes.map(node => [node.id, node.inverters, node.batteries, node.state])).toEqual([
      ["solar-1", 1, 1, "reporting"], ["solar-2", 0, 1, "stale"], ["solar-3", 1, 0, "example"], ["solar-4", 1, 0, "waiting"],
    ]);
    expect(nodes[0]!.lastMs).toBe(Date.parse("2026-01-01T00:00:10.000Z"));
  });
});
