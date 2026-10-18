import { userCall } from "./transport";
export type Severity = "critical" | "high" | "warning";
export type Alarm = {
  id: string; key: string; source: { type: "node" | "camera" | "device" | "solar" | "electrical" | "network" | "alarm"; id: string }; severity: Severity; code: string;
  raised_at: string; acknowledged_at?: string; acknowledged_by?: string; cleared_at?: string;
  /** The facts the server attached (which device, which port, what the numbers were). */
  detail?: Record<string, string | number | boolean>;
};
/** Where an alarm can come from: the same closed list as the server and the contract. */
export type AlarmSourceType = "node" | "camera" | "device" | "solar" | "electrical" | "network" | "alarm";
export const listAlarms = (origin: string) => userCall<{ active: Alarm[]; recent: Alarm[] }>(origin, "GET", "/api/v1/alarms");
export const acknowledgeAlarm = (origin: string, id: string) => userCall<Alarm>(origin, "POST", `/api/v1/alarms/${encodeURIComponent(id)}/acknowledge`);
export const acknowledgeAllAlarms = (origin: string) => userCall<{ acknowledged: number }>(origin, "POST", "/api/v1/alarms/acknowledge");
export const deleteAlarm = (origin: string, id: string) => userCall<Alarm>(origin, "DELETE", `/api/v1/alarms/${encodeURIComponent(id)}`);
export const clearAlarmRecord = (origin: string) => userCall<{ deleted: number }>(origin, "DELETE", "/api/v1/alarms");
