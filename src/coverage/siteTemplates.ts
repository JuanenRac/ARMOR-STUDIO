/**
 * Starting points for the site plan: a building that brings its own floor plan (its footprint, the height of each floor, its doors and windows) and the radars on each floor, with the floor
 * of every radar set. A template only adds to the plan; nothing already drawn is touched, and the new pieces are put to the east of what is there so they never overlap it.
 * The numbers are a typical building to be adjusted to the real one, not a design.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { clamp, DEFAULT_ROOF, fitDimensions, nextId, rescaleDevices, round2, type SiteModel } from "../designer/ops";
import { toPercent } from "../designer/model";
import type { Building, Dimensions, Opening, Sensor } from "../domain";

export type SiteTemplate = {
  id: string; titleKey: string;
  /** Footprint in metres (width east-west, depth north-south) and the height of each floor, bottom first. */
  width: number; depth: number; floors: readonly number[];
  openings: ReadonlyArray<{ edge: number; floor: number; kind: Opening["kind"]; offset: number; width: number; height: number; sill: number }>;
  /** Radars in metres from the south-west corner of the building, with their floor and the way they face (degrees anticlockwise from east). */
  radars: ReadonlyArray<{ floor: number; x: number; y: number; heading: number }>;
};

export const SITE_TEMPLATES: readonly SiteTemplate[] = [
  {
    id: "house2", titleKey: "cov_site_tpl_house2", width: 10, depth: 8, floors: [2.8, 2.6],
    openings: [
      { edge: 0, floor: 0, kind: "door", offset: 4.5, width: 0.9, height: 2.1, sill: 0 }, { edge: 1, floor: 0, kind: "window", offset: 3, width: 1.4, height: 1.2, sill: 0.9 },
      { edge: 0, floor: 1, kind: "window", offset: 2, width: 1.2, height: 1.2, sill: 0.9 }, { edge: 2, floor: 1, kind: "window", offset: 4, width: 1.2, height: 1.2, sill: 0.9 },
    ],
    radars: [{ floor: 0, x: 0.4, y: 0.4, heading: 45 }, { floor: 1, x: 9.6, y: 7.6, heading: 225 }],
  },
  {
    id: "shop1", titleKey: "cov_site_tpl_shop1", width: 8, depth: 6, floors: [3],
    openings: [{ edge: 0, floor: 0, kind: "door", offset: 3.5, width: 1.2, height: 2.2, sill: 0 }, { edge: 0, floor: 0, kind: "window", offset: 0.8, width: 2, height: 1.8, sill: 0.4 }, { edge: 2, floor: 0, kind: "door", offset: 3, width: 0.9, height: 2.1, sill: 0 }],
    radars: [{ floor: 0, x: 0.4, y: 0.4, heading: 40 }, { floor: 0, x: 7.6, y: 5.6, heading: 220 }],
  },
  {
    id: "block3", titleKey: "cov_site_tpl_block3", width: 12, depth: 9, floors: [2.8, 2.8, 2.8],
    openings: [{ edge: 0, floor: 0, kind: "door", offset: 5.5, width: 1.2, height: 2.1, sill: 0 }, { edge: 1, floor: 1, kind: "window", offset: 3, width: 1.2, height: 1.2, sill: 0.9 }, { edge: 1, floor: 2, kind: "window", offset: 3, width: 1.2, height: 1.2, sill: 0.9 }],
    radars: [{ floor: 0, x: 0.4, y: 0.4, heading: 45 }, { floor: 1, x: 0.4, y: 0.4, heading: 45 }, { floor: 2, x: 0.4, y: 0.4, heading: 45 }],
  },
];

/** The plan with the template added. The work area grows when the new building does not fit, and the devices already in the plan keep their place on the ground. */
export function addSiteTemplate(model: SiteModel, dimensions: Dimensions, template: SiteTemplate, name: string): { model: SiteModel; dimensions: Dimensions; buildingId: string } {
  const east = Math.max(0, ...model.buildings.flatMap(building => building.points.map(point => point.x)));
  const x0 = round2(east + 2), y0 = 2;
  const id = nextId("building", model.buildings.map(building => building.id));
  const points = [{ x: x0, y: y0 }, { x: x0 + template.width, y: y0 }, { x: x0 + template.width, y: y0 + template.depth }, { x: x0, y: y0 + template.depth }];
  const building: Building = { id, name, points, base: 0, floors: [...template.floors], roof: { ...DEFAULT_ROOF }, thickness: 0.25 };
  const withBuilding: SiteModel = { ...model, buildings: [...model.buildings, building] };
  const fitted = fitDimensions(dimensions, withBuilding);
  const moved = rescaleDevices(withBuilding, dimensions, fitted);
  const takenOpenings = new Set(moved.openings.map(opening => opening.id));
  const openings: Opening[] = template.openings.map(item => {
    const openingId = nextId(item.kind, takenOpenings);
    takenOpenings.add(openingId);
    return { id: openingId, buildingId: id, edge: item.edge, floor: item.floor, kind: item.kind, offset: item.offset, width: item.width, height: item.height, sill: item.sill };
  });
  const takenSensors = new Set(moved.sensors.map(sensor => sensor.id));
  const sensors: Sensor[] = template.radars.map(radar => {
    const sensorId = nextId("sensor", takenSensors);
    takenSensors.add(sensorId);
    const place = toPercent({ x: x0 + clamp(radar.x, 0, template.width), y: y0 + clamp(radar.y, 0, template.depth) }, fitted);
    return { id: sensorId, name: sensorId, kind: "LD2450", ...place, heading: radar.heading, floor: radar.floor };
  });
  return { model: { ...moved, openings: [...moved.openings, ...openings], sensors: [...moved.sensors, ...sensors] }, dimensions: fitted, buildingId: id };
}
