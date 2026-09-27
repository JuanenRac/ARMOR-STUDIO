/**
 * Electrical Designer starting points: an empty drawing, and a house with solar: the grid, its meter and main protections, a distribution board with
 * a few circuits, and two hybrid inverters each with its PV field and its battery bank. It is a sketch to edit, drawn from a description of an
 * installation, with plausible figures where the description had none: check every number before trusting it.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { connect, addElement, addFrame, setProp, updateFrame, updateWire } from "./ops";
import { EMPTY_DESIGN, portPosition, type Design, type FrameColour, type Element } from "./model";

export const emptyDesign = (): Design => ({ ...EMPTY_DESIGN, elements: [], wires: [], frames: [] });

/** A house with solar. `text` gives the phrases the drawing carries (the names of its panels) in the language of the interface. */
export function housePreset(text: (key: string) => string): Design {
  let design = emptyDesign();
  const put = (kind: string, x: number, y: number, props: Record<string, number | string> = {}, name = ""): string => {
    const added = addElement(design, kind, x, y, name);
    if (!added) throw new Error(`cannot place ${kind}`);
    design = added.design;
    for (const [key, value] of Object.entries(props)) design = setProp(design, added.id, key, value);
    return added.id;
  };
  /** Place an element so that one of its ports is at height `y`, so the wire that leaves it runs straight. */
  const putAt = (kind: string, x: number, y: number, portId: string, props: Record<string, number | string> = {}, name = ""): string => {
    const probe: Element = { id: "probe", kind, x, y: 0, name: "", props: {} };
    const at = portPosition(probe, portId);
    if (!at) throw new Error(`no port ${portId} in ${kind}`);
    const id = put(kind, x, 0, props, name);
    design = { ...design, elements: design.elements.map(element => element.id === id ? { ...element, y: y - at.y } : element) };
    return id;
  };
  const link = (from: string, fromPort: string, to: string, toPort: string, section?: number): string => {
    const made = connect(design, { element: from, port: fromPort }, { element: to, port: toPort });
    if (!made.ok) throw new Error(`cannot connect ${from}.${fromPort} to ${to}.${toPort}: ${made.error}`);
    design = made.design;
    if (section !== undefined) design = updateWire(design, made.id, { section_mm2: section });
    return made.id;
  };

  // ---- the supply and the main protections ----
  const row = 300;
  const grid = putAt("grid", 0, row, "out", { contracted_kw: 6.9 });
  const meter = putAt("meter-ac", 140, row, "in", { rating_a: 63 });
  const icp = putAt("mcb", 280, row, "in", { rating_a: 32, curve: "C", poles: "2P" }, "ICP");
  const rcd = putAt("rcd", 400, row, "in", { rating_a: 40, sensitivity_ma: 30, type: "A" });
  const bus = put("busbar-ac", 520, row - 240, { rating_a: 63 });
  link(grid, "out", meter, "in", 10); link(meter, "out", icp, "in", 10); link(icp, "out", rcd, "in", 6); link(rcd, "out", bus, "in", 6);

  // ---- the circuits of the house ----
  const outs = [row - 200, row - 120, row - 40, row + 40, row + 120, row + 200];
  const lightsBreaker = putAt("mcb", 620, outs[0], "in", { rating_a: 10 }); const lights = putAt("lighting", 780, outs[0], "in", { power_w: 300 });
  link(bus, "o1", lightsBreaker, "in"); link(lightsBreaker, "out", lights, "in", 1.5);
  const socketsBreaker = putAt("mcb", 620, outs[1], "in", { rating_a: 16 }); const socketsSwitch = putAt("e-breaker", 740, outs[1], "in", { rating_a: 16 }); const sockets = putAt("socket", 880, outs[1], "in", { power_w: 1500 });
  link(bus, "o2", socketsBreaker, "in"); link(socketsBreaker, "out", socketsSwitch, "in", 2.5); link(socketsSwitch, "out", sockets, "in", 2.5);
  const heaterBreaker = putAt("mcb", 620, outs[2], "in", { rating_a: 16 }); const heaterSwitch = putAt("e-breaker", 740, outs[2], "in", { rating_a: 16 }); const heater = putAt("water-heater", 880, outs[2], "in", { power_w: 1500, volume_l: 100 });
  link(bus, "o3", heaterBreaker, "in"); link(heaterBreaker, "out", heaterSwitch, "in", 2.5); link(heaterSwitch, "out", heater, "in", 2.5);

  // ---- the two solar systems, side by side under the board ----
  const system = (x0: number, breakerX: number, out: string, model: string, props: Record<string, number>, bank: { name: string; props: Record<string, number | string> }, loadW: number) => {
    const acin = row + 440;
    const breaker = putAt("mcb", breakerX, outs[out === "o4" ? 3 : 4], "in", { rating_a: 16 });
    const inverter = putAt("inverter", x0, acin, "acin", props, model);
    const backup = putAt("mcb", x0 + 200, acin + 20, "in", { rating_a: 25 });
    const backupLoad = putAt("load", x0 + 340, acin + 20, "in", { power_w: loadW }, text("elx_backup"));
    link(bus, out, breaker, "in"); link(breaker, "out", inverter, "acin", 2.5); link(inverter, "acout", backup, "in", 4); link(backup, "out", backupLoad, "in", 4);
    const pvArray = put("pv-array", x0 - 120, acin + 140, { strings: 2 });
    const battery = put("battery", x0 - 140, acin + 260, bank.props, bank.name);
    const fuse = put("fuse-dc", x0 + 20, acin + 280, { rating_a: 100, voltage_v: 48 });
    link(pvArray, "dc", inverter, "pv"); link(battery, "dc", fuse, "in", 35); link(fuse, "out", inverter, "bat", 35);
  };
  system(760, 620, "o4", "MPP Solar 5 kW", { rated_w: 5000, nominal_dc_v: 48, acin_max_w: 1000 }, { name: "Pylontech ×61", props: { nominal_v: 48, capacity_ah: 3518, chemistry: "NMC", modules: 61 } }, 1500);
  system(1500, 660, "o5", "Axpert 11 kW", { rated_w: 11000, nominal_dc_v: 48, acin_max_w: 2000 }, { name: "ANT-BMS ×20", props: { nominal_v: 48, capacity_ah: 0, chemistry: "LiFePO4", modules: 20 } }, 3000);

  // ---- an ARMOR node that will read the meter and the switches (a drawing only for now) ----
  const node = put("node", 60, row - 200, { node_id: "electrical-1", channels: 4 });
  link(node, "s1", meter, "sig"); link(node, "s2", socketsSwitch, "sig"); link(node, "s3", heaterSwitch, "sig");

  // ---- panels ----
  const frame = (x: number, y: number, w: number, h: number, name: string, colour: FrameColour) => {
    const added = addFrame(design, x, y, w, h, name);
    if (!added) return;
    design = updateFrame(added.design, added.id, { colour });
  };
  frame(240, 20, 520, 560, text("elx_panel"), "cyan");
  frame(600, 680, 640, 460, text("elx_system1"), "amber");
  frame(1340, 680, 640, 460, text("elx_system2"), "violet");
  return design;
}
