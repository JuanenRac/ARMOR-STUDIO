/**
 * Where an alarm is on the site design: the camera that raised it, the placed device, or the radar wired to the node that reported it. An alarm whose source is not drawn (a network, a
 * solar or an alarm-panel alarm, a device that was never placed) has no place and is left to the list. Only alarms nobody has acknowledged are drawn.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { Alarm } from "../api";
import type { SiteModel } from "../designer/ops";
import { toMetres, type Point } from "../designer/model";
import type { Dimensions } from "../domain";

export type AlarmPlace = { id: string; severity: Alarm["severity"]; code: string; point: Point };

export function alarmPlaces(alarms: readonly Alarm[], model: SiteModel, dimensions: Dimensions): AlarmPlace[] {
  const out: AlarmPlace[] = [];
  for (const alarm of alarms) {
    if (alarm.acknowledged_at || alarm.cleared_at) continue;
    let point: Point | undefined;
    if (alarm.source.type === "camera") {
      const camera = model.cameras.find(item => item.id === alarm.source.id);
      if (camera) point = toMetres(camera, dimensions);
    } else if (alarm.source.type === "device") {
      const placement = model.placements.find(item => item.device_id === alarm.source.id);
      if (placement) point = { x: placement.x, y: placement.y };
    } else if (alarm.source.type === "node") {
      const sensor = model.sensors.find(item => item.node === alarm.source.id);
      if (sensor) point = toMetres(sensor, dimensions);
    }
    if (point) out.push({ id: alarm.id, severity: alarm.severity, code: alarm.code, point });
  }
  return out;
}
