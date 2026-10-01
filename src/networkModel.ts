/**
 * The Network menu, without the screen: the shapes the server sends about the local network, and the small functions that turn them into what a person reads (a name for a
 * device, "3 min", "1.2 Mbit/s", the sentence of an event) and into lines for the charts. Plain data and pure functions, tested apart from React.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */

export const NETWORK_KINDS = ["router", "computer", "phone", "tv", "printer", "camera", "iot", "server", "nas", "network", "unknown"] as const;
export type NetworkKind = (typeof NETWORK_KINDS)[number];
export type InternetState = "up" | "degraded" | "down" | "lan_down" | "unknown";

export type NetworkPort = { port: number; proto: "tcp" | "udp"; service?: string; banner?: string };
export type DeviceNote = { name?: string; notes?: string; trusted?: boolean; kind?: NetworkKind; /** Left out of the list. */ hidden?: boolean; /** Tell me the next time it comes onto the network. */ watch?: boolean; updated_at: string };
export type NetworkDevice = {
  id: string; ip: string; mac?: string; randomized_mac?: boolean; vendor?: string; hostname?: string; kind?: NetworkKind; os?: string; online: boolean;
  first_seen_ms: number; last_seen_ms: number; latency_ms?: number; ports?: NetworkPort[]; services?: string[]; note?: DeviceNote; /** Present when an administrator kept a login for its web administration (only the user, never the password). */ login?: { user: string };
};
export type NetworkProbe = { target: string; kind: "icmp" | "tcp" | "dns" | "http"; ok: boolean; latency_ms?: number };
export type NetworkInternet = {
  state: InternetState; since_ms?: number; gateway_ok?: boolean; latency_ms?: number; loss_percent?: number; probes?: NetworkProbe[];
  last_outage?: { started_ms: number; ended_ms: number; duration_s: number }; outages_24h?: number; downtime_24h_s?: number;
};
/** What the internet sees of the connection, as the node asked a public service. */
export type NetworkPublic = { ip: string; hostname?: string; city?: string; region?: string; country?: string; org?: string; timezone?: string; checked_ms: number; changed_ms?: number };
export type NetworkNode = {
  node_id: string; received_at: string; stale: boolean; public?: NetworkPublic; /** How many devices are hidden from the list. */ hidden?: number;
  interface: { name: string; ip: string; cidr: string; gateway?: string; rx_bps?: number; tx_bps?: number };
  internet: NetworkInternet; devices: NetworkDevice[]; scan?: { last_ms: number; hosts: number; duration_ms?: number };
};
export type NetworkEventKind = "new_device" | "device_online" | "device_offline" | "ip_changed" | "arp_conflict" | "port_opened" | "port_closed" | "internet_down" | "internet_up" | "gateway_down" | "gateway_up";
export type NetworkEvent = { id: string; kind: NetworkEventKind; at_ms: number; device_id?: string; port?: number; outage_s?: number; detail?: string; node_id: string };
export type NetworkOutage = { node_id: string; kind: "internet" | "gateway"; started_ms: number; ended_ms: number; duration_s: number };
export type NetworkOverview = {
  nodes: NetworkNode[];
  totals: { nodes: number; stale: number; devices: number; online: number; unknown: number; internet: InternetState | null };
  events: NetworkEvent[]; outages: NetworkOutage[];
};
export type NetworkSample = { t: number; state: InternetState; latency_ms?: number; loss_percent?: number; rx_bps?: number; tx_bps?: number };

/** Ports a house rarely wants open on a device anyone on the network can reach (the same list the server uses to call an opened port serious). */
export const RISKY_PORTS: ReadonlySet<number> = new Set([21, 23, 445, 3306, 3389, 5432, 5900, 6379, 7547]);

export const KIND_ICON: Record<NetworkKind, string> = { router: "⇄", computer: "▭", phone: "▯", tv: "▬", printer: "▤", camera: "◉", iot: "◈", server: "▦", nas: "▥", network: "⌬", unknown: "?" };
export const kindOf = (device: NetworkDevice): NetworkKind => device.note?.kind ?? device.kind ?? "unknown";

/** What to call a device: what the operator named it, else the name it gives itself, else its maker, else its address. */
export const deviceName = (device: NetworkDevice): string => device.note?.name || device.hostname || device.vendor || device.ip;
export const isKnown = (device: NetworkDevice): boolean => device.note?.trusted === true;

const ipKey = (ip: string): number => ip.split(".").reduce((sum, part) => sum * 256 + Number(part), 0);
export const sortByAddress = (devices: readonly NetworkDevice[]): NetworkDevice[] => [...devices].sort((a, b) => ipKey(a.ip) - ipKey(b.ip));

