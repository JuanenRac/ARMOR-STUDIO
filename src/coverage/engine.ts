/**
 * Coverage check of the site plan: which parts of the buildings the presence radars do not see, which doors and windows nothing guards, and where two radars watch the same floor.
 * It is a flat (2D) check at the height of the plan, deterministic, and meant to err on the safe side: a point counts as seen only when it lies inside the radar's field shrunk by a margin,
 * every sample of its cell is seen by one same radar, and no wall of any building lies on the way. Radars and walls at other heights, furniture and the real materials are not known, so the
 * result is a guide for placing sensors, never a proof that the building is protected.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import config from "./coverage.config.json";
import type { SiteModel } from "../designer/ops";
import { cameraView, headingOf, radarView, toMetres, SENSOR_HEIGHT_M, CAMERA_HEIGHT_M } from "../designer/model";
import type { Dimensions } from "../domain";
import { floorBottom } from "../designer/geometry";
import { levelOf } from "./levels";
import { blockedBy, inSectorOf, insidePolygon, polygonArea, type P } from "./geometry";

export const COVERAGE_CONFIG = config;
export const COVERAGE_SCHEMA = "armor-studio/coverage/1";

export type CoverageOptions = { /** Check every floor of the buildings on its own (off: the old flat check of the ground floor). */ floors: boolean; /** Take the mounting height and the tilt of the radars into account (off: flat). */ threeD: boolean; /** Draw only the unseen part of the blind squares next to a radar (the figures never change). */ refine: boolean; marginPercent: number; cellM: number; maxCells: number; minBlindAreaM2: number; overlapWarnRatio: number; openingFloor: number; guardedOpenings: readonly string[]; suggestionInsetM: number; openingReachM: number };
export const DEFAULT_OPTIONS: CoverageOptions = {
  floors: false, threeD: false, refine: false,
  marginPercent: config.marginPercent.default, cellM: config.cellM, maxCells: config.maxCells, minBlindAreaM2: config.minBlindAreaM2, overlapWarnRatio: config.overlapWarnRatio,
  openingFloor: config.openingFloor, guardedOpenings: config.guardedOpenings, suggestionInsetM: config.suggestionInsetM, openingReachM: config.openingReachM,
};
export const clampMargin = (value: number): number => Number.isFinite(value) ? Math.min(config.marginPercent.max, Math.max(config.marginPercent.min, value)) : config.marginPercent.default;

export type OpeningState = "contact" | "presence" | "video" | "none";
export type Level = "warn" | "info";
export type Suggestion = { x: number; y: number; headingDeg: number };
export type CoverageWarning = { code: string; level: Level; args: Array<string | number>; target?: string; suggestion?: Suggestion; /** Only when floors are checked one by one: the floor (0 = ground) the warning is about. */ floor?: number };
export type BlindSpot = { areaM2: number; centre: P; bounds: { minX: number; minY: number; maxX: number; maxY: number }; suggestion: Suggestion };
export type Cell = { x: number; y: number; size: number };
export type ZoneCoverage = { /** Only when floors are checked one by one. */ floor?: number; /** Only when `refine` is on: what to paint for the blind squares (a square next to a radar may be painted only in its unseen part). */ blindDraw?: Cell[]; buildingId: string; name: string; areaM2: number; coveredM2: number; blindM2: number; overlapM2: number; coveredRatio: number; overlapRatio: number; blindSpots: BlindSpot[]; blindCells: Array<{ x: number; y: number; size: number }> };
export type OpeningCoverage = { id: string; buildingId: string; kind: string; at: P; state: OpeningState; by: string[] };
export type SensorCoverage = { id: string; name: string; coveredM2: number; redundant: boolean };
export type CoverageReport = {
  schema: typeof COVERAGE_SCHEMA;
  options: CoverageOptions;
  cellM: number;
  zones: ZoneCoverage[];
  openings: OpeningCoverage[];
  sensors: SensorCoverage[];
  /** Doors and windows on a floor other than the one checked. */
  notChecked: { openings: number };
  warnings: CoverageWarning[];
};

