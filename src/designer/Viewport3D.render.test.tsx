// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { INITIAL_BUILDINGS, INITIAL_CAMERAS, INITIAL_DIMENSIONS, INITIAL_FEATURES, INITIAL_OPENINGS, INITIAL_ROOF_ITEMS, INITIAL_SENSORS, INITIAL_TERRAIN, INITIAL_WALL_LAMPS } from "../domain";
import type { SiteFeature } from "../domain";
import Viewport3D, { type ViewportProps } from "./Viewport3D";
import { NEW_FEATURE_KINDS } from "./FeatureMeshes";
import { NO_SELECTION } from "./model";
import type { SiteModel } from "./ops";

// The WebGL view cannot draw in a test browser: the canvas hands its children on as they are, and the helpers of the 3D library draw nothing, so the scene is built (every mesh the model asks
// for) and can be read as markup.
vi.mock("@react-three/fiber", () => ({ useFrame: () => undefined, useThree: () => ({}), Canvas: ({ children }: { children?: unknown }) => children ?? null }));
vi.mock("@react-three/drei", () => ({ Edges: () => null, Grid: () => null, Html: () => null, Line: () => null, OrbitControls: () => null }));

const model = (): SiteModel => ({
  terrain: structuredClone(INITIAL_TERRAIN), buildings: structuredClone(INITIAL_BUILDINGS), openings: structuredClone(INITIAL_OPENINGS), roofItems: structuredClone(INITIAL_ROOF_ITEMS),
  wallLamps: structuredClone(INITIAL_WALL_LAMPS), features: structuredClone(INITIAL_FEATURES), cameras: structuredClone(INITIAL_CAMERAS), sensors: structuredClone(INITIAL_SENSORS), placements: [],
});
const noop = () => undefined;
const props = (extra: Partial<ViewportProps> = {}): ViewportProps => ({
  t: key => key, dimensions: INITIAL_DIMENSIONS, model: model(), selection: NO_SELECTION, tool: "select", onTool: noop, devices: [], activeFloor: -1, floorCount: 2, onFloor: noop,
  onSelect: noop, onDragStart: noop, onMove: noop, onElevate: noop, onPlace: noop, onNotice: noop, sharedSections: [[]], ...extra,
});

describe("the 3D view of the designer", () => {
  it("builds the scene of the demo site with its buildings, openings, cameras and radars, the floor selector and the compass", () => {
    const html = renderToStaticMarkup(<Viewport3D {...props()} />);
    expect(html).toContain("viewport3d");
    expect(html).toContain("mesh");
    expect(html).toContain("v3d-compass");
    expect(html).toContain("plan-floors");
    expect(html.match(/<button/g)?.length ?? 0).toBeGreaterThan(3);
  });

  it("builds the scene on each floor and with the cones of the fields of view on", () => {
    for (const activeFloor of [-1, 0, 1]) expect(() => renderToStaticMarkup(<Viewport3D {...props({ activeFloor, cones: true })} />), `floor ${activeFloor}`).not.toThrow();
  });

  it("builds every kind of garden or farm object and a site that is empty", () => {
    const base = INITIAL_FEATURES[0] ?? ({ id: "f", kind: "tree", x: 5, y: 5, z: 0, width: 2, depth: 2, height: 3, rotation: 0, slope: 0 } as SiteFeature);
    const features = [...NEW_FEATURE_KINDS].map((kind, index) => ({ ...base, id: `f-${index}`, kind, style: undefined }) as SiteFeature);
    expect(() => renderToStaticMarkup(<Viewport3D {...props({ model: { ...model(), features } })} />)).not.toThrow();
    const empty: SiteModel = { ...model(), buildings: [], openings: [], roofItems: [], wallLamps: [], features: [], cameras: [], sensors: [] };
    expect(() => renderToStaticMarkup(<Viewport3D {...props({ model: empty })} />)).not.toThrow();
  });

  it("builds the scene with each kind of thing selected, with the roof and wall tools, and as a viewer with the live targets", () => {
    const site = model();
    const selections = [
      ...site.buildings.slice(0, 1).map(building => ({ kind: "building", id: building.id })), ...site.cameras.slice(0, 1).map(camera => ({ kind: "camera", id: camera.id })),
      ...site.sensors.slice(0, 1).map(sensor => ({ kind: "sensor", id: sensor.id })), ...site.features.slice(0, 1).map(feature => ({ kind: "feature", id: feature.id })),
    ];
    for (const selection of selections) expect(() => renderToStaticMarkup(<Viewport3D {...props({ selection: selection as ViewportProps["selection"] })} />), selection.kind).not.toThrow();
    for (const tool of ["chimney", "door", "wall-lamp", "move", "elevate"] as const) expect(() => renderToStaticMarkup(<Viewport3D {...props({ tool })} />), tool).not.toThrow();
    const target = { key: "n:1:1", node: "n", sensorId: "sensor-01", trackId: 1, point: { x: 20, y: 20 }, apex: { x: 10, y: 10 }, speedMmS: 500, counted: true, inRated: true, alert: "high" as const };
    const viewer = renderToStaticMarkup(<Viewport3D {...props({ live: { targets: [target, { ...target, key: "n:1:2", trackId: 2, counted: false, alert: "review" }] } })} />);
    expect(viewer).toContain("v3d-mini");
    expect(viewer).not.toContain("toolbox");
  });
});
