/**
 * Writing to a Pylontech battery, what the screen needs to know that is not drawing: how the operations are grouped, how the values the person types become the values the server
 * takes (volts and degrees to milli-units, whole groups only), and when a step may go on. The ranges are the server's table (ARMOR-COMMON battery_ops.json); the server and the node
 * check them again, so this only saves the person a refusal.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { BatteryCatalog, BatteryImage, BatteryLimitGroup, BatteryOpSpec, BatteryOperation } from "./api/battery";

export type BatteryForm = {
  which: string; group: string; limits: Record<string, string>; protections: Record<string, "keep" | "en" | "dis">; acceptRisk: boolean; output: string; state: string;
  label: string; restoreBarcode: boolean; clearEeprom: boolean; line: string; image: BatteryImage | null;
};

export const emptyForm = (): BatteryForm => ({ which: "event", group: "module_voltage", limits: {}, protections: {}, acceptRisk: false, output: "cfet", state: "off", label: "", restoreBarcode: true, clearEeprom: false, line: "", image: null });

export const GROUP_ORDER = ["clock", "maintenance", "soc", "limits", "outputs", "eeprom", "firmware", "expert"] as const;

/** The operations of the table by group, in the order a person looks for them. */
export function operationGroups(catalog: BatteryCatalog): { group: string; ops: BatteryOpSpec[] }[] {
  return GROUP_ORDER.map(group => ({ group, ops: catalog.ops.filter(item => item.group === group) })).filter(item => item.ops.length > 0);
}

export const specOf = (catalog: BatteryCatalog, id: string): BatteryOpSpec | undefined => catalog.ops.find(item => item.id === id);
export const limitGroupOf = (catalog: BatteryCatalog, name: string): BatteryLimitGroup | undefined => catalog.limit_groups.find(item => item.name === name);

/** How a group of limits is shown: voltages in volts (3 decimals), temperatures in degrees (1 decimal). The server takes milli-units. */
export function scaleOf(group: BatteryLimitGroup): { divisor: number; decimals: number; unit: string } {
  return group.unit === "mV" ? { divisor: 1000, decimals: 3, unit: "V" } : { divisor: 1000, decimals: 1, unit: "°C" };
}
export function showLimit(group: BatteryLimitGroup, value: number): string {
  const scale = scaleOf(group);
  return (value / scale.divisor).toFixed(scale.decimals);
}
/** The milli-units of a typed number, or undefined when it is not a number (a comma is taken as a point). */
export function readLimit(group: BatteryLimitGroup, typed: string): number | undefined {
  const text = typed.trim().replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(text)) return undefined;
  return Math.round(Number(text) * scaleOf(group).divisor);
}

export const serialLooksRight = (catalog: BatteryCatalog, text: string): boolean => text === catalog.limits.no_serial || new RegExp(catalog.limits.serial_pattern).test(text);

export type Built = { ok: true; params: Record<string, unknown> } | { ok: false; problem: string };

/** The values to send for an operation from what the person filled in, or the key of the sentence that says what is missing or wrong. */
export function buildParams(catalog: BatteryCatalog, op: string, form: BatteryForm): Built {
  const spec = specOf(catalog, op);
  if (!spec) return { ok: false, problem: "bm_prob_choose" };
  const params: Record<string, unknown> = {};
  for (const [name, rule] of Object.entries(spec.params)) {
    switch (rule.type) {
      case "enum":
        if (name === "which") params.which = form.which;
        else if (name === "group") params.group = form.group;
        else if (name === "output") params.output = form.output;
        else if (name === "state") params.state = form.state;
        break;
      case "serial":
        if (!new RegExp(catalog.limits.serial_pattern).test(form.label.trim())) return { ok: false, problem: "bm_prob_label" };
        params.serial = form.label.trim();
        break;
      case "boolean":
        if (name === "restore_barcode") params.restore_barcode = form.restoreBarcode;
        else if (name === "clear_eeprom") { if (form.clearEeprom) params.clear_eeprom = true; }
        else if (name === "accept_risk") { if (form.acceptRisk) params.accept_risk = true; }
        break;
      case "limits": {
        const group = limitGroupOf(catalog, form.group);
        if (!group) return { ok: false, problem: "bm_prob_choose" };
        const values: Record<string, number> = {};
        for (const [key] of group.keys) {
          const number = readLimit(group, form.limits[`${group.name}.${key}`] ?? "");
          if (number === undefined) return { ok: false, problem: "bm_prob_limits" };
          if (number < group.lowest || number > group.highest) return { ok: false, problem: "bm_prob_range" };
          values[key] = number;
        }
        for (const [low, high] of group.orders) if (values[low] > values[high]) return { ok: false, problem: "bm_prob_order" };
        params.values = values;
        break;
      }
      case "protections": {
        const items: Record<string, string> = {};
        for (const [key, state] of Object.entries(form.protections)) if (state === "en" || state === "dis") items[key] = state;
        if (Object.keys(items).length === 0) return { ok: false, problem: "bm_prob_protections" };
        if (Object.values(items).includes("dis") && !form.acceptRisk) return { ok: false, problem: "bm_prob_risk" };
        params.items = items;
        break;
      }
      case "integer": case "string":
        if (name === "line") {
          if (!form.line.trim() || form.line.length > 48) return { ok: false, problem: "bm_prob_line" };
          params.line = form.line;
        } else if (name === "image_size" || name === "image_crc32" || name === "image_version") {
          if (!form.image) return { ok: false, problem: "bm_prob_image" };
        }
        break;
      default: break;
    }
  }
  if (op === "firmware_update") params.image_id = form.image?.image_id;
  return { ok: true, params };
}

/** An operation that is over, or has not got a node's answer yet, is not "active". */
export const ACTIVE_STAGES = ["arming", "armed", "starting", "running"] as const;
export const isActive = (operation: BatteryOperation | undefined): boolean => operation !== undefined && (ACTIVE_STAGES as readonly string[]).includes(operation.stage);

/** How far a running operation is, 0 to 100, from the steps and, for a firmware transfer, from the packets. */
export function percentOf(operation: BatteryOperation): number {
  if (operation.stage === "done") return 100;
  if (operation.staging && operation.staging.total > 0) return Math.round(operation.staging.sent * 100 / operation.staging.total);
  if (operation.packets_total && operation.packets_total > 0) return Math.round((operation.packets_sent ?? 0) * 100 / operation.packets_total);
  if (operation.steps_total && operation.steps_total > 0) return Math.round((operation.steps_done ?? 0) * 100 / operation.steps_total);
  return 0;
}

/** The nodes that have a battery to talk to: the nodes of the batteries that report. */
export function batteryNodes(devices: { node_id: string; kind: string }[]): string[] {
  return [...new Set(devices.filter(item => item.kind === "battery").map(item => item.node_id))].sort();
}

/** The sentence key of an error code of the server or a refusal of the node. */
export function errorKey(code: string, known: (key: string) => boolean): string {
  for (const key of [`bm_err_${code}`, `bm_ref_${code}`]) if (known(key)) return key;
  return "bm_err_generic";
}
