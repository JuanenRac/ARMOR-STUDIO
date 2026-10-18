import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../api";

type Seen = { url: string; method: string; body: unknown };
const seen: Seen[] = [];
const O = "http://armor.local:8080";
// A name with a slash, a space and a dot-dot: whatever builds an address from it must not let it out of its place.
const ODD = "a/b c..";
const ENC = "a%2Fb%20c..";

beforeEach(() => {
  seen.length = 0;
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit = {}) => {
    seen.push({ url, method: init.method ?? "GET", body: init.body === undefined ? undefined : JSON.parse(init.body as string) });
    return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
  }));
});
afterEach(() => vi.unstubAllGlobals());

type Row = [name: string, call: () => Promise<unknown>, method: string, path: string, body?: unknown];
const rows: Row[] = [
  ["listUsers", () => api.listUsers(O), "GET", "/api/v1/users"],
  ["createUser", () => api.createUser(O, { username: "a", password: "b", role: "viewer" }), "POST", "/api/v1/users", { username: "a", password: "b", role: "viewer" }],
  ["updateUser", () => api.updateUser(O, ODD, { role: "admin" }), "PATCH", `/api/v1/users/${ENC}`, { role: "admin" }],
  ["deleteUser", () => api.deleteUser(O, ODD), "DELETE", `/api/v1/users/${ENC}`],
  ["changeAccount", () => api.changeAccount(O, { currentPassword: "x", newPassword: "y" }), "PATCH", "/api/v1/account", { currentPassword: "x", newPassword: "y" }],
  ["setMyPin", () => api.setMyPin(O, { currentPassword: "x", pin: "1234" }), "PUT", "/api/v1/account/pin", { currentPassword: "x", pin: "1234" }],
  ["setUserPin without duress", () => api.setUserPin(O, ODD, "1234"), "PUT", `/api/v1/users/${ENC}/pin`, { pin: "1234" }],
  ["setUserPin with duress", () => api.setUserPin(O, ODD, "1234", "4321"), "PUT", `/api/v1/users/${ENC}/pin`, { pin: "1234", duress_pin: "4321" }],
  ["setUserPin with an empty duress", () => api.setUserPin(O, "u", "1234", ""), "PUT", "/api/v1/users/u/pin", { pin: "1234" }],
  ["clearUserPin", () => api.clearUserPin(O, ODD), "DELETE", `/api/v1/users/${ENC}/pin`],
  ["listMySessions", () => api.listMySessions(O), "GET", "/api/v1/studio/sessions"],
  ["endMySession", () => api.endMySession(O, ODD), "DELETE", `/api/v1/studio/sessions/${ENC}`],
  ["endOtherSessions", () => api.endOtherSessions(O), "POST", "/api/v1/studio/sessions/end-others"],
  ["totpState", () => api.totpState(O), "GET", "/api/v1/studio/totp"],
  ["totpSetup", () => api.totpSetup(O, "pw"), "POST", "/api/v1/studio/totp/setup", { password: "pw" }],
  ["totpEnable", () => api.totpEnable(O, "123456"), "POST", "/api/v1/studio/totp/enable", { code: "123456" }],
  ["totpDisable", () => api.totpDisable(O, "pw"), "DELETE", "/api/v1/studio/totp", { password: "pw" }],
  ["elevateSession by code", () => api.elevateSession(O, { code: "123456" }), "POST", "/api/v1/studio/elevate", { code: "123456" }],
  ["remoteCheck", () => api.remoteCheck(O), "GET", "/api/v1/remote/check"],
  ["adminServiceAction", () => api.adminServiceAction(O, ODD, "restart"), "POST", `/api/v1/admin/services/${ENC}/restart`],
  ["adminFile", () => api.adminFile(O, ODD), "GET", `/api/v1/admin/files/${ENC}`],
  ["adminSaveFile", () => api.adminSaveFile(O, ODD, { content: "x", restart: true, expect_mtime: 5 }), "PUT", `/api/v1/admin/files/${ENC}`, { content: "x", restart: true, expect_mtime: 5 }],
  ["adminAddAccount", () => api.adminAddAccount(O, "node", "radar-1"), "POST", "/api/v1/admin/mqtt/accounts", { role: "node", name: "radar-1" }],
  ["adminRemoveAccount", () => api.adminRemoveAccount(O, ODD), "DELETE", `/api/v1/admin/mqtt/accounts/${ENC}`],
  ["installationImport", () => api.installationImport(O, { a: 1 }, ["users"]), "POST", "/api/v1/admin/installation", { bundle: { a: 1 }, parts: ["users"] }],
  ["notificationsTest all", () => api.notificationsTest(O), "POST", "/api/v1/admin/notifications/test", {}],
  ["notificationsTest one", () => api.notificationsTest(O, "ntfy"), "POST", "/api/v1/admin/notifications/test", { channel: "ntfy" }],
  ["readUpdates", () => api.readUpdates(O), "GET", "/api/v1/admin/updates"],
  ["readUpdates forced", () => api.readUpdates(O, true), "GET", "/api/v1/admin/updates?force=1"],
  ["startUpdates", () => api.startUpdates(O, ["server"]), "POST", "/api/v1/admin/updates", { components: ["server"], force: false }],
  ["rollbackUpdate", () => api.rollbackUpdate(O, ODD), "POST", `/api/v1/admin/updates/${ENC}/rollback`],
  ["systemAction reboot", () => api.systemAction(O, "reboot"), "POST", "/api/v1/admin/system/reboot"],
  ["systemAction upgrade with mode", () => api.systemAction(O, "upgrade", "full"), "POST", "/api/v1/admin/system/upgrade", { mode: "full" }],
  ["systemAction upgrade without mode", () => api.systemAction(O, "upgrade"), "POST", "/api/v1/admin/system/upgrade"],
  ["systemAction check ignores a mode", () => api.systemAction(O, "check", "full"), "POST", "/api/v1/admin/system/check"],
  ["readMaintJob", () => api.readMaintJob(O, ODD, 12), "GET", `/api/v1/admin/maintenance/jobs/${ENC}?since=12`],
  ["unlockConsole", () => api.unlockConsole(O, "pw"), "POST", "/api/v1/admin/console/unlock", { password: "pw" }],
  ["runConsole", () => api.runConsole(O, "ls", "/", 30), "POST", "/api/v1/admin/console/run", { command: "ls", cwd: "/", timeout: 30 }],
  ["readConsoleJob", () => api.readConsoleJob(O, "j1"), "GET", "/api/v1/admin/console/jobs/j1?since=0"],
  ["cancelConsoleJob", () => api.cancelConsoleJob(O, ODD), "POST", `/api/v1/admin/console/jobs/${ENC}/cancel`],
  ["firmwareRelease", () => api.firmwareRelease(O, "radar"), "GET", "/api/v1/admin/firmware/releases/radar"],
  ["firmwareProbe", () => api.firmwareProbe(O, ["10.0.0.5"]), "POST", "/api/v1/admin/firmware/probe", { addresses: ["10.0.0.5"] }],
  ["firmwareJob", () => api.firmwareJob(O, ODD), "GET", `/api/v1/admin/firmware/jobs/${ENC}`],
  ["vpnShowPeer", () => api.vpnShowPeer(O, ODD), "GET", `/api/v1/admin/remote/wireguard/peers/${ENC}`],
  ["vpnAddPeer", () => api.vpnAddPeer(O, "phone", true), "POST", "/api/v1/admin/remote/wireguard/peers", { name: "phone", full_tunnel: true }],
  ["removeNodePanel", () => api.removeNodePanel(O, ODD), "DELETE", `/api/v1/admin/node-panels/${ENC}`],
  ["nodePanelFingerprint", () => api.nodePanelFingerprint(O, "n1", true), "POST", "/api/v1/admin/node-panels/n1/fingerprint", { trust: true }],
  ["listNetwork", () => api.listNetwork(O), "GET", "/api/v1/network"],
  ["listNetwork hidden", () => api.listNetwork(O, true), "GET", "/api/v1/network?hidden=1"],
  ["readNetworkHistory", () => api.readNetworkHistory(O, ODD, 60), "GET", `/api/v1/network/history?node=${ENC}&minutes=60`],
  ["sendNetworkOrder", () => api.sendNetworkOrder(O, { type: "ping", device_id: "d1" }), "POST", "/api/v1/network/commands", { type: "ping", device_id: "d1" }],
  ["saveDeviceLogin", () => api.saveDeviceLogin(O, ODD, { user: "u", password: "p" }), "PUT", `/api/v1/network/devices/${ENC}/login`, { user: "u", password: "p" }],
  ["forgetDeviceNote", () => api.forgetDeviceNote(O, ODD), "DELETE", `/api/v1/network/devices/${ENC}`],
  ["readNodeHealthDetail", () => api.readNodeHealthDetail(O, ODD), "GET", `/api/v1/node-health/${ENC}`],
  ["forgetNodeHealth", () => api.forgetNodeHealth(O, ODD), "DELETE", `/api/v1/node-health/${ENC}`],
  ["commandDevice", () => api.commandDevice(O, ODD, "on"), "POST", `/api/v1/devices/${ENC}/command`, { command: "on" }],
  ["commandDevice confirmed", () => api.commandDevice(O, "d1", "off", true), "POST", "/api/v1/devices/d1/command", { command: "off", confirm: true }],
  ["setDeviceState", () => api.setDeviceState(O, "d1", { on: true }), "POST", "/api/v1/devices/d1/state", { state: { on: true } }],
  ["runAutomation", () => api.runAutomation(O, ODD), "POST", `/api/v1/automations/${ENC}/run`],
  ["acknowledgeAlarm", () => api.acknowledgeAlarm(O, ODD), "POST", `/api/v1/alarms/${ENC}/acknowledge`],
  ["acknowledgeAllAlarms", () => api.acknowledgeAllAlarms(O), "POST", "/api/v1/alarms/acknowledge"],
  ["deleteAlarm", () => api.deleteAlarm(O, ODD), "DELETE", `/api/v1/alarms/${ENC}`],
  ["clearAlarmRecord", () => api.clearAlarmRecord(O), "DELETE", "/api/v1/alarms"],
  ["saveZoneLinks", () => api.saveZoneLinks(O, []), "PUT", "/api/v1/alarm/zone-links", { links: [] }],
  ["saveArmProfiles", () => api.saveArmProfiles(O, [], 3), "PUT", "/api/v1/alarm/profiles", { profiles: [], revision: 3 }],
  ["sendAlarmCommand arm away", () => api.sendAlarmCommand(O, "panel-1", "arm", "away"), "POST", "/api/v1/alarm/command", { node: "panel-1", action: "arm", mode: "away" }],
  ["sendAlarmCommand arm forced with a profile", () => api.sendAlarmCommand(O, "panel-1", "arm", "stay", true, "9999", "night"), "POST", "/api/v1/alarm/command", { node: "panel-1", action: "arm", profile: "night", force: true }],
  ["sendAlarmCommand disarm carries the PIN", () => api.sendAlarmCommand(O, "panel-1", "disarm", undefined, false, "2468"), "POST", "/api/v1/alarm/command", { node: "panel-1", action: "disarm", pin: "2468" }],
  ["sendAlarmCommand silence without a PIN", () => api.sendAlarmCommand(O, "panel-1", "silence", "away", true), "POST", "/api/v1/alarm/command", { node: "panel-1", action: "silence" }],
  ["listElectricalReadings", () => api.listElectricalReadings(O), "GET", "/api/v1/electrical/readings"],
  ["listElectricalEnergy", () => api.listElectricalEnergy(O), "GET", "/api/v1/electrical/energy?days=7"],
  ["listSolar", () => api.listSolar(O), "GET", "/api/v1/solar"],
  ["deleteSolarDevice", () => api.deleteSolarDevice(O, ODD, ODD), "DELETE", `/api/v1/solar/devices/${ENC}/${ENC}`],
  ["solarHistory", () => api.solarHistory(O, "n 1", "d/1", 30), "GET", "/api/v1/solar/history?node=n+1&device=d%2F1&minutes=30"],
  ["solarEnergy", () => api.solarEnergy(O, 14), "GET", "/api/v1/solar/energy?days=14"],
  ["saveEnergyAlarms", () => api.saveEnergyAlarms(O, {}), "PUT", "/api/v1/solar/alarms", {}],
  ["readConnection", () => api.readConnection(O), "GET", "/api/v1/system/connection"],
  ["saveConnection", () => api.saveConnection(O, { port: 9000 }), "PUT", "/api/v1/system/connection", { port: 9000 }],
  ["readAudit", () => api.readAudit(O), "GET", "/api/v1/audit?limit=100"],
  ["readServices", () => api.readServices(O), "GET", "/api/v1/system/services"],
  ["readMetrics", () => api.readMetrics(O), "GET", "/api/v1/system/metrics"],
  ["readIgnoreZones", () => api.readIgnoreZones(O, ODD), "GET", `/api/v1/cameras/${ENC}/ignore-zones`],
  ["saveIgnoreZones", () => api.saveIgnoreZones(O, "c1", [{ x: 0, y: 0, w: 0.5, h: 0.5 }]), "PUT", "/api/v1/cameras/c1/ignore-zones", { zones: [{ x: 0, y: 0, w: 0.5, h: 0.5 }] }],
];

describe("what each call of the console asks the server for", () => {
  it.each(rows)("%s", async (_name, call, method, path, body) => {
    await call();
    expect(seen).toHaveLength(1);
    expect(seen[0]!.method).toBe(method);
    expect(seen[0]!.url).toBe(O + path);
    expect(seen[0]!.body).toEqual(body);
  });

  it("covers a call per area, and no row repeats another", () => {
    const keys = rows.map(row => `${row[2]} ${row[3]} ${JSON.stringify(row[4])}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(rows.length).toBeGreaterThan(70);
  });

  it("the address of the panel of a node is built, not fetched, and a name cannot break out of it", () => {
    expect(api.nodePanelUrl(`${O}/`, ODD)).toBe(`${O}/api/v1/nodes/${ENC}/panel/`);
  });

  it("an address given with a trailing slash behaves like one without", async () => {
    await api.listUsers(`${O}/`);
    expect(seen[0]!.url).toBe(`${O}/api/v1/users`);
  });
});
