/**
 * The coverage result as files (JSON and CSV) and as sentences. The files carry codes and numbers, never translated text, so they read the same in every language.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { CoverageReport, CoverageWarning } from "./engine";

/** The report as JSON, without the cells (they are only for drawing). */
export function reportToJson(report: CoverageReport): string {
  const slim = { ...report, zones: report.zones.map(({ blindCells: _cells, ...zone }) => zone) };
  return JSON.stringify(slim, null, 2);
}

/** A CSV cell that a spreadsheet cannot take for a formula. */
export function csvCell(value: string | number | undefined): string {
  let text = value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function reportToCsv(report: CoverageReport): string {
  const rows: Array<Array<string | number | undefined>> = [["type", "id", "level", "code", "x_m", "y_m", "value", "suggestion_x_m", "suggestion_y_m", "suggestion_heading_deg"]];
  for (const zone of report.zones) rows.push(["zone", zone.buildingId, "", "", "", "", `${zone.coveredM2}/${zone.areaM2} m2 seen`, "", "", ""]);
  for (const opening of report.openings) rows.push(["opening", opening.id, "", opening.state, opening.at.x, opening.at.y, opening.kind, "", "", ""]);
  for (const sensor of report.sensors) rows.push(["sensor", sensor.id, "", sensor.redundant ? "redundant" : "", "", "", `${sensor.coveredM2} m2`, "", "", ""]);
  for (const warning of report.warnings) rows.push(["warning", warning.target ?? "", warning.level, warning.code, "", "", warning.args.join(" "), warning.suggestion?.x, warning.suggestion?.y, warning.suggestion?.headingDeg]);
  return rows.map(row => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

const fill = (template: string, args: ReadonlyArray<string | number>): string => template.replace(/\{(\d+)\}/g, (_match, index: string) => String(args[Number(index)] ?? ""));

/** The sentence of a warning and, when it has one, the sentence of what to do. `t` is the translator of the console. */
export function describeWarning(warning: CoverageWarning, t: (key: string) => string): { message: string; advice?: string } {
  const args = warning.code === "opening_unguarded" || warning.code === "opening_video_only" ? [t(`cov_kind_${String(warning.args[0])}`), warning.args[1]] : warning.args;
  const message = fill(t(`cov_w_${warning.code}`), args);
  const suggestion = warning.suggestion;
  const withoutPlace = new Set(["zone_overlap", "sensor_redundant", "opening_video_only"]);
  const advice = suggestion ? fill(t(`cov_s_${warning.code}`), [suggestion.x, suggestion.y, suggestion.headingDeg]) : withoutPlace.has(warning.code) ? t(`cov_s_${warning.code}`) : undefined;
  return { message, advice };
}
