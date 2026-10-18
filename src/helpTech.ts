/**
 * The technical level of the Help: for each menu, what it reads from the server and how often. The same in every language (routes and numbers), so it is a table and not a text.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
export type HelpTech = { routes: readonly string[]; every?: string; role?: "admin" | "operator" };

export const HELP_TECH: Record<string, HelpTech> = {
  start: { routes: ["/api/v1/studio/session", "/api/v1/status", "/api/v1/info"], every: "2 s" },
  overview: { routes: ["/api/v1/status", "/api/v1/alarms", "/api/v1/cameras", "/api/v1/devices", "/api/v1/camera-status"], every: "2–5 s" },
  weather: { routes: ["/api/v1/site"] },
  alarms: { routes: ["/api/v1/alarms", "/api/v1/alarms/acknowledge", "/api/v1/mode", "/api/v1/events"], every: "2 s" },
  alarmPanels: { routes: ["/api/v1/alarm/nodes", "/api/v1/alarm/command", "/api/v1/alarm/commands", "/api/v1/alarm/profiles"], every: "3 s" },
  cameras: { routes: ["/api/v1/cameras", "/api/v1/cameras/configure", "/api/v1/cameras/discover", "/api/v1/camera-status", "/api/v1/camera-views"], every: "live" },
  radar: { routes: ["/api/v1/status", "/api/v1/site"], every: "1–2 s" },
  record: { routes: ["/api/v1/media", "/api/v1/events"] },
  history: { routes: ["/api/v1/history", "/api/v1/history/summary", "/api/v1/events", "/api/v1/rules"] },
  inverters: { routes: ["/api/v1/solar", "/api/v1/solar/devices", "/api/v1/solar/alarms"], every: "5 s" },
  batteries: { routes: ["/api/v1/solar", "/api/v1/solar/devices"], every: "5 s" },
  electrical: { routes: ["/api/v1/electrical/devices", "/api/v1/electrical/readings", "/api/v1/electrical/history"], every: "5 s" },
  devices: { routes: ["/api/v1/devices", "/api/v1/devices/{id}"], every: "3 s" },
  automations: { routes: ["/api/v1/automations", "/api/v1/automations/{id}"] },
  network: { routes: ["/api/v1/network/design", "/api/v1/network/commands"], every: "5 s" },
  siteDesigner: { routes: ["/api/v1/site"] },
  alarmDesigner: { routes: ["/api/v1/alarm/design"] },
  electricalDesigner: { routes: ["/api/v1/electrical/design"] },
  networkDesigner: { routes: ["/api/v1/network/design"] },
  system: { routes: ["/api/v1/system", "/api/v1/system/metrics", "/api/v1/system/ingest", "/api/v1/node-health", "/api/v1/audit"], every: "5 s" },
  services: { routes: ["/api/v1/system/services", "/api/v1/admin/services"], role: "admin" },
  configuration: { routes: ["/api/v1/preferences", "/api/v1/users", "/api/v1/admin/updates", "/api/v1/admin/firmware/jobs", "/api/v1/admin/console", "/api/v1/admin/notifications", "/api/v1/admin/mqtt/accounts"], role: "admin" },
  tips: { routes: [] },
};
