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
import type { CameraView as ClientCameraView } from "../cameras";
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

type Fits<Server, Client> = [Server] extends [Client] ? true : never;

/** The types of this console that the contract's own types are assignable to. */
type Checked = {
  Alarm: Fits<Rest.Alarm, ClientAlarm>;
  AlarmNodes: Fits<Rest.AlarmNodes, ClientAlarmNodes>;
  AutomationAction: Fits<Rest.AutomationAction, ClientAutomationAction>;
  AutomationInput: Fits<Rest.AutomationInput, ClientAutomationInput>;
  BatteryImage: Fits<Rest.BatteryImage, ClientBatteryImage>;
  CameraView: Fits<Rest.CameraView, ClientCameraView>;
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
};
// A type in which one of them is `never` cannot be assigned `true`: that is the failure.
export const checked: { [K in keyof Checked]: true } = {
  Alarm: true,
  AlarmNodes: true,
  AutomationAction: true,
  AutomationInput: true,
  BatteryImage: true,
  CameraView: true,
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
};

/** Types of this console that have the name of a schema of the contract and are not compared yet: the contract leaves optional what the console takes as always there (or the other way round). */
export const NOT_YET_COMPARED: readonly string[] = ["AdminFile", "ArmProfiles", "ArmorEvent", "Automation", "BatteryOperation", "Camera", "ConnectionState", "ConsoleState", "FirmwareProbe", "FirmwareRelease", "HistorySummary", "InstallationReport", "NetworkOverview", "NodeDiagnostics", "NodeHealthList", "Preferences", "Preflight", "RemoteCheck", "ServerInfo", "SiteDesign", "SolarOverview", "SystemState", "SystemSummary", "TotpState"];

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

  it("compares the types of the console that exist in the contract and says which it does not compare yet", () => {
    expect(Object.keys(checked).length).toBeGreaterThan(20);
    expect(NOT_YET_COMPARED.filter(name => name in checked)).toEqual([]);
  });
});
