/**
 * How the events of the perimeter engine of a radar node read: a label for the kind and the details the node gave (zone, sensor, target, direction, movement, who). Pure functions.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { RadarEvent, RadarEventKind } from "./api";
import { fillAll } from "./nodeHealthModel";

type Translate = (key: string) => string;

export const RADAR_EVENT_KINDS: readonly RadarEventKind[] = [
  "zone_occupied", "zone_clear", "loiter", "tripwire", "path_violation", "masking", "masking_end", "sensor_bluetooth_open", "sensor_bluetooth_closed", "wifi_jam", "wifi_jam_end", "bridge_opened", "bridge_closed",
];

/** The events that are a danger on their own: a sensor's Bluetooth opened, the sensors covered, the Wi-Fi jammed, the bridge to a sensor opened. */
export const ALERT_EVENTS: readonly RadarEventKind[] = ["sensor_bluetooth_open", "masking", "wifi_jam", "bridge_opened"];
export const isAlertEvent = (event: Pick<RadarEvent, "event">): boolean => ALERT_EVENTS.includes(event.event);
/** The event that highlights an open Bluetooth of a sensor. */
export const isBluetoothOpen = (event: Pick<RadarEvent, "event">): boolean => event.event === "sensor_bluetooth_open";

/** The kind of the event in words. */
export const eventKindText = (kind: RadarEventKind, t: Translate): string => t(`re_${kind}`);

/** The details the node gave with an event, in words: "zone Garden · sensor 2 · target 5 · walking · entering". */
export function eventDetails(event: RadarEvent, t: Translate): string[] {
  const parts: string[] = [];
  if (event.name) parts.push(fillAll(t("pm_zone"), event.name));
  if (event.from) parts.push(fillAll(t("pm_from"), event.from));
  if (event.sensor_id !== undefined) parts.push(fillAll(t("pm_sensor"), event.sensor_id));
  if (event.track_id !== undefined) parts.push(fillAll(t("pm_track"), event.track_id));
  if (event.movement) parts.push(t(`pm_mov_${event.movement}`));
  if (event.direction) parts.push(t(`pm_dir_${event.direction === "in" ? "in" : "out"}`));
  if (event.count !== undefined) parts.push(fillAll(t("pm_count"), event.count));
  if (event.by) parts.push(`${t("sa_by")} ${event.by}`);
  return parts;
}

/** One line for the list: the kind and the details. */
export const eventLine = (event: RadarEvent, t: Translate): string => [eventKindText(event.event, t), ...eventDetails(event, t)].join(" · ");

/** The newest first, whatever order the server gave them in. */
export const newestFirst = (events: readonly RadarEvent[]): RadarEvent[] => [...events].sort((a, b) => Date.parse(b.received_at) - Date.parse(a.received_at) || b.seq - a.seq);
