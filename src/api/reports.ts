/**
 * The two reports of the server for administrators and operators: the summary of a day (`GET /api/v1/summary/daily`) and the activity heat map of a camera (`GET /api/v1/vision/heatmap`).
 * Each is off until an administrator turns it on in Configuration > Security; a viewer and a wall panel are refused. The answers are reports for a person: they authorize nothing.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { DailySummaryReport as ContractSummary, HeatmapReport as ContractHeatmap } from "./contract/armor-rest";
import { ApiError, endpoint, localSession, timedFetch, userCall } from "./transport";

export type SummaryReport = ContractSummary;
export type HeatmapMap = ContractHeatmap;
export const SUMMARY_LANGUAGES = ["en", "es", "de", "fr", "it", "ja", "zh", "pt"] as const;
export type SummaryLanguage = (typeof SUMMARY_LANGUAGES)[number];
export type HeatmapFormat = "json" | "png" | "svg";

export const readDailySummary = (origin: string, date: string, language: SummaryLanguage) =>
  userCall<SummaryReport>(origin, "GET", `/api/v1/summary/daily?date=${encodeURIComponent(date)}&lang=${encodeURIComponent(language)}`);

export const readHeatmap = (origin: string, camera: string | undefined, scale: number) =>
  userCall<HeatmapMap>(origin, "GET", `/api/v1/vision/heatmap?${camera ? `camera=${encodeURIComponent(camera)}&` : ""}format=json&scale=${scale}`);

/** The picture of the heat map (png or svg) as bytes, or an ApiError with the stable code of the refusal. */
export async function readHeatmapPicture(origin: string, camera: string | undefined, format: Exclude<HeatmapFormat, "json">, scale: number): Promise<Blob> {
  const response = await timedFetch(endpoint(origin, `/api/v1/vision/heatmap?${camera ? `camera=${encodeURIComponent(camera)}&` : ""}format=${format}&scale=${scale}`), { ...localSession });
  if (!response.ok) {
    const parsed = await response.json().catch(() => ({})) as { code?: string; error?: string };
    const machine = typeof parsed.error === "string" && /^[a-z_]+$/.test(parsed.error) ? parsed.error : undefined;
    throw new ApiError(response.status, parsed.code ?? machine ?? "generic");
  }
  return response.blob();
}

/** The words (a key of the console's phrases) for why a report was refused: what the person can do about it. */
export function reportRefusal(error: unknown): string {
  if (!(error instanceof ApiError)) return "rep_err_network";
  const known: Record<string, string> = {
    daily_summary_disabled: "rep_err_summary_off", heatmap_disabled: "rep_err_heatmap_off", invalid_date: "rep_err_date", invalid_language: "rep_err_language", invalid_query: "rep_err_query",
    unknown_camera: "rep_err_camera", heatmap_pipeline_off: "rep_err_pipeline_off", heatmap_not_configured: "rep_err_heatmap_setup", daily_summary_not_configured: "rep_err_summary_setup",
    daily_summary_off_in_settings: "rep_err_summary_off_settings", report_busy: "rep_err_busy", daily_summary_failed: "rep_err_failed", heatmap_failed: "rep_err_failed",
  };
  if (known[error.code]) return known[error.code]!;
  if (error.status === 429) return "rep_err_rate";
  if (error.status === 401 || error.status === 403) return "rep_err_forbidden";
  if (error.status === 404) return "rep_err_off";
  if (error.status === 503) return "rep_err_setup";
  if (error.status === 502) return "rep_err_failed";
  return "rep_err_generic";
}
