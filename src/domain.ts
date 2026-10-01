/**
 * A.R.M.O.R. Studio domain model: the shapes and defaults shared by every view.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { SystemState } from "./types";

export type View = "overview" | "weather" | "alarms" | "cameras" | "radar" | "inverters" | "batteries" | "devices" | "automations" | "record" | "history" | "network" | "services" | "siteDesigner" | "electricalDesigner" | "networkDesigner" | "system" | "configuration";
export type GridSize = 1 | 2 | 4 | 6 | 8 | 9 | 12 | 16;
export const GRID_SIZES: readonly GridSize[] = [1, 2, 4, 6, 8, 9, 12, 16];

export type Camera = {
  id: string; name: string; host: string; snapshotUrl: string; enabled: boolean; x: number; y: number;
  username?: string; onvifPort?: number; rtspPort?: number; rtspPath?: string; hasCredentials?: boolean; liveVideoAvailable?: boolean;
  /** Where it faces, in degrees anticlockwise from east; unset means toward the middle of the site. */
  heading?: number;
  /** Degrees it looks down from the horizontal (0 = level). */
  tilt?: number;
  /** Mounting height above the ground in metres; unset means 2.4 m for a camera. */
  z?: number;
  /** Field of view in degrees (the whole angle) and how far it sees in metres; unset means the defaults of the designer (90 degrees, 12 m). */
  fov?: number; range?: number;
};
export type Sensor = {
  id: string; name: string; x: number; y: number; kind: "LD2450" | "LD2461"; heading?: number; tilt?: number;
  /** Mounting height in metres; unset means 1.5 m, the manual's recommendation. */ z?: number;
  /** The field node (its `node_id`) whose reports this radar produces, and which of its radars (`sensor_id` in the telemetry, 0 or unset = any). */
  node?: string; channel?: number;
  /** The radar's sideways axis is taken to point to the right of where it faces; set this when a real radar shows it the other way round. */
  mirror?: boolean;
};
export type Dimensions = { width: number; depth: number; height: number };
export type Point = { x: number; y: number };

/** The parcel: a closed polygon in metres (x east, y north). */
export type Terrain = { points: Point[]; /** Ground colour, "#rrggbb"; unset keeps the default. */ color?: string };

/** How a roof is shaped: flat, one pitch (shed), two (gable), four at equal slope (hip) or four to a point (pyramid). */
export type RoofStyle = "flat" | "shed" | "gable" | "hip" | "pyramid";
export type Roof = { style: RoofStyle; slope: number; overhang: number; ridge: number };

/**
 * A building: a closed footprint polygon in metres, the elevation of its ground floor, the height of each storey
 * (one number per floor, bottom first) and a roof over the top.
 */
export type Building = { id: string; name: string; points: Point[]; base: number; floors: number[]; roof: Roof; thickness: number; /** Wall and roof colours, "#rrggbb"; unset keeps the default. */ color?: string; roofColor?: string; /** The roof is taken off, to see the rooms of the top floor from above. */ roofHidden?: boolean };

/** A door, a window, a garage door (wide, sectional) or a plain opening in a wall (for an awning, an arch). */
export type OpeningKind = "door" | "window" | "garage" | "opening";
/** A door or window in one wall (the footprint edge from point `edge` to the next) of one floor, at any height. */
export type Opening = { id: string; buildingId: string; edge: number; floor: number; kind: OpeningKind; offset: number; width: number; height: number; sill: number; /** Arched at the top. */ arch?: boolean; /** A small balcony outside it (a door or a window of an upper floor). */ balcony?: boolean; /** The door leaf or the window frame, "#rrggbb". */ color?: string };

export type RoofItemKind = "chimney" | "solar" | "antenna" | "vent";
/** Something standing on a roof; its height above the ground follows the roof surface. */
export type RoofItem = { id: string; buildingId: string; kind: RoofItemKind; x: number; y: number; width: number; depth: number; height: number; rotation: number; tilt: number; color?: string };

/** A lamp on a building wall: which wall, how far along it, how high, and how far it reaches out. */
export type WallLamp = { id: string; buildingId: string; edge: number; offset: number; z: number; reach: number; /** The colour of its light, "#rrggbb". */ color?: string };