export type DeviceFilter = { query: string; kind: string; onlyUnknown: boolean; onlyOffline: boolean };
export function filterDevices(devices: readonly NetworkDevice[], filter: DeviceFilter): NetworkDevice[] {
  const query = filter.query.trim().toLowerCase();
  return sortByAddress(devices).filter(device => {
    if (filter.kind && kindOf(device) !== filter.kind) return false;
    if (filter.onlyUnknown && isKnown(device)) return false;
    if (filter.onlyOffline && device.online) return false;
    if (!query) return true;
    return [deviceName(device), device.ip, device.mac ?? "", device.vendor ?? "", device.hostname ?? "", device.note?.notes ?? ""].some(field => field.toLowerCase().includes(query));
  });
}

/** 1200000 -> "1.2 Mbit/s". */
export function formatBps(bps: number | undefined): string {
  if (bps === undefined) return "—";
  if (bps >= 1e9) return `${(bps / 1e9).toFixed(2)} Gbit/s`;
  if (bps >= 1e6) return `${(bps / 1e6).toFixed(bps >= 1e7 ? 0 : 1)} Mbit/s`;
  if (bps >= 1e3) return `${Math.round(bps / 1e3)} kbit/s`;
  return `${bps} bit/s`;
}

/** 45 -> "45 s", 200 -> "3 min", 7500 -> "2 h 5 min", 200000 -> "2 d 7 h". */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
  const d = Math.floor(h / 24);
  return h % 24 ? `${d} d ${h % 24} h` : `${d} d`;
}

/** How long ago a moment was, in the same short form ("just now" is left to the caller: anything under five seconds is "0 s"). */
export const formatAgo = (atMs: number, nowMs: number): string => formatDuration((nowMs - atMs) / 1000);

export const formatTime = (atMs: number): string => new Date(atMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
export const formatDateTime = (atMs: number): string => new Date(atMs).toLocaleString([], { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** The colour class of the internet's state. */
export const internetTone = (state: InternetState): "good" | "warn" | "bad" | "idle" => state === "up" ? "good" : state === "degraded" ? "warn" : state === "unknown" ? "idle" : "bad";

const format = (template: string, args: ReadonlyArray<string | number>): string => template.replace(/\{(\d+)\}/g, (_match, index: string) => String(args[Number(index)] ?? ""));

/** The sentence of an event, in the language of the menu: `t` translates `netev_<kind>`; the device is named as the operator would call it. */
export function describeEvent(event: NetworkEvent, devices: readonly NetworkDevice[], t: (key: string) => string): string {
  const device = event.device_id ? devices.find(item => item.id === event.device_id) : undefined;
  const name = device ? (deviceName(device) === device.ip ? device.ip : `${deviceName(device)} (${device.ip})`) : (event.device_id ?? "");
  switch (event.kind) {
    case "port_opened": case "port_closed": return format(t(`netev_${event.kind}`), [name, event.port ?? ""]);
    case "internet_up": return format(t("netev_internet_up"), [formatDuration(event.outage_s ?? 0)]);
    case "arp_conflict": return format(t("netev_arp_conflict"), [event.detail ?? name]);
    case "internet_down": case "gateway_down": case "gateway_up": return t(`netev_${event.kind}`);
    default: return format(t(`netev_${event.kind}`), [name]);
  }
}

/** How serious an event looks: what to paint it as. */
export function eventTone(event: NetworkEvent): "good" | "warn" | "bad" | "info" {
  switch (event.kind) {
    case "internet_down": case "gateway_down": case "arp_conflict": return "bad";
    case "port_opened": return event.port !== undefined && RISKY_PORTS.has(event.port) ? "bad" : "warn";
    case "new_device": case "ip_changed": case "device_offline": return "warn";
    case "internet_up": case "gateway_up": case "device_online": return "good";
    default: return "info";
  }
}

/** The points of a line chart: `values` scaled into `width` by `height` (y grows downwards); a gap (undefined) breaks the line. Returns the path of the line and the range it used. */
export function linePath(values: ReadonlyArray<number | undefined>, width: number, height: number, floor?: number, ceiling?: number): { d: string; min: number; max: number } {
  const known = values.filter((value): value is number => value !== undefined && Number.isFinite(value));
  if (known.length === 0) return { d: "", min: 0, max: 0 };
  const min = floor ?? Math.min(...known), max = Math.max(ceiling ?? Math.max(...known), min + 1e-9);
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  let d = "", pen = false;
  values.forEach((value, index) => {
    if (value === undefined || !Number.isFinite(value)) { pen = false; return; }
    const x = values.length > 1 ? index * step : width / 2, y = height - ((value - min) / (max - min)) * height;
    d += `${pen ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)} `;
    pen = true;
  });
  return { d: d.trim(), min, max };
}

/** The most recent value of a series, ignoring gaps. */
export const lastOf = (values: ReadonlyArray<number | undefined>): number | undefined => { for (let i = values.length - 1; i >= 0; i -= 1) if (values[i] !== undefined) return values[i]; return undefined; };
