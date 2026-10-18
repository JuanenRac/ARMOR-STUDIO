import type { DeviceNote, NetworkOverview, NetworkPort, NetworkSample } from "../networkModel";
import { userCall } from "./transport";
export const listNetwork = (origin: string, hidden = false) => userCall<NetworkOverview>(origin, "GET", `/api/v1/network${hidden ? "?hidden=1" : ""}`);
export const readNetworkHistory = (origin: string, node: string, minutes: number) => userCall<{ node_id: string; minutes: number; samples: NetworkSample[] }>(origin, "GET", `/api/v1/network/history?node=${encodeURIComponent(node)}&minutes=${minutes}`);
export type NetworkOrderType = "scan_now" | "ping" | "traceroute" | "wake" | "ports" | "http" | "inspect";
export type NetworkResultView = { id: string; type: NetworkOrderType; ok: boolean; finished_ms: number; device_id?: string; output?: string; ports?: NetworkPort[]; latency_ms?: number };
export type NetworkOrderView = { id: string; node_id: string; type: NetworkOrderType; device_id?: string; status: "queued" | "sent" | "done" | "expired"; by: string; created_at: string; result?: NetworkResultView };
/** Hand the network node a manual order (a sweep now, a ping, a traceroute, a wake-up, the ports or the web page of one device). */
export const sendNetworkOrder = (origin: string, order: { type: NetworkOrderType; device_id?: string; port?: number; login?: boolean }) => userCall<NetworkOrderView>(origin, "POST", "/api/v1/network/commands", order);
export const readNetworkOrder = (origin: string, id: string) => userCall<NetworkOrderView>(origin, "GET", `/api/v1/network/commands/${encodeURIComponent(id)}`);
export const saveDeviceNote = (origin: string, id: string, note: { name?: string; notes?: string; trusted?: boolean; kind?: string; hidden?: boolean; watch?: boolean }) => userCall<{ id: string; note: DeviceNote }>(origin, "PUT", `/api/v1/network/devices/${encodeURIComponent(id)}`, note);
export const forgetDeviceNote = (origin: string, id: string) => userCall<void>(origin, "DELETE", `/api/v1/network/devices/${encodeURIComponent(id)}`);
/** The login of the web administration of a device: the password goes in and never comes out (the node only sees it inside one `inspect` order). */
export const saveDeviceLogin = (origin: string, id: string, login: { user: string; password: string }) => userCall<{ id: string; login: { user: string } }>(origin, "PUT", `/api/v1/network/devices/${encodeURIComponent(id)}/login`, login);
export const forgetDeviceLogin = (origin: string, id: string) => userCall<void>(origin, "DELETE", `/api/v1/network/devices/${encodeURIComponent(id)}/login`);
