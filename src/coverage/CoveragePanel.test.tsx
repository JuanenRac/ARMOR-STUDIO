import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CoveragePanel } from "./CoveragePanel";
import { analyseCoverage } from "./engine";
import { csvCell, describeWarning, reportToCsv, reportToJson } from "./report";
import { locales, text } from "../i18n";
import type { SiteModel } from "../designer/ops";

const model: SiteModel = {
  terrain: { points: [] }, roofItems: [], wallLamps: [], features: [], cameras: [], placements: [],
  buildings: [{ id: "b1", name: "=House", points: [{ x: 10, y: 10 }, { x: 30, y: 10 }, { x: 30, y: 16 }, { x: 10, y: 16 }], base: 0, floors: [2.8, 2.8], roof: { style: "flat", slope: 0, overhang: 0, ridge: 0 }, thickness: 0.2 }],
  openings: [{ id: "d1", buildingId: "b1", edge: 0, floor: 0, kind: "door", offset: 5, width: 1, height: 2.1, sill: 0 }, { id: "w1", buildingId: "b1", edge: 0, floor: 1, kind: "window", offset: 8, width: 1, height: 1.2, sill: 1 }],
  sensors: [{ id: "r1", name: "Hall", x: 27, y: 60, kind: "LD2450", heading: 180 }],
};
const dimensions = { width: 40, depth: 40, height: 4 };

describe("the coverage panel and its report", () => {
  const report = analyseCoverage(model, dimensions);

  it("shows every sentence in the eight languages, with no key left over", () => {
    for (const language of locales) {
      const html = renderToStaticMarkup(createElement(CoveragePanel, { t: (key: string) => text(language, key), report, margin: 10, showBlind: true, setShowBlind: () => undefined, onClose: () => undefined, onNotice: () => undefined }));
      expect(html, language).not.toMatch(/\b(?:cov|pf)_[a-z_]+/);
      expect(html.length).toBeGreaterThan(800);
    }
  });

  it("says something for every warning it can raise", () => {
    for (const code of ["zone_unwatched", "blind_spot", "zone_overlap", "sensor_redundant", "opening_unguarded", "opening_video_only", "cell_coarsened", "no_buildings", "upper_floors"]) {
      for (const language of locales) expect(text(language, `cov_w_${code}`), `${language} ${code}`).not.toBe(`cov_w_${code}`);
    }
    for (const warning of report.warnings) { const { message } = describeWarning(warning, key => text("en", key)); expect(message).not.toMatch(/cov_|\{\d\}/); }
  });

  it("exports JSON without the drawing cells and CSV that a spreadsheet cannot take for a formula", () => {
    const json = JSON.parse(reportToJson(report)) as { schema: string; zones: Array<Record<string, unknown>> };
    expect(json.schema).toBe("armor-studio/coverage/1");
    expect(json.zones[0]).not.toHaveProperty("blindCells");
    const csv = reportToCsv(report);
    expect(csv.split("\r\n")[0]).toBe("type,id,level,code,x_m,y_m,value,suggestion_x_m,suggestion_y_m,suggestion_heading_deg");
    expect(csv).toContain("opening,d1");
    expect(csvCell("=1+1")).toBe("'=1+1");
    expect(csvCell("a,b")).toBe('"a,b"');
  });

  it("does not check the doors of the upper floor and says so", () => {
    expect(report.notChecked.openings).toBe(1);
    expect(report.warnings.map(w => w.code)).toContain("upper_floors");
  });
});
