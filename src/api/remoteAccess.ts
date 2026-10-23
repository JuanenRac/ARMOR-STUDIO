import { userCall } from "./transport";
// ---- the way in from outside the house: the VPN, the dynamic DNS name and the panels of the nodes through the server -------------------------------------
export type VpnPeer = { name: string; address: string; full_tunnel: "yes" | "no" };
export type RemoteSetupState = {
  wireguard: { tool: boolean; script: boolean; configured: boolean; running: boolean; qr: boolean; peers: VpnPeer[]; endpoint?: string; subnet?: string; port?: string; lan?: string; route_lan?: string };
  ddns: { script: boolean; configured: boolean; provider?: string; name?: string; last_address?: string };
};
export type VpnPeerConfig = { name: string; config: string; qr_svg: string | null };
export type DdnsInput = { provider: "duckdns" | "cloudflare" | "url"; domain?: string; token?: string; zone?: string; record_name?: string; url?: string };
export type NodePanel = { id: string; address: string; scheme: "http" | "https"; port: number; fingerprint?: string; label?: string };
export type RemoteTls = { present: boolean; pin?: string; text?: string; subject?: string; not_after?: string; error?: string };
/** The key of the authority that signs the installation's own HTTPS and the text that pairs a phone with it (`armor-pin:<host>:<pin>`). */
export const remoteTls = (origin: string, host: string) => userCall<RemoteTls>(origin, "GET", `/api/v1/admin/remote/tls${host ? `?host=${encodeURIComponent(host)}` : ""}`);
export const remoteSetupState = (origin: string) => userCall<RemoteSetupState>(origin, "GET", "/api/v1/admin/remote");
export const vpnSetup = (origin: string, input: { endpoint: string; port?: number; lan?: string; route_lan?: string }) => userCall<RemoteSetupState>(origin, "POST", "/api/v1/admin/remote/wireguard/setup", input);
export const vpnAddPeer = (origin: string, name: string, fullTunnel: boolean) => userCall<VpnPeerConfig>(origin, "POST", "/api/v1/admin/remote/wireguard/peers", { name, full_tunnel: fullTunnel });
export const vpnShowPeer = (origin: string, name: string) => userCall<VpnPeerConfig>(origin, "GET", `/api/v1/admin/remote/wireguard/peers/${encodeURIComponent(name)}`);
export const vpnRemovePeer = (origin: string, name: string) => userCall<{ ok: true }>(origin, "DELETE", `/api/v1/admin/remote/wireguard/peers/${encodeURIComponent(name)}`);
export const ddnsSetup = (origin: string, input: DdnsInput) => userCall<RemoteSetupState>(origin, "POST", "/api/v1/admin/remote/ddns/setup", input);
export const ddnsUpdate = (origin: string) => userCall<RemoteSetupState>(origin, "POST", "/api/v1/admin/remote/ddns/update", {});
export const ddnsRemove = (origin: string) => userCall<RemoteSetupState>(origin, "POST", "/api/v1/admin/remote/ddns/remove", {});
export const listNodePanels = (origin: string) => userCall<{ panels: NodePanel[] }>(origin, "GET", "/api/v1/admin/node-panels");
export const saveNodePanel = (origin: string, panel: { id: string; address: string; scheme: "http" | "https"; port?: number; label?: string }) => userCall<NodePanel>(origin, "PUT", `/api/v1/admin/node-panels/${encodeURIComponent(panel.id)}`, panel);
export const removeNodePanel = (origin: string, id: string) => userCall<void>(origin, "DELETE", `/api/v1/admin/node-panels/${encodeURIComponent(id)}`);
export const nodePanelFingerprint = (origin: string, id: string, trust: boolean) => userCall<{ fingerprint: string; trusted: boolean; previous: string | null; changed: boolean }>(origin, "POST", `/api/v1/admin/node-panels/${encodeURIComponent(id)}/fingerprint`, { trust });
export const nodePanelUrl = (origin: string, id: string) => `${origin.replace(/\/$/, "")}/api/v1/nodes/${encodeURIComponent(id)}/panel/`;
