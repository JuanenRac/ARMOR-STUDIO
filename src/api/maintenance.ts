import { userCall } from "./transport";
// ---- maintenance (an administrator): the programs against GitHub, the operating system's updates, and the root console ----
export type MaintStatus = "up_to_date" | "update_available" | "not_installed" | "unknown" | "ahead";
export type MaintComponent = { id: string; repo: string; description: string; service: string; installed: string; latest: string; status: MaintStatus; published: string; error: string; installable: boolean; notes: string };
export type MaintPackage = { name: string; from: string; to: string };
export type MaintOs = { name: string; kernel: string; uptime_s: number; reboot_required: boolean; packages: MaintPackage[]; kept_back?: string[]; broken?: string[] };
export type MaintHistoryEntry = { id: string; kind: string; label: string; state: string; error: string; started: number; finished: number };
export type MaintOverview = { agent: string; components: MaintComponent[]; os: MaintOs; console: boolean; running: string[]; history: MaintHistoryEntry[]; signature_mode?: string; trusted_fingerprints?: string[] };
export type MaintStep = { id: string; label: string; state: "waiting" | "running" | "done" | "skipped" | "failed"; percent: number };
export type MaintJob = { id: string; kind: string; label: string; state: "running" | "done" | "failed"; percent: number; steps: MaintStep[]; error: string; started: number; finished: number; log: string[]; log_total: number; result: Record<string, unknown> };
export const maintenanceStatus = (origin: string) => userCall<{ available: boolean; console?: boolean; reason?: string; hint?: string }>(origin, "GET", "/api/v1/admin/maintenance/status");
export const readUpdates = (origin: string, force = false) => userCall<MaintOverview>(origin, "GET", `/api/v1/admin/updates${force ? "?force=1" : ""}`);
export const startUpdates = (origin: string, components: string[], force = false) => userCall<MaintJob>(origin, "POST", "/api/v1/admin/updates", { components, force });
export const rollbackUpdate = (origin: string, component: string) => userCall<MaintJob>(origin, "POST", `/api/v1/admin/updates/${encodeURIComponent(component)}/rollback`);
export type AutoUpdatesSettings = { enabled: boolean; reboot: "never" | "disarmed"; window_start: string; window_end: string };
export type AutoUpdatesChange = Partial<AutoUpdatesSettings>;
export type AutoUpdates = { settings: AutoUpdatesSettings; package: boolean; applied: Array<{ at: string; packages: string[]; state: "started" | "installed" | "failed" }>; reboot_required: boolean; reboot_note: string; last_reboot: number;
  health: { checked?: number; ok?: boolean; restarted?: string[]; down?: string[] }; conf_written: boolean };
export const readAutoUpdates = (origin: string) => userCall<AutoUpdates>(origin, "GET", "/api/v1/admin/system/auto-updates");
/** Whether an update of the server first starts the new one on the side (off by default); `source` says who decides: studio (chosen here) or env (the settings file of the helper). */
export type StagingState = { enabled: boolean; source: "studio" | "env"; wait_s: number };
export const readStaging = (origin: string) => userCall<StagingState>(origin, "GET", "/api/v1/admin/maintenance/staging");
export const changeStaging = (origin: string, enabled: boolean) => userCall<StagingState>(origin, "PUT", "/api/v1/admin/maintenance/staging", { enabled });
export const changeAutoUpdates = (origin: string, change: AutoUpdatesChange) => userCall<AutoUpdates>(origin, "PUT", "/api/v1/admin/system/auto-updates", change);
export type UpgradeMode = "upgrade" | "full" | "repair";
export const systemAction = (origin: string, action: "check" | "upgrade" | "reboot", mode?: UpgradeMode) => userCall<MaintJob>(origin, "POST", `/api/v1/admin/system/${action}`, action === "upgrade" && mode ? { mode } : undefined);
export const clearUpdateHistory = (origin: string) => userCall<{ ok: boolean; cleared: number }>(origin, "DELETE", "/api/v1/admin/updates/history");
export const readMaintJob = (origin: string, id: string, since = 0) => userCall<MaintJob>(origin, "GET", `/api/v1/admin/maintenance/jobs/${encodeURIComponent(id)}?since=${since}`);
export type ConsoleState = { available: boolean; enabled: boolean; unlocked_until: number };
export type ConsoleJob = { id: string; command: string; state: "running" | "done" | "timeout"; code: number | null; cwd: string; output: string; offset: number; truncated: boolean };
export const readConsole = (origin: string) => userCall<ConsoleState>(origin, "GET", "/api/v1/admin/console");
export const unlockConsole = (origin: string, password: string) => userCall<{ unlocked_until: number }>(origin, "POST", "/api/v1/admin/console/unlock", { password });
export const lockConsole = (origin: string) => userCall<{ unlocked_until: number }>(origin, "POST", "/api/v1/admin/console/lock");
export const runConsole = (origin: string, command: string, cwd: string, timeout: number) => userCall<ConsoleJob>(origin, "POST", "/api/v1/admin/console/run", { command, cwd, timeout });
export const readConsoleJob = (origin: string, id: string, since = 0) => userCall<ConsoleJob>(origin, "GET", `/api/v1/admin/console/jobs/${encodeURIComponent(id)}?since=${since}`);
export const cancelConsoleJob = (origin: string, id: string) => userCall<{ ok: boolean }>(origin, "POST", `/api/v1/admin/console/jobs/${encodeURIComponent(id)}/cancel`);
/** Whether updating the programs of the machine from the phone is on (the server's switch and the maintenance helper's), why not, and the programs the helper can update. Reading it changes nothing. */
export type MachineUpdateInfo = { enabled: boolean; available?: boolean; require_signed?: boolean; projects?: string[]; reason?: string };
export const readMachineUpdate = (origin: string) => userCall<MachineUpdateInfo>(origin, "GET", "/api/v1/admin/machine-update");