/** Objects standing on the ground. `lamp` is a lamp post (a tube of `height` with the light on top), `mast` an antenna mast. */
export type SiteFeatureKind = "pillar" | "lamp" | "mast" | "solar" | "canopy" | "entrance" | "path" | "road" | "tree" | "kennel" | "fence" | "fountain" | "coop" | "gate" | "sidewalk" | "pool" | "planter" | "terrace";
/** The looks a kind can have (a tree is an oak, a pine, a palm or a bush; a fence, a gate). */
export const FEATURE_STYLES: Partial<Record<SiteFeatureKind, readonly string[]>> = {
  tree: ["oak", "pine", "palm", "bush"], fence: ["mesh", "picket", "rail", "wire", "wall"], gate: ["iron", "wood", "modern", "stone"], sidewalk: ["concrete", "brick", "gravel"],
  pool: ["rectangle", "round", "oval", "l-shape"], planter: ["box", "round", "bed"], terrace: ["open", "railed"],
};
/** Something fixed to a mast: a television antenna, a satellite dish or a Wi-Fi dish, at a height, turned, of a size. */
export type MastPartKind = "tv" | "satellite" | "wifi";
export type MastPart = { kind: MastPartKind; z: number; rotation: number; size: number };
export const MAST_PART_KINDS: readonly MastPartKind[] = ["tv", "satellite", "wifi"];
export type SiteFeature = {
  id: string; kind: SiteFeatureKind; x: number; y: number; z: number; width: number; depth: number; height: number;
  /** Turn about the vertical axis (degrees); `pitch` tips it about the east-west axis (X) and `roll` about the north-south one (Z). */
  rotation: number; slope: number; pitch?: number; roll?: number;
  /** One of `FEATURE_STYLES[kind]`. */
  style?: string;
  /** Pieces made together (the strips of a sidewalk around a house) share a group: they are moved and deleted together. */
  group?: string;
  /** The main colour of the object, "#rrggbb"; unset keeps the default. */
  color?: string;
  /** A name of the operator's own ("north gate"), shown in the list of objects. */
  label?: string;
  /** What a mast carries (up to twelve). */
  parts?: MastPart[];
};

/** Where a device (a smoke detector, a door contact, a plug...) stands in the design: metres, x east, y north, z up; turned like any object. */
export type DevicePlacement = { device_id: string; x: number; y: number; z: number; rotation: number; pitch?: number; roll?: number };

/** The menus, in groups: what is happening now, what the system controls, the design, and administration. */
export const NAV_GROUPS: ReadonlyArray<{ title: string; items: ReadonlyArray<readonly [View, string]> }> = [
  { title: "navMonitor", items: [["overview", "⌂"], ["weather", "☁"], ["alarms", "!"], ["cameras", "◉"], ["radar", "◌"]] },
  { title: "navEnergy", items: [["inverters", "☀"], ["batteries", "▮"]] },
  { title: "navNetwork", items: [["network", "⇄"]] },
  { title: "navControl", items: [["devices", "◈"], ["automations", "⚡"]] },
  { title: "navEvidence", items: [["record", "▣"], ["history", "≡"]] },
  { title: "navDesign", items: [["siteDesigner", "⌗"], ["electricalDesigner", "⌁"], ["networkDesigner", "⌬"]] },
  { title: "navAdmin", items: [["system", "▤"], ["services", "▦"], ["configuration", "⚙"]] },
];
export const NAV: ReadonlyArray<readonly [View, string]> = NAV_GROUPS.flatMap(group => group.items);

/** The Armor theme is the default look (near-black, cyan, amber); the others are alternatives. */
export const THEMES = ["Armor", "Aqua", "Midnight", "Ember", "Forest", "Violet", "Solar", "Ice", "Crimson", "Mono", "High contrast", "Metallic", "Professional", "Videogame", "Terminal", "Blueprint"] as const;
export type Theme = (typeof THEMES)[number];
export const DEFAULT_THEME: Theme = "Armor";

