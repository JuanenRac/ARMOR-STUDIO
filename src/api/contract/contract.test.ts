/**
 * The contract between this console and ARMOR-SERVER, checked by the compiler: what the server says in the HTTP contract (generated/armor-rest.ts of ARMOR-COMMON, generated from its
 * OpenAPI document) must be accepted by the type this console reads it with. A field renamed, made optional or given another kind in the contract makes `npm run typecheck` fail here.
 * The two files next to this one are copies of the generated ones; the test below fails when they are not what ARMOR-COMMON generates now.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type * as Rest from "./armor-rest";
import type { Alarm as ClientAlarm } from "../alarms";
import type { AlarmNodes as ClientAlarmNodes } from "../alarmNodes";
import type { AutomationAction as ClientAutomationAction } from "../devices";
import type { AutomationInput as ClientAutomationInput } from "../devices";
import type { BatteryImage as ClientBatteryImage } from "../battery";
import type { CameraView as ClientCameraView, CameraParams as ClientCameraParams } from "../cameras";
import type { CaptureSettings as ClientCaptureSettings } from "../cameras";
import type { ConnectionClient as ClientConnectionClient } from "../history";
import type { DeviceInput as ClientDeviceInput } from "../devices";
import type { DeviceSource as ClientDeviceSource } from "../devices";
import type { DeviceState as ClientDeviceState } from "../devices";
import type { ElectricalEnergy as ClientElectricalEnergy } from "../electrical";
import type { ElectricalReadings as ClientElectricalReadings } from "../electrical";
import type { EnergyAlarmSettings as ClientEnergyAlarmSettings } from "../solar";
import type { FirmwareUpload as ClientFirmwareUpload } from "../firmware";
import type { IgnoreZone as ClientIgnoreZone } from "../cameras";
import type { MediaItem as ClientMediaItem } from "../cameras";
import type { NodeControlAllRequest as ClientNodeControlAllRequest } from "../nodeControl";
import type { NodeControlLine as ClientNodeControlLine } from "../nodeControl";
import type { NodeControlOperation as ClientNodeControlOperation } from "../nodeControl";
import type { NodeControlRequest as ClientNodeControlRequest } from "../nodeControl";
import type { NodePanel as ClientNodePanel } from "../remoteAccess";
import type { RadarEventList as ClientRadarEventList } from "../nodeHealth";
import type { RemoteTls as ClientRemoteTls } from "../remoteAccess";
import type { Rules as ClientRules } from "../history";
import type { ZoneLink as ClientZoneLink } from "../alarmNodes";
import type { AdminFile as ClientAdminFile } from "../admin";
import type { ArmProfiles as ClientArmProfiles } from "../alarmNodes";
import type { ArmingModesState as ClientArmingModesState } from "../armingModes";
import type { ArmorEvent as ClientArmorEvent } from "../history";
import type { Automation as ClientAutomation } from "../devices";
import type { BatteryOperation as ClientBatteryOperation } from "../battery";
import type { Camera as ClientCamera } from "../../domain";
import type { NodeHealthDetail as ClientNodeHealthDetail } from "../nodeHealth";
import type { ConnectionState as ClientConnectionState } from "../system";
import type { ConsoleState as ClientConsoleState } from "../maintenance";
import type { FirmwareProbe as ClientFirmwareProbe } from "../firmware";
import type { FirmwareRelease as ClientFirmwareRelease } from "../firmware";
import type { HistorySummary as ClientHistorySummary } from "../history";
import type { InstallationReport as ClientInstallationReport } from "../admin";
import type { NetworkOverview as ClientNetworkOverview } from "../../networkModel";
import type { NodeDiagnostics as ClientNodeDiagnostics } from "../diagnostics";
import type { NodeHealthList as ClientNodeHealthList } from "../nodeHealth";
import type { Preferences as ClientPreferences } from "../session";
import type { Preflight as ClientPreflight } from "../system";
import type { RemoteCheck as ClientRemoteCheck } from "../security";
import type { ServerInfo as ClientServerInfo } from "../system";
import type { SolarOverview as ClientSolarOverview } from "../solar";
import type { SystemState as ClientSystemState } from "../../types";
import type { SystemSummary as ClientSystemSummary } from "../system";
import type { TotpState as ClientTotpState } from "../security";

type Fits<Server, Client> = [Server] extends [Client] ? true : never;
/** The other way round: what the console reads is something the contract allows (for a type the console narrows to the cases it handles). */
type Within<Client, Server> = [Client] extends [Server] ? true : never;

