import { userCall } from "./transport";
/** What importing an installation file did (see ARMOR-SERVER's installation.ts). */
export type InstallationReport = { applied: Record<string, string>; skipped: Record<string, string>; failed: Record<string, string>; cameras_need_credentials: string[] };
export const installationExport = (origin: string) => userCall<unknown>(origin, "GET", "/api/v1/admin/installation");
export const installationImport = (origin: string, bundle: unknown, parts: string[]) => userCall<InstallationReport>(origin, "POST", "/api/v1/admin/installation", { bundle, parts });
// ---- administration (an administrator): services, settings files, the broker's accounts, adopting a node ----
export type AdminService = { id: string; unit: string; description: string; installed: boolean; active: string; sub: string; enabled: string; pid: number; since: string; /** The process is frozen (paused), though systemd still calls the service active. */ paused?: boolean };
export type AdminFileInfo = { id: string; path: string; format: string; description: string; units: string[]; exists: boolean; mtime: number };
export type AdminFile = AdminFileInfo & { content: string; masked?: boolean };
export type BrokerAccount = { user: string; role: string; name: string; manageable: boolean; topics: string[] };
export type ProvisionResult = { ok: boolean; written: boolean; why: string; broker: { uri: string; username: string; password: string } };
/** How the admin agent protects the broker rules and the env files: open (the admin token is enough, as always), second_token (a second secret is also needed) or read_only. null: an older agent that does not say. */
export type AdminProtection = { mode: "open" | "second_token" | "read_only"; protected: boolean } | null;
export const adminStatus = (origin: string) => userCall<{ available: boolean; reason?: string; hint?: string; sensitive_writes?: AdminProtection }>(origin, "GET", "/api/v1/admin/status");
// The second secret of the admin agent (when its owner locked the broker rules and the env files with one): typed by the administrator, kept in memory only, and sent with the changes that need it.
let agentSecret = "";
export const setAdminSecret = (secret: string): void => { agentSecret = secret.trim(); };
const withSecret = (): Record<string, string> | undefined => (agentSecret ? { "X-Armor-Admin-Sensitive-Token": agentSecret } : undefined);
export const adminServices = (origin: string) => userCall<{ services: AdminService[] }>(origin, "GET", "/api/v1/admin/services");
export const adminServiceAction = (origin: string, id: string, action: "start" | "stop" | "restart" | "reload" | "pause" | "resume") => userCall<{ ok: boolean }>(origin, "POST", `/api/v1/admin/services/${encodeURIComponent(id)}/${action}`);
export const adminFiles = (origin: string) => userCall<{ files: AdminFileInfo[] }>(origin, "GET", "/api/v1/admin/files");
export const adminFile = (origin: string, id: string) => userCall<AdminFile>(origin, "GET", `/api/v1/admin/files/${encodeURIComponent(id)}`);
export const adminSaveFile = (origin: string, id: string, change: { content: string; restart: boolean; expect_mtime?: number }) => userCall<{ ok: boolean; restarted: string[]; mtime: number }>(origin, "PUT", `/api/v1/admin/files/${encodeURIComponent(id)}`, change, false, withSecret());
export const adminAccounts = (origin: string) => userCall<{ accounts: BrokerAccount[]; installed?: boolean }>(origin, "GET", "/api/v1/admin/mqtt/accounts");
export const adminAddAccount = (origin: string, role: string, name: string) => userCall<{ ok: boolean; user: string; password: string }>(origin, "POST", "/api/v1/admin/mqtt/accounts", { role, name }, false, withSecret());
export const adminRemoveAccount = (origin: string, user: string) => userCall<{ ok: boolean }>(origin, "DELETE", `/api/v1/admin/mqtt/accounts/${encodeURIComponent(user)}`, undefined, false, withSecret());
export const adminProvisionNode = (origin: string, request: { node_id: string; address: string; kind?: "radar" | "solar" | "electrical" | "network" | "alarm"; broker_host: string; broker_port?: number; panel_user?: string; panel_password?: string }) => userCall<ProvisionResult>(origin, "POST", "/api/v1/admin/nodes/provision", request, false, withSecret());
// ---- Where the alarms are sent ----------------------------------------------------------------------------------------------------------------------

export type ChannelMetrics = { delivered: number; failed: number; dropped: number; queued: number; last_delivered_at?: string; last_failure_at?: string; last_failure?: string };
export type NotificationsStatus = { webhook: boolean; mqtt: boolean; telegram: boolean; ntfy: boolean; homeassistant: boolean; language: string; metrics?: Record<string, ChannelMetrics> };
export type NotificationTestResult = { channel: string; ok: boolean; detail: string };
export const notificationsStatus = (origin: string) => userCall<NotificationsStatus>(origin, "GET", "/api/v1/admin/notifications");
export const notificationsTest = (origin: string, channel?: string) => userCall<{ results: NotificationTestResult[] }>(origin, "POST", "/api/v1/admin/notifications/test", channel ? { channel } : {});