export const LANGUAGES = [
  { code: "en", name: "English" }, { code: "es", name: "Español" }, { code: "de", name: "Deutsch" }, { code: "fr", name: "Français" },
  { code: "it", name: "Italiano" }, { code: "ja", name: "日本語" }, { code: "zh", name: "中文" },
] as const;
export type LanguageCode = (typeof LANGUAGES)[number]["code"];

/** Shown only while the server cannot be reached, and labelled as demonstration data. */
export const DEMO_STATE: SystemState = {
  mode: "armed", revision: 7, updated_at: new Date(0).toISOString(),
  nodes: {
    "north-east": { node_id: "north-east", online: true, stale: false, timestamp_ms: 0, lux: 14, target_count: 2, alert_level: "high" },
    "south-west": { node_id: "south-west", online: true, stale: false, timestamp_ms: 0, lux: 1280, target_count: 0, alert_level: "normal" },
  },
};

export const INITIAL_CAMERAS: Camera[] = [
  { id: "cam-01", name: "Entrance", host: "Not configured", snapshotUrl: "", enabled: true, x: 25, y: 75 },
  { id: "cam-02", name: "Perimeter north", host: "Not configured", snapshotUrl: "", enabled: true, x: 78, y: 20 },
  { id: "cam-03", name: "Workshop", host: "Not configured", snapshotUrl: "", enabled: false, x: 50, y: 45 },
  { id: "cam-04", name: "Perimeter south", host: "Not configured", snapshotUrl: "", enabled: false, x: 13, y: 65 },
];
export const INITIAL_SENSORS: Sensor[] = [
  { id: "sensor-01", name: "Entrance radar", kind: "LD2450", x: 27, y: 78 },
  { id: "sensor-02", name: "Workshop radar", kind: "LD2450", x: 63, y: 45 },
];

