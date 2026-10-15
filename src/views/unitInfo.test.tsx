import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { text } from "../i18n";
import { ratingRows, type SolarInverterReading } from "../solarModel";
import { UnitInfoCard } from "./InvertersView";

const base: SolarInverterReading = {
  kind: "inverter", node_id: "solar-1", device: "axpert-1", timestamp_ms: 1, mode: "line", grid_v: 230, grid_hz: 50, out_v: 230, out_hz: 50, out_va: 100, out_w: 80, load_percent: 3,
  battery_v: 52, battery_a: 1, battery_percent: 90, pv_v: 100, pv_a: 1, pv_w: 100, heatsink_c: 40, ac_charging: false, pv_charging: true, load_on: true, warnings: [],
};

describe("what the unit says about itself", () => {
  it("lists the ratings the unit gave and only those", () => {
    const rows = ratingRows({ out_rating_va: 5000, battery_rating_v: 48, battery_bulk_v: 56.4, max_charge_a: 60, battery_type: "agm", output_priority: "sbu" });
    const labels = rows.map(([label]) => label);
    expect(labels).toContain("rt_out_rating_va");
    expect(labels).toContain("rt_battery_bulk_v");
    expect(labels).not.toContain("rt_out_rating_w");
    expect(rows.find(([label]) => label === "rt_out_rating_va")?.[1]).toBe("5000 VA");
    expect(rows.find(([label]) => label === "rt_battery_bulk_v")?.[1]).toBe("56.4 V");
    expect(rows.find(([label]) => label === "rt_battery_rating_v")?.[1]).toBe("48 V");
    expect(rows.find(([label]) => label === "rt_battery_type")?.[1]).toBe("@rt_battery_type_agm");
    expect(ratingRows({})).toEqual([]);
  });
  it("shows the serial, the firmware, the total energy and the ratings in every language, with no phrase left untranslated", () => {
    const reading: SolarInverterReading = { ...base, serial: "92931903102538", firmware: "00041.54", pv_energy_total_wh: 1234567, ratings: { out_rating_va: 5000, battery_type: "flooded", output_priority: "solar_first", charger_priority: "solar_only", input_range: "ups" } };
    for (const language of ["en", "es", "de", "fr", "it", "ja", "zh"] as const) {
      const html = renderToStaticMarkup(createElement(UnitInfoCard, { t: (key: string) => text(language, key), reading }));
      expect(html).toContain("92931903102538");
      expect(html).toContain("00041.54");
      expect(html).toContain("1235 kWh");
      expect(html).toContain("5000 VA");
      expect(html, language).not.toMatch(/rt_[a-z_]+|solarSerial|solarUnitInfo|solarRatings|@rt/);
    }
  });
  it("shows nothing when the unit said none of it", () => {
    expect(renderToStaticMarkup(createElement(UnitInfoCard, { t: (key: string) => key, reading: base }))).toBe("");
  });
});
