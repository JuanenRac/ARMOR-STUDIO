/**
 * The equipment protocols a gateway node speaks: the id every part of A.R.M.O.R. uses, the port setting that selects it on the node and its serial line (8N1 in all of them). A server
 * that hands out the shared table (catalog.protocols) is followed; this copy stands in otherwise. Whatever the protocol, the readings arrive as the same two messages, the inverter's
 * (also a solar charger's) or the battery's.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
export type SolarProtocol = { id: string; port: string; dialect: string; baud: number; message: "inverter" | "battery"; name?: string };

export const SOLAR_PROTOCOLS: readonly SolarProtocol[] = [
  { id: "pi30", port: "voltronic", dialect: "pi30", baud: 2400, message: "inverter", name: "PI30 (Axpert, PIP)" },
  { id: "pi30-revo", port: "voltronic", dialect: "revo", baud: 2400, message: "inverter", name: "PI30 REVO" },
  { id: "pi18", port: "voltronic", dialect: "pi18", baud: 2400, message: "inverter", name: "PI18 (InfiniSolar V)" },
  { id: "pi41", port: "voltronic", dialect: "pi41", baud: 2400, message: "inverter", name: "PI41" },
  { id: "pi34", port: "voltronic", dialect: "pi34", baud: 2400, message: "inverter", name: "PI34 (MPPT)" },
  { id: "modbus-smg2", port: "modbus", dialect: "smg2", baud: 9600, message: "inverter", name: "Modbus SMG II" },
  { id: "modbus-srne-hybrid", port: "modbus", dialect: "srne-hybrid", baud: 9600, message: "inverter", name: "Modbus SRNE hybrid" },
  { id: "modbus-srne-mppt", port: "modbus", dialect: "srne-mppt", baud: 9600, message: "inverter", name: "Modbus SRNE MPPT" },
  { id: "vedirect-mppt", port: "vedirect", dialect: "mppt", baud: 19200, message: "inverter", name: "VE.Direct MPPT" },
  { id: "vedirect-monitor", port: "vedirect", dialect: "monitor", baud: 19200, message: "battery", name: "VE.Direct monitor" },
  { id: "pylontech-console", port: "pylontech", dialect: "", baud: 115200, message: "battery", name: "Pylontech console" },
  { id: "ant-bms", port: "ant", dialect: "", baud: 19200, message: "battery", name: "ANT-BMS" },
  { id: "daly-uart", port: "daly", dialect: "", baud: 9600, message: "battery", name: "Daly UART" },
  { id: "jbd", port: "jbd", dialect: "", baud: 9600, message: "battery", name: "JBD" },
  { id: "jk-rs485", port: "jk", dialect: "", baud: 115200, message: "battery", name: "JK RS485" },
];

/** The protocols that give readings of a kind of equipment, from the server's table when it has one. */
export function protocolsFor(kind: "inverter" | "battery", served?: readonly SolarProtocol[]): SolarProtocol[] {
  return (served && served.length > 0 ? served : SOLAR_PROTOCOLS).filter(item => item.message === kind);
}

/** The protocol a model is likely to need: by the dialect the server names for an inverter family, by the make for a battery; undefined when nothing tells (the person chooses). */
export function likelyProtocol(kind: "inverter" | "battery", model: string, dialect: string | undefined, list: readonly SolarProtocol[]): SolarProtocol | undefined {
  if (kind === "inverter") return dialect && dialect !== "auto" ? list.find(item => item.port === "voltronic" && item.dialect === dialect) : undefined;
  const port = /^pylontech/.test(model) ? "pylontech" : /^ant-bms/.test(model) ? "ant" : /^daly/.test(model) ? "daly" : /^jbd/.test(model) ? "jbd" : /^jk/.test(model) ? "jk" : undefined;
  return list.find(item => item.port === port);
}
