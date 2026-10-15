/**
 * The tie of a drawn object to another menu of Studio: a video intercom to a camera of the Cameras menu, its indoor monitor to the intercom it answers, an alarm panel or keypad to a real
 * panel of the Alarm panels menu, and a stair light to a device of the Devices menu. The select offers what exists, says what the thing it is tied to reports now (a panel guarding or
 * sounding, a device on or off), and a button goes to the menu itself. It is part of the properties of the object, so the tie is kept in the design.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { AlarmNodeView, StudioDevice } from "../api";
import type { FeatureLink, FeatureLinkKind, SiteFeature, SiteFeatureKind } from "../domain";

/** What each kind of object can be tied to. */
export const LINK_OF_KIND: Partial<Record<string, FeatureLinkKind>> = {
  gate: "device", "water-heater": "device", "solar-tank": "device", "opening:garage": "device", "opening:window": "device", "opening:door": "device",
  intercom: "camera", "intercom-monitor": "feature", "alarm-panel": "alarm", "alarm-keypad": "alarm", "stair-light": "device", lamp: "device",
};

/** The kinds of device each object can be tied to; the rest take the lights, switches and plugs. A tank of a solar circuit is tied to the plug or switch of its pump. */
const SWITCHES = ["smart_plug", "smart_switch", "smart_breaker"] as const;
export const DEVICE_KINDS_OF: Partial<Record<string, readonly string[]>> = {
  gate: ["gate_motor", ...SWITCHES], "water-heater": ["water_heater", ...SWITCHES], "solar-tank": [...SWITCHES, "water_heater"],
  "opening:garage": ["garage_motor", ...SWITCHES], "opening:window": ["shutter", ...SWITCHES], "opening:door": ["lock", ...SWITCHES],
};
export type LinkSources = {
  cameras: ReadonlyArray<{ id: string; name: string }>;
  alarmNodes: readonly AlarmNodeView[];
  devices: readonly StudioDevice[];
  features: readonly SiteFeature[];
  openCameras?: () => void; openAlarmPanels?: () => void; openDevices?: () => void;
};

/** What the thing a drawn object is tied to says now, as text keys of the console; undefined when nothing is known. */
export function liveOfLink(link: FeatureLink | undefined, sources: Pick<LinkSources, "alarmNodes" | "devices" | "cameras">): "alarm" | "armed" | "disarmed" | "offline" | "on" | "off" | "missing" | undefined {
  if (!link) return undefined;
  if (link.kind === "alarm") {
    const node = sources.alarmNodes.find(item => item.node_id === link.id);
    if (!node) return "missing";
    if (node.stale) return "offline";
    return node.state.phase === "alarm" || node.state.siren ? "alarm" : node.state.phase === "disarmed" ? "disarmed" : "armed";
  }
  if (link.kind === "device") {
    const device = sources.devices.find(item => item.id === link.id);
    if (!device) return "missing";
    if (!device.online) return "offline";
    const main = device.state as Record<string, unknown>;
    return main.on === true || main.open === true ? "on" : "off";
  }
  if (link.kind === "camera") return sources.cameras.some(item => item.id === link.id) ? undefined : "missing";
  return undefined;
}

const LIVE_KEY: Record<NonNullable<ReturnType<typeof liveOfLink>>, string> = {
  alarm: "site_linkLiveAlarm", armed: "site_linkLiveArmed", disarmed: "site_linkLiveDisarmed", offline: "site_linkLiveOffline", on: "site_linkLiveOn", off: "site_linkLiveOff", missing: "site_linkMissing",
};

export function FeatureLinkField({ t, feature, sources, onChange }: { t: (key: string) => string; feature: { kind: string; link?: FeatureLink }; sources: LinkSources; onChange: (link: FeatureLink | undefined) => void }) {
  const kind = LINK_OF_KIND[feature.kind];
  if (!kind) return null;
  const options: Array<{ id: string; label: string }> = kind === "camera" ? sources.cameras.map(item => ({ id: item.id, label: item.name || item.id }))
    : kind === "alarm" ? sources.alarmNodes.map(item => ({ id: item.node_id, label: item.node_id }))
    : kind === "device" ? sources.devices.filter(item => (DEVICE_KINDS_OF[feature.kind] ?? ["smart_light", "smart_switch", "smart_plug"]).includes(item.kind)).map(item => ({ id: item.id, label: item.name || item.id }))
    : sources.features.filter(item => item.kind === "intercom").map(item => ({ id: item.id, label: item.label || item.id }));
  const current = feature.link?.kind === kind ? feature.link.id : "";
  const known = options.some(option => option.id === current);
  const live = liveOfLink(feature.link?.kind === kind ? feature.link : undefined, sources);
  const label = t(kind === "camera" ? "site_linkCamera" : kind === "alarm" ? "site_linkAlarm" : kind === "device" ? "site_linkDevice" : "site_linkIntercom");
  const open = kind === "camera" ? sources.openCameras : kind === "alarm" ? sources.openAlarmPanels : kind === "device" ? sources.openDevices : undefined;
  const openLabel = kind === "camera" ? "site_linkOpenCameras" : kind === "alarm" ? "site_linkOpenAlarms" : "site_linkOpenDevices";
  return <div className="feature-link">
    <label>{label}<select value={current} onChange={event => onChange(event.target.value ? { kind, id: event.target.value } : undefined)}>
      <option value="">{t("site_linkNone")}</option>
      {current && !known && <option value={current}>{current}</option>}
      {options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
    </select></label>
    {live && <p className={`feature-link-state ${live}`} role="status">{t(LIVE_KEY[live])}</p>}
    {open && current && <button type="button" onClick={open}>{t(openLabel)}</button>}
  </div>;
}
