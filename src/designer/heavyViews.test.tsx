// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { INITIAL_BUILDINGS, INITIAL_CAMERAS, INITIAL_DIMENSIONS, INITIAL_FEATURES, INITIAL_OPENINGS, INITIAL_ROOF_ITEMS, INITIAL_SENSORS, INITIAL_TERRAIN, INITIAL_WALL_LAMPS } from "../domain";
import type { SiteFeature } from "../domain";
import { Plan2D } from "./Plan2D";
import { DeviceView } from "./DeviceMeshes";
import type { StudioDevice } from "../api";
import { FeatureBody, NEW_FEATURE_KINDS } from "./FeatureMeshes";
import { NO_SELECTION } from "./model";
import type { SiteModel } from "./ops";

// The WebGL views cannot draw in a test browser, so the renderer is replaced by one that only runs the frame callbacks it is given.
vi.mock("@react-three/fiber", () => ({ useFrame: () => undefined, useThree: () => ({}), Canvas: ({ children }: { children?: unknown }) => children ?? null }));

const model = (): SiteModel => ({
  terrain: structuredClone(INITIAL_TERRAIN), buildings: structuredClone(INITIAL_BUILDINGS), openings: structuredClone(INITIAL_OPENINGS), roofItems: structuredClone(INITIAL_ROOF_ITEMS),
  wallLamps: structuredClone(INITIAL_WALL_LAMPS), features: structuredClone(INITIAL_FEATURES), cameras: structuredClone(INITIAL_CAMERAS), sensors: structuredClone(INITIAL_SENSORS), placements: [],
});
const noop = () => undefined;
const planProps = (extra: Partial<Parameters<typeof Plan2D>[0]> = {}): Parameters<typeof Plan2D>[0] => ({
  t: key => key, dimensions: INITIAL_DIMENSIONS, model: model(), selection: NO_SELECTION, tool: "select", devices: [], activeFloor: -1, floorCount: 1, fitSignal: 0,
  onSelect: noop, onDragStart: noop, onDrag: noop, onPlace: noop, onFinishPolygon: noop, onFinishRect: noop, onPlaceLine: noop, onInsertVertex: noop, onFloor: noop, onNotice: noop, ...extra,
});

describe("the 2D plan", () => {
  it("draws the terrain, the buildings and the cameras of the demo site as one SVG", () => {
    const html = renderToStaticMarkup(<Plan2D {...planProps()} />);
    expect(html).toContain("<svg");
    // Every outline the model holds is a path or polygon of the drawing: there is at least one per building plus the terrain.
    const shapes = (html.match(/<(path|polygon)\b/g) ?? []).length;
    expect(shapes).toBeGreaterThanOrEqual(model().buildings.length + 1);
  });

  it("draws the blind squares only when the coverage check hands them over", () => {
    const without = renderToStaticMarkup(<Plan2D {...planProps()} />);
    const withCells = renderToStaticMarkup(<Plan2D {...planProps({ blindCells: [{ x: 1, y: 1, size: 2 }, { x: 3, y: 1, size: 2 }] })} />);
    expect(withCells.length).toBeGreaterThan(without.length);
  });

  it("does not fail on an empty site", () => {
    const empty: SiteModel = { ...model(), buildings: [], openings: [], roofItems: [], wallLamps: [], features: [], cameras: [], sensors: [] };
    expect(() => renderToStaticMarkup(<Plan2D {...planProps({ model: empty })} />)).not.toThrow();
  });

  it("draws every kind of garden or farm object the 3D view knows without failing", () => {
    const base = INITIAL_FEATURES[0] ?? ({ id: "f", kind: "tree", x: 5, y: 5, z: 0, width: 2, depth: 2, height: 3, rotation: 0, slope: 0 } as SiteFeature);
    const features = [...NEW_FEATURE_KINDS].map((kind, index) => ({ ...base, id: `f-${index}`, kind, style: undefined }) as SiteFeature);
    expect(() => renderToStaticMarkup(<Plan2D {...planProps({ model: { ...model(), features } })} />)).not.toThrow();
  });
});

describe("the 3D bodies of the garden objects", () => {
  const feature = (kind: SiteFeature["kind"], style?: string): SiteFeature => ({ id: "f", kind, x: 0, y: 0, z: 0, width: 2, depth: 2, height: 3, rotation: 0, slope: 0, style });
  const glow = { emissive: "#000000", emissiveIntensity: 0 };

  it("builds a body for every kind the file draws, each one with at least one mesh", () => {
    for (const kind of NEW_FEATURE_KINDS) {
      const html = renderToStaticMarkup(<FeatureBody feature={feature(kind)} glow={glow} />);
      expect(html, kind).toContain("mesh");
    }
  });

  it("changes the tree with its style, and carries the glow of a selected object", () => {
    const oak = renderToStaticMarkup(<FeatureBody feature={feature("tree", "oak")} glow={glow} />);
    const pine = renderToStaticMarkup(<FeatureBody feature={feature("tree", "pine")} glow={glow} />);
    expect(oak).not.toBe(pine);
    const lit = renderToStaticMarkup(<FeatureBody feature={feature("tree", "oak")} glow={{ emissive: "#00e5ff", emissiveIntensity: 0.6 }} />);
    expect(lit).toContain("00e5ff");
  });
});

describe("a device in the 3D scene", () => {
  const device = (state: Record<string, unknown>, online = true): StudioDevice => ({
    id: "d1", name: "Smoke", kind: "smoke", protocol: "mqtt", location: "hall", category: "sensor", source: "manual", commands: {} as StudioDevice["commands"], can_command: false,
    expected_interval_s: 60, risk: "low", state: state as StudioDevice["state"], online, last_seen: null, created_at: "2026-01-01T00:00:00Z",
  } as StudioDevice);
  const draw = (d: StudioDevice, selected = false) => renderToStaticMarkup(<DeviceView device={d} selected={selected} hover={false} hooks={{}} x={0} y={0} z={0} rotation={0} pitch={0} roll={0} />);

  it("glows red in alarm and cyan when selected, and not otherwise", () => {
    expect(draw(device({ triggered: true }))).toContain("ff4d5e");
    expect(draw(device({ triggered: false }))).not.toContain("ff4d5e");
    expect(draw(device({ triggered: false }), true)).toContain("00e5ff");
  });

  it("greys the body of a device that went offline", () => {
    expect(draw(device({}, false))).toContain("7d8a90");
  });
});