/** The work area of the designer, in metres; the terrain, buildings, cameras and sensors all live inside it. */
export const INITIAL_DIMENSIONS: Dimensions = { width: 60, depth: 40, height: 3 };
export const INITIAL_TERRAIN: Terrain = { points: [{ x: 6, y: 5 }, { x: 52, y: 4 }, { x: 55, y: 30 }, { x: 30, y: 36 }, { x: 5, y: 32 }] };
const rect = (x: number, y: number, w: number, d: number): Point[] => [{ x, y }, { x: x + w, y }, { x: x + w, y: y + d }, { x, y: y + d }];
export const INITIAL_BUILDINGS: Building[] = [
  { id: "building-01", name: "House", points: rect(16, 12, 12, 8), base: 0, floors: [2.8, 2.8], thickness: 0.25, roof: { style: "gable", slope: 30, overhang: 0.4, ridge: 0 } },
  { id: "building-02", name: "Garage", points: rect(34, 14, 6, 6), base: 0, floors: [2.6], thickness: 0.2, roof: { style: "shed", slope: 8, overhang: 0.3, ridge: 0 } },
];
export const INITIAL_OPENINGS: Opening[] = [
  { id: "door-01", buildingId: "building-01", edge: 0, floor: 0, kind: "door", offset: 2, width: 0.9, height: 2.1, sill: 0 },
  { id: "window-01", buildingId: "building-01", edge: 0, floor: 0, kind: "window", offset: 6, width: 1.6, height: 1.2, sill: 0.9 },
  { id: "window-02", buildingId: "building-01", edge: 0, floor: 1, kind: "window", offset: 2, width: 1.2, height: 1.2, sill: 0.9 },
  { id: "window-03", buildingId: "building-01", edge: 0, floor: 1, kind: "window", offset: 7, width: 1.2, height: 1.2, sill: 0.9 },
  { id: "window-04", buildingId: "building-01", edge: 1, floor: 0, kind: "window", offset: 2.5, width: 1.4, height: 1.2, sill: 0.9 },
  { id: "window-05", buildingId: "building-01", edge: 2, floor: 1, kind: "window", offset: 5, width: 1.2, height: 1.0, sill: 1.1 },
  { id: "door-02", buildingId: "building-02", edge: 0, floor: 0, kind: "door", offset: 1.5, width: 2.4, height: 2.2, sill: 0 },
];
export const INITIAL_ROOF_ITEMS: RoofItem[] = [
  { id: "chimney-01", buildingId: "building-01", kind: "chimney", x: 25.5, y: 16, width: 0.6, depth: 0.6, height: 1.2, rotation: 0, tilt: 0 },
  { id: "solar-01", buildingId: "building-01", kind: "solar", x: 19, y: 14, width: 1.7, depth: 1.0, height: 0.06, rotation: 0, tilt: 0 },
  { id: "solar-02", buildingId: "building-01", kind: "solar", x: 21, y: 14, width: 1.7, depth: 1.0, height: 0.06, rotation: 0, tilt: 0 },
  { id: "antenna-01", buildingId: "building-01", kind: "antenna", x: 17.5, y: 18, width: 0.1, depth: 0.1, height: 3, rotation: 0, tilt: 0 },
];
export const INITIAL_WALL_LAMPS: WallLamp[] = [{ id: "wall-lamp-01", buildingId: "building-01", edge: 1, offset: 4, z: 2.4, reach: 0.4 }];
export const INITIAL_FEATURES: SiteFeature[] = [
  { id: "lamp-01", kind: "lamp", x: 13, y: 9, z: 0, width: 0.12, depth: 0.12, height: 5, rotation: 0, slope: 0 },
  { id: "lamp-02", kind: "lamp", x: 45, y: 10, z: 0, width: 0.12, depth: 0.12, height: 5, rotation: 0, slope: 0 },
  { id: "pillar-01", kind: "pillar", x: 8, y: 16, z: 0, width: 0.5, depth: 0.5, height: 2.2, rotation: 0, slope: 0 },
  { id: "pillar-02", kind: "pillar", x: 8, y: 19, z: 0, width: 0.5, depth: 0.5, height: 2.2, rotation: 0, slope: 0 },
  { id: "mast-01", kind: "mast", x: 48, y: 28, z: 0, width: 0.25, depth: 0.25, height: 9, rotation: 0, slope: 0 },
  { id: "path-01", kind: "path", x: 18, y: 9.5, z: 0, width: 1.4, depth: 5, height: 0.04, rotation: 0, slope: 0 },
  { id: "road-01", kind: "road", x: 30, y: 6.5, z: 0, width: 4, depth: 46, height: 0.03, rotation: 90, slope: 0 },
  { id: "tree-01", kind: "tree", x: 10, y: 26, z: 0, width: 4, depth: 4, height: 6, rotation: 0, slope: 0, style: "oak" },
  { id: "tree-02", kind: "tree", x: 46, y: 25, z: 0, width: 3.4, depth: 3.4, height: 7, rotation: 0, slope: 0, style: "pine" },
  { id: "tree-03", kind: "tree", x: 13, y: 15, z: 0, width: 3, depth: 3, height: 5.5, rotation: 0, slope: 0, style: "palm" },
  { id: "fountain-01", kind: "fountain", x: 22, y: 27, z: 0, width: 2.6, depth: 2.6, height: 1.7, rotation: 0, slope: 0 },
  { id: "kennel-01", kind: "kennel", x: 43, y: 21, z: 0, width: 1, depth: 1.2, height: 0.95, rotation: 20, slope: 0 },
  { id: "coop-01", kind: "coop", x: 47, y: 16, z: 0, width: 1.9, depth: 1.2, height: 1.4, rotation: -15, slope: 0 },
  { id: "gate-01", kind: "gate", x: 30, y: 33.5, z: 0, width: 4.6, depth: 0.6, height: 2.5, rotation: 0, slope: 0, style: "iron" },
  { id: "fence-01", kind: "fence", x: 22.5, y: 33.75, z: 0, width: 15, depth: 0.08, height: 1.2, rotation: 2, slope: 0, style: "mesh" },
  { id: "fence-02", kind: "fence", x: 43, y: 32.5, z: 0, width: 17, depth: 0.08, height: 1.2, rotation: -10, slope: 0, style: "mesh" },
];

export const cameraIsConfigured = (camera: Camera): boolean =>
  camera.host.trim() !== "" && camera.host !== "Not configured" && Boolean(camera.hasCredentials || camera.rtspPath || camera.snapshotUrl);
