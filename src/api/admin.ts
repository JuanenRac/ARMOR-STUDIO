import { userCall } from "./transport";
/** What importing an installation file did (see ARMOR-SERVER's installation.ts). */
export type InstallationReport = { applied: Record<string, string>; skipped: Record<string, string>; failed: Record<string, string>; cameras_need_credentials: string[] };
/** The signed record of an incident between two times (an administrator; the server refuses a window of more than seven days). */
export const incidentExport = (origin: string, from: string, to: string) => userCall<unknown>(origin, "GET", `/api/v1/admin/incident?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
export const installationExport = (origin: string) => userCall<unknown>(origin, "GET", "/api/v1/admin/installation");
export const installationImport = (origin: string, bundle: unknown, parts: string[], dryRun = false) => userCall<InstallationReport>(origin, "POST", "/api/v1/admin/installation", dryRun ? { bundle, parts, dry_run: true } : { bundle, parts });
// ---- administration (an administrator): services, settings files, the broker's accounts, adopting a node ----
export type AdminService = { id: string; unit: string; description: string; installed: boolean; active: string; sub: string; enabled: string; pid: number; since: string; /** The process is frozen (paused), though systemd still calls the service active. */ paused?: boolean };
export type AdminFileInfo = { id: string; path: string; format: string; description: string; units: string[]; exists: boolean; mtime: number };
export type AdminFile = AdminFileInfo & { content: string; masked?: boolean };
export type BrokerAccount = { user: string; role: string; name: string; manageable: boolean; topics: string[] };
export type ProvisionResult = { ok: boolean; written: boolean; why: string; broker: { uri: string; username: string; password: string } };
/** How the admin agent protects the broker rules and the env files: open (the admin token is enough, as always), second_token (a second secret is also needed) or read_only. null: an older agent that does not say. */
export type AdminProtection = { mode: "open" | "second_token" | "read_only"; protected: boolean } | null;
export const adminStatus = (origin: string) => userCall<{ available: boolean; reason?: string; hint?: string; sensitive_writes?: AdminProtection; approval?: "totp" | "not_enrolled" }>(origin, "GET", "/api/v1/admin/status");
// The second secret of the admin agent (when its owner locked the broker rules and the env files with one): typed by the administrator, kept in memory only, and sent with the changes that need it.
let agentSecret = "";
export const setAdminSecret = (secret: string): void => { agentSecret = secret.trim(); };
// The six-digit code of the administrator's authenticator, when the agent has one set up: typed by the administrator, kept in memory only, and sent with the changes that need it (the broker rules file and the two switches).
let approvalCode = "";
export const setAdminApproval = (code: string): void => { approvalCode = /^\d{6}$/.test(code.trim()) ? code.trim() : ""; };
const withSecret = (): Record<string, string> | undefined => {
  const headers = { ...(agentSecret ? { "X-Armor-Admin-Sensitive-Token": agentSecret } : {}), ...(approvalCode ? { "X-Armor-Maint-Totp": approvalCode } : {}) };
  return Object.keys(headers).length > 0 ? headers : undefined;
};
/** The two switches of the broker rules that no install turns on (the setting admin.acl_relays must be on for the server to answer): which are on, and the change of one. */
export type AdminRelayKind = "battery-write" | "alarm-state-relay";
export type RelaysState = { enabled: boolean; installed?: boolean; battery_write?: string[]; alarm_state_relay?: boolean; approval?: "totp" | "not_enrolled" };
export const adminRelays = (origin: string) => userCall<RelaysState>(origin, "GET", "/api/v1/admin/mqtt/relays");
/** `confirmText` is the node (battery-write) or `alarm-state-relay`, typed again by the administrator; `code` is the code of the authenticator. */
export const adminSetRelay = (origin: string, kind: AdminRelayKind, change: { node?: string; state: "on" | "off"; confirmText: string }, code: string) =>
  userCall<RelaysState & { ok: boolean; relay: AdminRelayKind; state: "on" | "off" }>(origin, "POST", `/api/v1/admin/mqtt/relays/${kind}`,
    { ...(change.node ? { node: change.node } : {}), state: change.state, confirm: true, confirm_text: change.confirmText }, false, { "X-Armor-Maint-Totp": code });
export const adminServices = (origin: string) => userCall<{ services: AdminService[] }>(origin, "GET", "/api/v1/admin/services");
export const adminServiceAction = (origin: string, id: string, action: "start" | "stop" | "restart" | "reload" | "pause" | "resume") => userCall<{ ok: boolean }>(origin, "POST", `/api/v1/admin/services/${encodeURIComponent(id)}/${action}`);
export const adminFiles = (origin: string) => userCall<{ files: AdminFileInfo[] }>(origin, "GET", "/api/v1/admin/files");
export const adminFile = (origin: string, id: string) => userCall<AdminFile>(origin, "GET", `/api/v1/admin/files/${encodeURIComponent(id)}`);
export const adminSaveFile = (origin: string, id: string, change: { content: string; restart: boolean; expect_mtime?: number }) => userCall<{ ok: boolean; restarted: string[]; mtime: number }>(origin, "PUT", `/api/v1/admin/files/${encodeURIComponent(id)}`, change, false, withSecret());
export const adminAccounts = (origin: string) => userCall<{ accounts: BrokerAccount[]; installed?: boolean }>(origin, "GET", "/api/v1/admin/mqtt/accounts");
export const adminAddAccount = (origin: string, role: string, name: string) => userCall<{ ok: boolean; user: string; password: string }>(origin, "POST", "/api/v1/admin/mqtt/accounts", { role, name }, false, withSecret());
export const adminRemoveAccount = (origin: string, user: string) => userCall<{ ok: boolean }>(origin, "DELETE", `/api/v1/admin/mqtt/accounts/${encodeURIComponent(user)}`, undefined, false, withSecret());
export const adminProvisionNode = (origin: string, request: { node_id: string; address: string; kind?: "radar" | "solar" | "electrical" | "network" | "alarm"; broker_host: string; broker_port?: number; panel_user?: string; panel_password?: string }) => userCall<ProvisionResult>(origin, "POST", "/api/v1/admin/nodes/provision", request, false, withSecret());
/** What the node said when its settings were read or written through its own panel: why is empty when it went well. */
export type NodeSettingsResult = { ok: boolean; written: boolean; why: string; login_limit_per_minute?: number };
/** Read (leave `login_limit_per_minute` out) or change the setting of a node that has a screen; the login of the node's own panel is used once and never kept. */
export const adminNodeSettings = (origin: string, request: { node_id: string; address: string; panel_user: string; panel_password: string; login_limit_per_minute?: number }) => userCall<NodeSettingsResult>(origin, "POST", "/api/v1/admin/nodes/settings", request);
// ---- Where the alarms are sent ----------------------------------------------------------------------------------------------------------------------

export type ChannelMetrics = { delivered: number; failed: number; dropped: number; queued: number; last_delivered_at?: string; last_failure_at?: string; last_failure?: string };
export type NotificationsStatus = { webhook: boolean; mqtt: boolean; telegram: boolean; ntfy: boolean; homeassistant: boolean; language: string; metrics?: Record<string, ChannelMetrics> };
export type NotificationTestResult = { channel: string; ok: boolean; detail: string };
export const notificationsStatus = (origin: string) => userCall<NotificationsStatus>(origin, "GET", "/api/v1/admin/notifications");
export const notificationsTest = (origin: string, channel?: string) => userCall<{ results: NotificationTestResult[] }>(origin, "POST", "/api/v1/admin/notifications/test", channel ? { channel } : {});