/** The types of this console that the contract's own types are assignable to. */
type Checked = {
  Alarm: Fits<Rest.Alarm, ClientAlarm>;
  AlarmNodes: Fits<Rest.AlarmNodes, ClientAlarmNodes>;
  AutomationAction: Fits<Rest.AutomationAction, ClientAutomationAction>;
  AutomationInput: Fits<Rest.AutomationInput, ClientAutomationInput>;
  BatteryImage: Fits<Rest.BatteryImage, ClientBatteryImage>;
  CameraView: Fits<Rest.CameraView, ClientCameraView>;
  CameraParams: Fits<Rest.CameraParams, ClientCameraParams>;
  CaptureSettings: Fits<Rest.CaptureSettings, ClientCaptureSettings>;
  ConnectionClient: Fits<Rest.ConnectionClient, ClientConnectionClient>;
  DeviceInput: Fits<Rest.DeviceInput, ClientDeviceInput>;
  DeviceSource: Fits<Rest.DeviceSource, ClientDeviceSource>;
  DeviceState: Fits<Rest.DeviceState, ClientDeviceState>;
  ElectricalEnergy: Fits<Rest.ElectricalEnergy, ClientElectricalEnergy>;
  ElectricalReadings: Fits<Rest.ElectricalReadings, ClientElectricalReadings>;
  EnergyAlarmSettings: Fits<Rest.EnergyAlarmSettings, ClientEnergyAlarmSettings>;
  FirmwareUpload: Fits<Rest.FirmwareUpload, ClientFirmwareUpload>;
  IgnoreZone: Fits<Rest.IgnoreZone, ClientIgnoreZone>;
  MediaItem: Fits<Rest.MediaItem, ClientMediaItem>;
  NodeControlAllRequest: Fits<Rest.NodeControlAllRequest, ClientNodeControlAllRequest>;
  NodeControlLine: Fits<Rest.NodeControlLine, ClientNodeControlLine>;
  NodeControlOperation: Fits<Rest.NodeControlOperation, ClientNodeControlOperation>;
  NodeControlRequest: Fits<Rest.NodeControlRequest, ClientNodeControlRequest>;
  NodePanel: Fits<Rest.NodePanel, ClientNodePanel>;
  RadarEventList: Fits<Rest.RadarEventList, ClientRadarEventList>;
  RemoteTls: Fits<Rest.RemoteTls, ClientRemoteTls>;
  Rules: Fits<Rest.Rules, ClientRules>;
  ZoneLink: Fits<Rest.ZoneLink, ClientZoneLink>;
  AdminFile: Fits<Rest.AdminFile, ClientAdminFile>;
  ArmProfiles: Fits<Rest.ArmProfiles, ClientArmProfiles>;
  ArmingModesState: Fits<Rest.ArmingModesState, ClientArmingModesState>;
  Automation: Fits<Rest.Automation, ClientAutomation>;
  BatteryOperation: Fits<Rest.BatteryOperation, ClientBatteryOperation>;
  ConnectionState: Fits<Rest.ConnectionState, ClientConnectionState>;
  ConsoleState: Fits<Rest.ConsoleState, ClientConsoleState>;
  FirmwareRelease: Fits<Rest.FirmwareRelease, ClientFirmwareRelease>;
  HistorySummary: Fits<Rest.HistorySummary, ClientHistorySummary>;
  InstallationReport: Fits<Rest.InstallationReport, ClientInstallationReport>;
  NetworkOverview: Fits<Rest.NetworkOverview, ClientNetworkOverview>;
  NodeDiagnostics: Fits<Rest.NodeDiagnostics, ClientNodeDiagnostics>;
  NodeHealthList: Fits<Rest.NodeHealthList, ClientNodeHealthList>;
  Preferences: Fits<Rest.Preferences, ClientPreferences>;
  Preflight: Fits<Rest.Preflight, ClientPreflight>;
  RemoteCheck: Fits<Rest.RemoteCheck, ClientRemoteCheck>;
  ServerInfo: Fits<Rest.ServerInfo, ClientServerInfo>;
  SolarOverview: Fits<Rest.SolarOverview, ClientSolarOverview>;
  SystemState: Fits<Rest.SystemState, ClientSystemState>;
  SystemSummary: Fits<Rest.SystemSummary, ClientSystemSummary>;
  TotpState: Fits<Rest.TotpState, ClientTotpState>;
  ArmorEvent: Within<ClientArmorEvent, Rest.ArmorEvent>;
  NodeHealthDetail: Fits<Rest.NodeHealthDetail, ClientNodeHealthDetail>;
  CameraShared: Fits<Rest.Camera, Pick<ClientCamera, "id" | "name" | "host" | "snapshotUrl" | "username" | "onvifPort" | "rtspPort" | "rtspPath" | "previewPath" | "hasCredentials" | "liveVideoAvailable">>;
  FirmwareProbe: Fits<Rest.FirmwareProbe, { nodes: ClientFirmwareProbe[] }>;
};
// A type in which one of them is `never` cannot be assigned `true`: that is the failure.
export const checked: Checked = {
  Alarm: true,
  AlarmNodes: true,
  AutomationAction: true,
  AutomationInput: true,
  BatteryImage: true,
  CameraView: true,
  CameraParams: true,
  CaptureSettings: true,
  ConnectionClient: true,
  DeviceInput: true,
  DeviceSource: true,
  DeviceState: true,
  ElectricalEnergy: true,
  ElectricalReadings: true,
  EnergyAlarmSettings: true,
  FirmwareUpload: true,
  IgnoreZone: true,
  MediaItem: true,
  NodeControlAllRequest: true,
  NodeControlLine: true,
  NodeControlOperation: true,
  NodeControlRequest: true,
  NodePanel: true,
  RadarEventList: true,
  RemoteTls: true,
  Rules: true,
  ZoneLink: true,
  AdminFile: true,
  ArmProfiles: true,
  ArmingModesState: true,
  Automation: true,
  BatteryOperation: true,
  ConnectionState: true,
  ConsoleState: true,
  FirmwareRelease: true,
  HistorySummary: true,
  InstallationReport: true,
  NetworkOverview: true,
  NodeDiagnostics: true,
  NodeHealthList: true,
  Preferences: true,
  Preflight: true,
  RemoteCheck: true,
  ServerInfo: true,
  SolarOverview: true,
  SystemState: true,
  SystemSummary: true,
  TotpState: true,
  ArmorEvent: true,
  NodeHealthDetail: true,
  CameraShared: true,
  FirmwareProbe: true,
};