type Source = { id: string; name: string; apex: P; heading: number; halfAngleDeg: number; rangeM: number; floor: number; z: number; tiltDown: number; vHalfDeg: number; assumed: boolean };
const round = (value: number, digits = 2): number => Number(value.toFixed(digits));
const byText = (left: string, right: string): number => left < right ? -1 : left > right ? 1 : 0;

/** The sector a source really counts for: smaller than the one it declares, by the margin (never larger). */
function shrunk(source: Source, marginPercent: number): Source {
  const keep = 1 - clampMargin(marginPercent) / 100;
  return { ...source, halfAngleDeg: source.halfAngleDeg * keep, rangeM: source.rangeM * keep, vHalfDeg: source.vHalfDeg * keep };
}

export function analyseCoverage(model: SiteModel, dimensions: Dimensions, given: Partial<CoverageOptions> = {}): CoverageReport {
  const options: CoverageOptions = { ...DEFAULT_OPTIONS, ...given, marginPercent: clampMargin(given.marginPercent ?? DEFAULT_OPTIONS.marginPercent) };
  const presence: Source[] = model.sensors.map(sensor => {
    const view = radarView(sensor), level = levelOf(model, sensor, dimensions, SENSOR_HEIGHT_M);
    return shrunk({ id: sensor.id, name: sensor.name || sensor.id, apex: toMetres(sensor, dimensions), heading: headingOf(sensor, dimensions), halfAngleDeg: view.halfAngleDeg, rangeM: view.rangeM, floor: level.floor, z: level.z, tiltDown: sensor.tilt ?? 0, vHalfDeg: config.verticalHalfAngleDeg, assumed: level.assumed }, options.marginPercent);
  }).sort((a, b) => byText(a.id, b.id));
  const video: Source[] = model.cameras.filter(camera => camera.enabled !== false).map(camera => {
    const view = cameraView(camera), level = levelOf(model, camera, dimensions, CAMERA_HEIGHT_M);
    return shrunk({ id: camera.id, name: camera.name || camera.id, apex: toMetres(camera, dimensions), heading: headingOf(camera, dimensions), halfAngleDeg: view.halfAngleDeg, rangeM: view.rangeM, floor: level.floor, z: level.z, tiltDown: camera.tilt ?? 0, vHalfDeg: config.verticalHalfAngleDeg, assumed: false }, options.marginPercent);
  }).sort((a, b) => byText(a.id, b.id));

  const walls: Array<[P, P]> = [];
  for (const building of model.buildings) for (let i = 0; i < building.points.length; i += 1) walls.push([building.points[i], building.points[(i + 1) % building.points.length]]);
  /** The 3D test: the target plane `planeZ` must be within the slant range and the vertical field of the radar (centred on its tilt). Only asked for when `threeD` is on. */
  const inVerticalField = (source: Source, target: P, planeZ: number): boolean => {
    const horizontal = Math.hypot(target.x - source.apex.x, target.y - source.apex.y), dz = planeZ - source.z;
    if (Math.hypot(horizontal, dz) > source.rangeM) return false;
    if (horizontal < 1e-6) return Math.abs(dz) < 1e-6;
    return Math.abs(Math.atan2(dz, horizontal) * 180 / Math.PI + source.tiltDown) <= source.vHalfDeg;
  };
  const sees = (source: Source, target: P, planeZ?: number): boolean => inSectorOf(target, source.apex, source.heading, source.halfAngleDeg, source.rangeM) && (planeZ === undefined || inVerticalField(source, target, planeZ)) && !walls.some(([a, b]) => blockedBy(source.apex, target, a, b));

  const warnings: CoverageWarning[] = [];
  const buildings = [...model.buildings].sort((a, b) => byText(a.id, b.id));

  // the size of a cell: never finer than the limit of cells allows, and told when it had to be coarser
  const rough = buildings.reduce((sum, building) => sum + polygonArea(building.points), 0);
  let cellM = options.cellM;
  if (rough / (cellM * cellM) > options.maxCells) { cellM = round(Math.sqrt(rough / options.maxCells), 3); warnings.push({ code: "cell_coarsened", level: "info", args: [cellM] }); }
  const cellArea = cellM * cellM;

  const onFloor = (level: number | undefined): { floor?: number } => level === undefined ? {} : { floor: level };
  const perSensorCells = new Map<string, Set<string>>(presence.map(source => [source.id, new Set<string>()]));
  const zones: ZoneCoverage[] = [];
  for (const building of buildings) for (const level of options.floors ? building.floors.map((_, index) => index) : [undefined]) {
    const here = level === undefined ? presence : presence.filter(source => source.floor === level);
    const planeZ = options.threeD ? building.base + floorBottom(building.floors, level ?? 0) + config.targetHeightM : undefined;
    const zoneKey = `${building.id}:${level ?? ""}`;
    const xs = building.points.map(point => point.x), ys = building.points.map(point => point.y);
    const minX = Math.min(...xs), minY = Math.min(...ys), columns = Math.ceil((Math.max(...xs) - minX) / cellM), rows = Math.ceil((Math.max(...ys) - minY) / cellM);
    const state = new Map<string, number>();   // cell key -> how many presence radars see all of it
    const cells: Array<{ key: string; x: number; y: number }> = [];
    for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) {
      const x = minX + column * cellM, y = minY + row * cellM, centre = { x: x + cellM / 2, y: y + cellM / 2 };
      if (!insidePolygon(centre, building.points)) continue;
      const samples = [centre, ...[{ x, y }, { x: x + cellM, y }, { x, y: y + cellM }, { x: x + cellM, y: y + cellM }].filter(corner => insidePolygon(corner, building.points))];
      const key = `${column}:${row}`;
      let count = 0;
      for (const source of here) if (samples.every(sample => sees(source, sample, planeZ))) { count += 1; perSensorCells.get(source.id)!.add(`${zoneKey}:${key}`); }
      state.set(key, count); cells.push({ key, x, y });
    }
    const blind = cells.filter(cell => state.get(cell.key) === 0);
    const covered = cells.length - blind.length, overlap = cells.filter(cell => (state.get(cell.key) ?? 0) >= 2).length;
    // blind spots: groups of blind cells that touch along a side
    const blindKeys = new Set(blind.map(cell => cell.key)), seen = new Set<string>(), spots: BlindSpot[] = [];
    const index = new Map(cells.map(cell => [cell.key, cell]));
    for (const start of blind) {
      if (seen.has(start.key)) continue;
      const group: Array<{ x: number; y: number }> = [], queue = [start.key];
      seen.add(start.key);
      while (queue.length) {
        const cell = index.get(queue.shift()!)!;
        group.push(cell);
        const column = Math.round((cell.x - minX) / cellM), row = Math.round((cell.y - minY) / cellM);
        for (const next of [`${column + 1}:${row}`, `${column - 1}:${row}`, `${column}:${row + 1}`, `${column}:${row - 1}`]) if (blindKeys.has(next) && !seen.has(next)) { seen.add(next); queue.push(next); }
      }
      const areaM2 = group.length * cellArea;
      if (areaM2 < options.minBlindAreaM2) continue;
      const centre = { x: group.reduce((sum, cell) => sum + cell.x + cellM / 2, 0) / group.length, y: group.reduce((sum, cell) => sum + cell.y + cellM / 2, 0) / group.length };
      // a radar is best put in the corner of the building nearest to the spot, looking at it
      const corner = building.points.reduce((best, point) => Math.hypot(point.x - centre.x, point.y - centre.y) < Math.hypot(best.x - centre.x, best.y - centre.y) ? point : best, building.points[0]);
      const distance = Math.hypot(centre.x - corner.x, centre.y - corner.y) || 1, inset = Math.min(options.suggestionInsetM, distance);
      const at = { x: corner.x + (centre.x - corner.x) / distance * inset, y: corner.y + (centre.y - corner.y) / distance * inset };
      const headingDeg = round(((Math.atan2(centre.y - at.y, centre.x - at.x) * 180 / Math.PI) + 360) % 360, 0);
      spots.push({
        areaM2: round(areaM2), centre: { x: round(centre.x), y: round(centre.y) },
        bounds: { minX: round(Math.min(...group.map(cell => cell.x))), minY: round(Math.min(...group.map(cell => cell.y))), maxX: round(Math.max(...group.map(cell => cell.x)) + cellM), maxY: round(Math.max(...group.map(cell => cell.y)) + cellM) },
        suggestion: { x: round(at.x), y: round(at.y), headingDeg },
      });
    }
    spots.sort((a, b) => b.areaM2 - a.areaM2 || a.centre.x - b.centre.x || a.centre.y - b.centre.y);
    // the squares next to a radar, painted only where nothing sees them (the figures above stay as they are)
    let blindDraw: Cell[] | undefined;
    if (options.refine) {
      const divisions = config.refineDivisions, part = cellM / divisions, reach = config.refineRadiusM + cellM;
      blindDraw = [];
      for (const cell of blind) {
        const centre = { x: cell.x + cellM / 2, y: cell.y + cellM / 2 };
        if (!here.some(source => Math.hypot(centre.x - source.apex.x, centre.y - source.apex.y) <= reach)) { blindDraw.push({ x: round(cell.x), y: round(cell.y), size: cellM }); continue; }
        for (let row = 0; row < divisions; row += 1) for (let column = 0; column < divisions; column += 1) {
          const x = cell.x + column * part, y = cell.y + row * part, middle = { x: x + part / 2, y: y + part / 2 };
          if (!insidePolygon(middle, building.points)) continue;
          const samples = [middle, ...[{ x, y }, { x: x + part, y }, { x, y: y + part }, { x: x + part, y: y + part }].filter(corner => insidePolygon(corner, building.points))];
          if (!here.some(source => samples.every(sample => sees(source, sample, planeZ)))) blindDraw.push({ x: round(x, 4), y: round(y, 4), size: round(part, 4) });
        }
      }
    }
    zones.push({
      ...(level === undefined ? {} : { floor: level }), ...(blindDraw ? { blindDraw } : {}), buildingId: building.id, name: building.name || building.id, areaM2: round(cells.length * cellArea), coveredM2: round(covered * cellArea), blindM2: round(blind.length * cellArea), overlapM2: round(overlap * cellArea),
      coveredRatio: cells.length ? round(covered / cells.length, 3) : 0, overlapRatio: cells.length ? round(overlap / cells.length, 3) : 0, blindSpots: spots,
      blindCells: blind.map(cell => ({ x: round(cell.x), y: round(cell.y), size: cellM })),
    });
    const label = building.name || building.id;
    if (cells.length > 0 && covered === 0) warnings.push({ code: "zone_unwatched", level: "warn", args: [label], target: building.id, suggestion: spots[0]?.suggestion, ...onFloor(level) });
    else for (const spot of spots) warnings.push({ code: "blind_spot", level: "warn", args: [label, spot.areaM2, spot.centre.x, spot.centre.y], target: building.id, suggestion: spot.suggestion, ...onFloor(level) });
    if (cells.length > 0 && overlap / cells.length > options.overlapWarnRatio) warnings.push({ code: "zone_overlap", level: "info", args: [label, Math.round(overlap / cells.length * 100)], target: building.id, ...onFloor(level) });
  }

  // doors and windows
  const openings: OpeningCoverage[] = [];
  let notChecked = 0;
  const buildingById = new Map(model.buildings.map(building => [building.id, building]));
  for (const opening of [...model.openings].sort((a, b) => byText(a.id, b.id))) {
    const building = buildingById.get(opening.buildingId);
    if (!building || !options.guardedOpenings.includes(opening.kind) || opening.edge >= building.points.length) continue;
    if (!options.floors && opening.floor !== options.openingFloor) { notChecked += 1; continue; }
    const a = building.points[opening.edge], b = building.points[(opening.edge + 1) % building.points.length], length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const middle = opening.offset + opening.width / 2, at = { x: a.x + (b.x - a.x) / length * middle, y: a.y + (b.y - a.y) / length * middle };
    // the sight line stops a hair short of the wall the opening is cut in
    const planeZ = options.threeD && options.floors ? building.base + floorBottom(building.floors, opening.floor) + opening.sill + opening.height / 2 : undefined;
    const reach = (source: Source, vertical = false): boolean => {
      const distance = Math.hypot(at.x - source.apex.x, at.y - source.apex.y) || 1, back = Math.min(0.05, distance / 2);
      const short = { x: at.x + (source.apex.x - at.x) / distance * back, y: at.y + (source.apex.y - at.y) / distance * back };
      return (!options.floors || source.floor === opening.floor) && inSectorOf(at, source.apex, source.heading, source.halfAngleDeg, source.rangeM) && (!vertical || planeZ === undefined || inVerticalField(source, at, planeZ)) && !walls.some(([p, q]) => blockedBy(source.apex, short, p, q));
    };
    const seenBy = presence.filter(source => reach(source, true)).map(source => source.id), videoBy = video.filter(source => reach(source)).map(source => source.id);
    const status: OpeningState = opening.contact === true ? "contact" : seenBy.length ? "presence" : videoBy.length ? "video" : "none";
    openings.push({ id: opening.id, buildingId: building.id, kind: opening.kind, at: { x: round(at.x), y: round(at.y) }, state: status, by: status === "presence" ? seenBy : status === "video" ? videoBy : [] });
    if (status === "none") {
      // a radar a few metres inside the wall, looking at the opening
      const nx = -(b.y - a.y) / length, ny = (b.x - a.x) / length;
      const inward = insidePolygon({ x: at.x + nx * options.suggestionInsetM, y: at.y + ny * options.suggestionInsetM }, building.points) ? 1 : -1;
      let reach = options.openingReachM;
      while (reach > options.suggestionInsetM && !insidePolygon({ x: at.x + inward * nx * reach, y: at.y + inward * ny * reach }, building.points)) reach -= 0.5;
      const place = { x: at.x + inward * nx * reach, y: at.y + inward * ny * reach };
      warnings.push({ code: "opening_unguarded", level: "warn", args: [opening.kind, opening.id], target: opening.id, suggestion: { x: round(place.x), y: round(place.y), headingDeg: round(((Math.atan2(-inward * ny, -inward * nx) * 180 / Math.PI) + 360) % 360, 0) } });
    } else if (status === "video") warnings.push({ code: "opening_video_only", level: "info", args: [opening.kind, opening.id], target: opening.id });
  }

  // radars whose whole view is already given by the others
  const sensors: SensorCoverage[] = presence.map(source => {
    const mine = perSensorCells.get(source.id)!;
    const others = presence.filter(other => other.id !== source.id);
    const redundant = mine.size > 0 && others.length > 0 && [...mine].every(key => others.some(other => perSensorCells.get(other.id)!.has(key)));
    if (redundant) warnings.push({ code: "sensor_redundant", level: "info", args: [source.name], target: source.id });
    return { id: source.id, name: source.name, coveredM2: round(mine.size * cellArea), redundant };
  });
  if (buildings.length === 0) warnings.push({ code: "no_buildings", level: "info", args: [] });
  if (!options.floors && model.buildings.some(building => building.floors.length > 1)) warnings.push({ code: "upper_floors", level: "info", args: [] });
  if (options.floors) for (const source of presence) if (source.assumed) warnings.push({ code: "sensor_floor_assumed", level: "info", args: [source.name], target: source.id });

  return { schema: COVERAGE_SCHEMA, options, cellM, zones, openings, sensors, notChecked: { openings: notChecked }, warnings };
}
