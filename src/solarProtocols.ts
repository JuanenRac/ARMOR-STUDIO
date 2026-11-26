/**
 * The equipment protocols a gateway node speaks: the id every part of A.R.M.O.R. uses, the port setting that selects it on the node and its serial line (8N1 in all of them). A server
 * that hands out the shared table (catalog.protocols) is followed; this copy stands in otherwise. Whatever the protocol, the readings arrive as the same two messages, the inverter's
 * (also a solar charger's) or the battery's.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
/** The fields are the ones of the shared table (catalog.protocols of the HTTP contract). */
export type SolarProtocol = { id: string; port_kind: string; dialect: string; baud: number; message: "inverter" | "battery"; label?: string };

export const SOLAR_PROTOCOLS: readonly SolarProtocol[] = [
  { id: "pi30", port_kind: "voltronic", dialect: "pi30", baud: 2400, message: "inverter", label: "PI30 (Axpert, PIP)" },
  { id: "pi00", port_kind: "voltronic", dialect: "pi00", baud: 2400, message: "inverter", label: "PI00 / PI16 (no CRC)" },
  { id: "pi17", port_kind: "voltronic", dialect: "pi17", baud: 2400, message: "inverter", label: "PI17 (InfiniSolar)" },
  { id: "pi30-revo", port_kind: "voltronic", dialect: "revo", baud: 2400, message: "inverter", label: "PI30 REVO" },
  { id: "pi18", port_kind: "voltronic", dialect: "pi18", baud: 2400, message: "inverter", label: "PI18 (InfiniSolar V)" },
  { id: "pi41", port_kind: "voltronic", dialect: "pi41", baud: 2400, message: "inverter", label: "PI41" },
  { id: "pi34", port_kind: "voltronic", dialect: "pi34", baud: 2400, message: "inverter", label: "PI34 (MPPT)" },
  { id: "modbus-smg2", port_kind: "modbus", dialect: "smg2", baud: 9600, message: "inverter", label: "Modbus SMG II" },
  { id: "modbus-srne-hybrid", port_kind: "modbus", dialect: "srne-hybrid", baud: 9600, message: "inverter", label: "Modbus SRNE hybrid" },
  { id: "modbus-srne-mppt", port_kind: "modbus", dialect: "srne-mppt", baud: 9600, message: "inverter", label: "Modbus SRNE MPPT" },
  { id: "vedirect-mppt", port_kind: "vedirect", dialect: "mppt", baud: 19200, message: "inverter", label: "VE.Direct MPPT" },
  { id: "vedirect-monitor", port_kind: "vedirect", dialect: "monitor", baud: 19200, message: "battery", label: "VE.Direct monitor" },
  { id: "vedirect-inverter", port_kind: "vedirect", dialect: "inverter", baud: 19200, message: "inverter", label: "VE.Direct Phoenix inverter" },
  { id: "vedirect-monitor-hex", port_kind: "vedirect", dialect: "monitor-hex", baud: 19200, message: "battery", label: "VE.Direct monitor (HEX)" },
  { id: "pylontech-console", port_kind: "pylontech", dialect: "", baud: 115200, message: "battery", label: "Pylontech console" },
  { id: "ant-bms", port_kind: "ant", dialect: "", baud: 19200, message: "battery", label: "ANT-BMS" },
  { id: "daly-uart", port_kind: "daly", dialect: "", baud: 9600, message: "battery", label: "Daly UART" },
  { id: "jbd", port_kind: "jbd", dialect: "", baud: 9600, message: "battery", label: "JBD" },
  { id: "jk-rs485", port_kind: "jk", dialect: "", baud: 115200, message: "battery", label: "JK RS485" },
];

/** The protocols that give readings of a kind of equipment, from the server's table when it has one. */
export function protocolsFor(kind: "inverter" | "battery", served?: readonly SolarProtocol[]): SolarProtocol[] {
  return (served && served.length > 0 ? served : SOLAR_PROTOCOLS).filter(item => item.message === kind);
}

/** The protocol a model is likely to need: by the dialect the server names for an inverter family, by the make for a battery; undefined when nothing tells (the person chooses). */
export function likelyProtocol(kind: "inverter" | "battery", model: string, dialect: string | undefined, list: readonly SolarProtocol[]): SolarProtocol | undefined {
  if (kind === "inverter") return dialect && dialect !== "auto" ? list.find(item => item.message === "inverter" && item.dialect === dialect) : undefined;
  const port = /^pylontech/.test(model) ? "pylontech" : /^ant-bms/.test(model) ? "ant" : /^daly/.test(model) ? "daly" : /^jbd/.test(model) ? "jbd" : /^jk/.test(model) ? "jk" : undefined;
  return list.find(item => item.port_kind === port);
}