/**
 * Types of this console that carry the name of a schema of the contract and are not compared with it, and why: the console means something else by the name.
 * A new type of the console that takes the name of a schema has to be compared above or named here, or the last test of this file fails.
 */
export const NOT_THE_SAME_THING: Readonly<Record<string, string>> = {
  SiteDesign: "the contract's SiteDesign is the saved envelope ({ revision, updated_at, updated_by, site }); the console's is the document inside it (`site`), whose shape the contract leaves to the editor",
};
/** The comparisons above that are made under another name than the schema's, by the name they are made under. */
const UNDER_ANOTHER_NAME: Readonly<Record<string, string>> = { CameraShared: "Camera" };

const common = path.join(process.cwd(), "..", "ARMOR-COMMON", "generated");
const required = process.env.ARMOR_REQUIRE_SIBLINGS === "1";

describe("the types of the HTTP contract", () => {
  for (const file of ["armor-rest.ts", "armor-contracts.ts"]) {
    it(`${file} is what ARMOR-COMMON generates now`, () => {
      const shared = path.join(common, file);
      if (!fs.existsSync(shared)) {
        expect(required, "ARMOR-COMMON must be next to this repository when ARMOR_REQUIRE_SIBLINGS is set").toBe(false);
        return;
      }
      const norm = (text: string) => text.replace(/\r\n/g, "\n");
      expect(norm(fs.readFileSync(path.join(__dirname, file), "utf8"))).toBe(norm(fs.readFileSync(shared, "utf8")));
    });
  }

  it("compares every type of the console that has the name of a schema of the contract, or says why it does not", () => {
    const schemas = new Set([...fs.readFileSync(path.join(__dirname, "armor-rest.ts"), "utf8").matchAll(/^export type (\w+) =/gm)].map(match => match[1]));
    const compared = new Set([...Object.keys(checked).map(name => UNDER_ANOTHER_NAME[name] ?? name), ...Object.keys(NOT_THE_SAME_THING)]);
    const found: string[] = [];
    const walk = (folder: string): void => {
      for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
        const full = path.join(folder, entry.name);
        if (entry.isDirectory()) { if (entry.name !== "contract") walk(full); continue; }
        if (!/\.tsx?$/.test(entry.name) || /\.test\./.test(entry.name)) continue;
        for (const match of fs.readFileSync(full, "utf8").matchAll(/^export type (\w+)/gm)) if (schemas.has(match[1]) && !compared.has(match[1])) found.push(`${match[1]} (${path.relative(path.join(__dirname, ".."), full)})`);
      }
    };
    walk(path.join(__dirname, ".."));
    expect(found).toEqual([]);
    expect(Object.keys(checked).length).toBeGreaterThanOrEqual(50);
    expect(Object.keys(NOT_THE_SAME_THING).every(name => schemas.has(name))).toBe(true);
  });
});
