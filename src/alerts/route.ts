/**
 * Where an alarm takes the person, and what is said about it. The place depends on what raised it: an intruder seen by a camera opens that camera, one seen by a radar opens the
 * camera that covers it when there is one (and the radar's map when there is not), a panel's alarm opens the panels, a solar fault the inverters or the batteries, and so on.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { Alarm } from "../api";
import type { View } from "../domain";

export type RouteContext = {
  /** Alarm panels (the nodes that are an alarm control panel). */
  panelNodes?: ReadonlySet<string>;
  solarNodes?: ReadonlySet<string>;
  electricalNodes?: ReadonlySet<string>;
  /** The cameras that exist, so a camera named by an alarm that is gone is not opened. */
  cameras?: ReadonlySet<string>;
  /** The camera that covers a radar node (from the server's coverage), if any. */
  cameraCovering?: (nodeId: string) => string | undefined;
};

export type Target = { view: View; camera?: string };

const SEEN = /^(intrusion|motion|glass_break|vibration|tamper|panic|duress_disarm|camera_motion|door_open|window_open)$/;

/** The camera an alarm names in its own details, if it names one. */
function namedCamera(alarm: Alarm, ctx: RouteContext): string | undefined {
  const detail = alarm.detail ?? {};
  for (const key of ["camera", "camera_id", "cam"]) {
    const value = detail[key];
    if (typeof value === "string" && (!ctx.cameras || ctx.cameras.has(value))) return value;
  }
  return undefined;
}

export function routeFor(alarm: Alarm, ctx: RouteContext = {}): Target {
  const { source } = alarm;
  const camera = namedCamera(alarm, ctx);
  if (source.type === "camera") return { view: "cameras", camera: !ctx.cameras || ctx.cameras.has(source.id) ? source.id : camera };
  if (camera && SEEN.test(alarm.code)) return { view: "cameras", camera };
  switch (source.type) {
    case "node": {
      if (ctx.panelNodes?.has(source.id)) return { view: "alarmPanels" };
      if (ctx.solarNodes?.has(source.id)) return { view: /battery/.test(alarm.code) ? "batteries" : "inverters" };
      if (ctx.electricalNodes?.has(source.id)) return { view: "electrical" };
      const covering = SEEN.test(alarm.code) ? ctx.cameraCovering?.(source.id) : undefined;
      return covering ? { view: "cameras", camera: covering } : { view: "radar" };
    }
    case "solar": return { view: /battery/.test(alarm.code) ? "batteries" : "inverters" };
    case "electrical": return { view: "electrical" };
    case "network": return { view: "network" };
    case "device": return { view: "devices" };
    // The panels (and a duress code typed on one) are looked after where the panels are.
    case "alarm": return { view: "alarmPanels" };
    default: return { view: "alarms" };
  }
}

/** What is said aloud and shown in a pop-up: the severity, the kind of alarm and where it comes from, as the person asked (each part can be left out). */
export function alarmSentence(alarm: Alarm, t: (key: string) => string, parts: { type: boolean; severity: boolean; source: boolean } = { type: true, severity: true, source: true }): string {
  const pieces: string[] = [];
  if (parts.severity) pieces.push(t(`severity_${alarm.severity}`));
  if (parts.type) pieces.push(t(`alarm_${alarm.code}`));
  if (parts.source) pieces.push(`${t(`source_${alarm.source.type}`)} ${alarm.source.id}`);
  return pieces.join(". ");
}
