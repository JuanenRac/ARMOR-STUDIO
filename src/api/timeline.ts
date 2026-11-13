/**
 * The review timeline of the vision service (GET and DELETE /api/v1/vision/timeline): the events of the alert zones and the detection zones, newest first, with the evidence taken when
 * they were seen. It is kept only while the security option vision.timeline is on; operators and administrators read it, administrators delete.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { userCall } from "./transport";
import type { VisionTimeline, VisionTimelineDeleted, VisionTimelineItem } from "./contract/armor-rest";

export type { VisionTimeline, VisionTimelineItem };
export type TimelineFilters = { since?: string; level?: "alert" | "detection"; cameraId?: string; limit?: number };

/** The query of a list: only the filters that are set, written the way the server reads them. */
export function timelineQuery(filters: TimelineFilters): string {
  const query = new URLSearchParams();
  if (filters.since) query.set("since", filters.since);
  if (filters.level) query.set("level", filters.level);
  if (filters.cameraId) query.set("camera_id", filters.cameraId);
  if (filters.limit !== undefined) query.set("limit", String(filters.limit));
  const text = query.toString();
  return text ? `?${text}` : "";
}

export const readVisionTimeline = (origin: string, filters: TimelineFilters = {}) => userCall<VisionTimeline>(origin, "GET", `/api/v1/vision/timeline${timelineQuery(filters)}`);
/** Without an id, every entry; the evidence files stay under the retention of the evidence library. */
export const deleteVisionTimeline = (origin: string, id?: string) => userCall<VisionTimelineDeleted>(origin, "DELETE", id ? `/api/v1/vision/timeline/${encodeURIComponent(id)}` : "/api/v1/vision/timeline");

/** The local date and time a person typed in a `datetime-local` field, as the instant the server filters by; empty or invalid gives nothing. */
export function sinceFromLocal(text: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)) return undefined;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}
