/**
 * The list of the batteries by serial number: one row per module that is there in every stack the gateway nodes read (example readings left out), and that list as CSV. The serial
 * numbers are private data: they are shown to signed-in users only, and the file is made here, in the browser, when somebody asks for it.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { displayName, type SolarBatteryReading, type SolarDeviceView, type SolarModuleReading } from "./solarModel";

export type SerialRow = { node: string; stack: string; module: number; data: SolarModuleReading };

export function serialRows(devices: readonly SolarDeviceView[]): SerialRow[] {
  const rows: SerialRow[] = [];
  for (const view of devices) {
    if (view.kind !== "battery" || view.example) continue;
    for (const data of (view.reading as SolarBatteryReading).stack) if (data.present) rows.push({ node: view.node_id, stack: displayName(view), module: data.n, data });
  }
  return rows.sort((a, b) => a.node.localeCompare(b.node) || a.stack.localeCompare(b.stack) || a.module - b.module);
}

/** The words the columns of the file are headed with, and the word of each chip. */
export const SERIAL_COLUMNS = ["bat_node_col", "solx_serial_stack", "solarModule", "solarModuleModel", "solx_serial", "solx_chip", "solx_board", "solx_spec", "solx_soft", "solx_main_soft", "solx_boot", "solx_comm", "solx_board_version", "solx_released", "solarCycles", "solarHealth"] as const;

export const chipKey = (chip: SolarModuleReading["chip"]): string => `solx_chip_${chip ?? "unknown"}`;

/** A field of a CSV file. One that a spreadsheet would take for a formula gets a quote in front, so that it stays a text. */
export function csvField(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function serialsCsv(rows: readonly SerialRow[], t: (key: string) => string): string {
  const text = (value: string | number | undefined) => (value === undefined ? "" : String(value));
  const lines = [SERIAL_COLUMNS.map(key => t(key)), ...rows.map(({ node, stack, module, data }) => [node, stack, String(module), text(data.model), text(data.serial), data.chip ? t(chipKey(data.chip)) : "",
    text(data.board), text(data.specification), text(data.soft_version), text(data.main_soft_version), text(data.boot_version), text(data.comm_version), text(data.board_version), text(data.release_date),
    text(data.cycles), text(data.health_percent)])];
  return lines.map(line => line.map(csvField).join(",")).join("\r\n") + "\r\n";
}
