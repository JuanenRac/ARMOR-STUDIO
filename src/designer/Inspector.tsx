/**
 * The properties panel of the site designer: the work area, and whatever is selected - the terrain, a building (its floors,
 * its roof, its sides), a door or window, a lamp, something on a roof or the ground, a camera or a radar - and the list of
 * everything on the site to select from.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useState } from "react";
import type { StudioDevice } from "../api";
import { KindIcon } from "../deviceKinds";
import { FEATURE_STYLES, MAST_PART_KINDS, type Building, type Camera, type Dimensions, type Opening, type RoofItem, type RoofStyle, type Sensor, type SiteFeature, type WallLamp, BUILDING_USES, BUILDING_MATERIALS, OPENING_STYLES, LAMP_KINDS, type BuildingUse, type BuildingMaterial, type LampKind, CAMERA_LENSES, type CameraLens } from "../domain";
import { area, bounds, edgeOf, floorBottom, isSimplePolygon, nearestOnOutline, pointInPolygon, roofRise, signedArea, totalHeight } from "./geometry";
import { DEFAULT_DOOR_COLOUR, DEFAULT_FEATURE_COLOUR, DEFAULT_LIGHT_COLOUR, DEFAULT_ROOF_COLOUR, DEFAULT_ROOF_ITEM_COLOUR, DEFAULT_TERRAIN_COLOUR, DEFAULT_WALL_COLOUR, DEFAULT_WINDOW_FRAME_COLOUR, featureColourOf } from "./colors";
import { toolIcon } from "./icons";
import { clamp, formatMetres, headingOf, radarView, round2, SENSOR_HEIGHT_M, CAMERA_HEIGHT_M, toolLabelKey, type Selection, type Tool, cameraZoom, cameraTeleDeg, cameraTeleRangeM } from "./model";
import { addFloor, addMastPart, removeMastPart, updateMastPart, deleteBuilding, insertBuildingVertex, insertVertex, isRectangle, moveVertex, removeBuildingVertex, removeFloor, resizeRectangle, setFootprint, setSideLength, updateBuilding, type SiteModel, FLOOR_HEIGHT_M } from "./ops";
import type { Point } from "../domain";

/** A colour of an object: the picker starts from what is on screen, and "default" goes back to the object's own look. */
function ColorField({ t, label, value, fallback, onChange }: { t: (key: string) => string; label: string; value: string | undefined; fallback: string; onChange: (value: string | undefined) => void }) {
  return <div className="color-field"><label>{label}<input type="color" value={value ?? fallback} onChange={event => onChange(event.target.value)} /></label>{value && <button type="button" className="link-button" onClick={() => onChange(undefined)}>{t("colorDefault")}</button>}</div>;
}

type Edit = (change: (model: SiteModel) => SiteModel, key?: string) => void;
type FieldProps = { label: string; unit?: string; value: number; min?: number; max?: number; step?: number; onChange: (value: number) => void };

function NumberField({ label, unit, value, min, max, step = 0.05, onChange }: FieldProps) {
  return <label>{label}<input type="number" min={min} max={max} step={step} value={Number.isFinite(value) ? value : 0} onChange={event => { const next = Number(event.target.value); if (event.target.value !== "" && Number.isFinite(next)) onChange(next); }} />{unit && <small>{unit}</small>}</label>;
}

export type InspectorProps = {
  t: (key: string) => string;
  dimensions: Dimensions; setDimensions: (value: Dimensions) => void;
  model: SiteModel; selection: Selection; edit: Edit; onSelect: (selection: Selection) => void;
  onRemove: () => void; onDuplicate: () => void; onRectTerrain: (width: number, depth: number) => void;
  /** The field nodes the server knows. */
  nodeIds?: string[];
  onTool?: (tool: Tool) => void;
  /** The devices, which of them is next to be placed, picking one to place, and the way to the Devices menu. */
  devices?: StudioDevice[]; pendingDevice?: string; onPickDevice?: (id: string) => void; onOpenDevices?: () => void;
};

/** Every corner of an outline with its coordinates to edit, a button to add a corner after it and one to remove it. */
function CornerTable({ t, points, selected, onSelect, onMove, onInsert, onRemove, keyPrefix }: {
  t: (key: string) => string; points: readonly Point[]; selected?: number; onSelect: (index: number) => void;
  onMove: (index: number, axis: "x" | "y", value: number, key: string) => void; onInsert: (edge: number) => void; onRemove: (index: number) => void; keyPrefix: string;
}) {
  return <div className="corner-table" role="table" aria-label={t("cornersList")}>
    {points.map((point, index) => <div key={index} className={`corner-row ${selected === index ? "on" : ""}`} onClick={() => onSelect(index)}>
      <b>{index + 1}</b>
      {(["x", "y"] as const).map(axis => <input key={axis} type="number" step={0.1} aria-label={`${t("corner")} ${index + 1} ${axis.toUpperCase()}`} value={point[axis]} onFocus={() => onSelect(index)} onChange={event => { const next = Number(event.target.value); if (event.target.value !== "" && Number.isFinite(next)) onMove(index, axis, next, `${keyPrefix}:${index}:${axis}`); }} />)}
      <button className="mini" title={t("addCornerAfter")} aria-label={t("addCornerAfter")} onClick={event => { event.stopPropagation(); onInsert(index); }}>+</button>
      <button className="mini" title={t("deleteCorner")} aria-label={t("deleteCorner")} disabled={points.length <= 3} onClick={event => { event.stopPropagation(); onRemove(index); }}>−</button>
    </div>)}
  </div>;
}

const ROOF_STYLES: readonly RoofStyle[] = ["flat", "shed", "gable", "hip", "pyramid"];
const FEATURE_TOOL: Record<SiteFeature["kind"], Tool> = { pillar: "pillar", lamp: "lamp", mast: "mast", solar: "solar", canopy: "canopy", entrance: "entrance", path: "path", road: "road", tree: "tree", kennel: "kennel", fence: "fence", fountain: "fountain", coop: "coop", gate: "gate", sidewalk: "sidewalk", pool: "pool", planter: "planter", terrace: "terrace", bench: "bench", table: "table", barbecue: "barbecue", pergola: "pergola", shed: "shed", hedge: "hedge", mailbox: "mailbox", bins: "bins", tank: "tank", "ac-unit": "ac-unit", "electrical-box": "electrical-box", car: "car", wall: "wall", fireplace: "fireplace", stairs: "stairs", kitchen: "kitchen", bathroom: "bathroom", bed: "bed", wardrobe: "wardrobe", sofa: "sofa", armchair: "armchair", dining: "dining", tv: "tv" };
const ROOF_ITEM_TOOL: Record<RoofItem["kind"], Tool> = { chimney: "chimney", solar: "roof-solar", antenna: "antenna", vent: "chimney", gutter: "gutter", downpipe: "downpipe" };

export function Inspector(p: InspectorProps) {
  const { t, model, selection, edit } = p;
  // Two tabs keep the panel short: what is selected, and everything on the site to pick from. Selecting something opens its properties.
  const [tab, setTab] = useState<"objects" | "properties">("objects");
  const selectionKey = `${selection.kind}:${"id" in selection ? selection.id : ""}`;
  useEffect(() => { if (selection.kind !== "none") setTab("properties"); }, [selectionKey]);   // eslint-disable-line react-hooks/exhaustive-deps
  const building = (selection.kind === "building" ? model.buildings.find(item => item.id === selection.id) : undefined) as Building | undefined;
  const opening = selection.kind === "opening" ? model.openings.find(item => item.id === selection.id) : undefined;
  const roofItem = selection.kind === "roofItem" ? model.roofItems.find(item => item.id === selection.id) : undefined;
  const wallLamp = selection.kind === "wallLamp" ? model.wallLamps.find(item => item.id === selection.id) : undefined;
  const feature = selection.kind === "feature" ? model.features.find(item => item.id === selection.id) : undefined;
  const camera = selection.kind === "camera" ? model.cameras.find(item => item.id === selection.id) : undefined;
  const sensor = selection.kind === "sensor" ? model.sensors.find(item => item.id === selection.id) : undefined;
  const placement = selection.kind === "device" ? model.placements.find(item => item.device_id === selection.id) : undefined;
  const deviceOf = (id: string) => p.devices?.find(item => item.id === id);
  const unplaced = (p.devices ?? []).filter(device => !model.placements.some(item => item.device_id === device.id));
  const terrainArea = Math.abs(signedArea(model.terrain.points)), terrainBox = bounds(model.terrain.points);
  const perimeter = model.terrain.points.reduce((sum, _, index) => sum + edgeOf(model.terrain.points, index).length, 0);

  const title = building ? building.name : opening ? t(opening.kind) : roofItem ? t(`roofItem_${roofItem.kind}`) : wallLamp ? t("toolWallLamp") : feature ? (feature.label ?? t(toolLabelKey(FEATURE_TOOL[feature.kind]))) : camera ? camera.name : sensor ? sensor.name : selection.kind === "terrain" ? t("terrain") : placement ? (deviceOf(placement.device_id)?.name ?? placement.device_id) : t("siteObjects");

  const setOpening = (id: string, patch: Partial<Opening>, field: string) => edit(m => ({ ...m, openings: m.openings.map(item => item.id === id ? { ...item, ...patch } : item) }), `opening:${id}:${field}`);
  const setRoofItem = (id: string, patch: Partial<RoofItem>, field: string) => edit(m => ({ ...m, roofItems: m.roofItems.map(item => item.id === id ? { ...item, ...patch } : item) }), `roofItem:${id}:${field}`);
  const setWallLamp = (id: string, patch: Partial<WallLamp>, field: string) => edit(m => ({ ...m, wallLamps: m.wallLamps.map(item => item.id === id ? { ...item, ...patch } : item) }), `wallLamp:${id}:${field}`);
  const setFeature = (id: string, patch: Partial<SiteFeature>, field: string) => edit(m => ({ ...m, features: m.features.map(item => item.id === id ? { ...item, ...patch } : item) }), `feature:${id}:${field}`);
  const setCamera = (id: string, patch: Partial<Camera>, field: string) => edit(m => ({ ...m, cameras: m.cameras.map(item => item.id === id ? { ...item, ...patch } : item) }), `camera:${id}:${field}`);
  const setSensor = (id: string, patch: Partial<Sensor>, field: string) => edit(m => ({ ...m, sensors: m.sensors.map(item => item.id === id ? { ...item, ...patch } : item) }), `sensor:${id}:${field}`);
  const setBuilding = (id: string, patch: Partial<Building>, field: string) => edit(m => updateBuilding(m, id, patch), `building:${id}:${field}`);
  const heading = (item: Camera | Sensor, apply: (value: number) => void) =>
    <NumberField label={t("deviceHeading")} unit="°" step={5} value={Math.round(headingOf(item, p.dimensions))} onChange={value => apply(((value % 360) + 360) % 360)} />;
  const remove = <button className="danger-button" onClick={p.onRemove}>{t("deleteObject")}</button>;

  const listRow = (selected: Selection, tool: Tool, label: string, sub: string) => {
    const active = p.selection.kind === selected.kind && ("id" in selected ? "id" in p.selection && p.selection.id === selected.id : true);
    return <button key={`${selected.kind}-${"id" in selected ? selected.id : ""}`} className={active ? "selected" : ""} onClick={() => p.onSelect(selected)}><span className="list-icon">{toolIcon(tool)}</span><span className="list-name">{label}</span><small>{sub}</small></button>;
  };

  return <aside className="building-inspector">
    <div className="inspector-tabs" role="tablist">
      <button role="tab" aria-selected={tab === "objects"} className={tab === "objects" ? "active" : ""} onClick={() => setTab("objects")}>{t("siteObjects")}</button>
      <button role="tab" aria-selected={tab === "properties"} className={tab === "properties" ? "active" : ""} onClick={() => setTab("properties")}>{t("properties")}</button>
    </div>
    {tab === "properties" && <>
    <header><h3>{title}</h3><small className="drag-hint">{t("designerHelp")}</small></header>

    {selection.kind === "none" && <section className="object-editor">
      <h4>{t("workArea")}</h4>
      <div className="inspector-grid">
        <NumberField label={t("width")} unit="m" min={10} step={1} value={p.dimensions.width} onChange={value => p.setDimensions({ ...p.dimensions, width: Math.max(10, value) })} />
        <NumberField label={t("depth")} unit="m" min={10} step={1} value={p.dimensions.depth} onChange={value => p.setDimensions({ ...p.dimensions, depth: Math.max(10, value) })} />
      </div>
      <p className="muted small">{t("workAreaNote")}</p>
      <p className="muted small">{t("terrain")}: {terrainArea.toFixed(0)} m² · {t("buildingsCount")}: {model.buildings.length}</p>
    </section>}

    {selection.kind === "terrain" && <section className="object-editor">
      <h4>{t("terrain")}</h4>
      <ColorField t={t} label={t("colorGround")} value={model.terrain.color} fallback={DEFAULT_TERRAIN_COLOUR} onChange={value => edit(m => ({ ...m, terrain: { ...m.terrain, color: value } }), "terrain:color")} />
      <p className="muted small">{terrainArea.toFixed(1)} m² · {t("perimeter")} {perimeter.toFixed(1)} m · {model.terrain.points.length} {t("corners")}</p>
      {isRectangle(model.terrain.points)
        ? <>
            <div className="inspector-grid">
              <NumberField label={t("terrainWidth")} unit="m" min={1} step={0.5} value={round2(terrainBox.maxX - terrainBox.minX)} onChange={value => p.onRectTerrain(Math.max(1, value), terrainBox.maxY - terrainBox.minY)} />
              <NumberField label={t("terrainDepth")} unit="m" min={1} step={0.5} value={round2(terrainBox.maxY - terrainBox.minY)} onChange={value => p.onRectTerrain(terrainBox.maxX - terrainBox.minX, Math.max(1, value))} />
            </div>
            <p className="muted small">{t("terrainRectNote")}</p>
          </>
        : <p className="muted small">{t("terrainShapeNote")}</p>}
      <h4>{t("cornersList")}</h4>
      <CornerTable t={t} points={model.terrain.points} selected={selection.vertex} keyPrefix="terrain"
        onSelect={index => p.onSelect({ kind: "terrain", vertex: index })}
        onMove={(index, axis, value, key) => edit(m => ({ ...m, terrain: { points: moveVertex(m.terrain.points, index, { ...m.terrain.points[index], [axis]: value }) } }), key)}
        onInsert={edge => { edit(m => ({ ...m, terrain: { points: insertVertex(m.terrain.points, edge).points } })); p.onSelect({ kind: "terrain", vertex: edge + 1 }); }}
        onRemove={index => edit(m => { const points = m.terrain.points.filter((_, i) => i !== index); return points.length >= 3 && isSimplePolygon(points) ? { ...m, terrain: { points } } : m; })} />
      <div className="inspector-actions">
        <button onClick={() => { const longest = model.terrain.points.reduce((best, _, i) => edgeOf(model.terrain.points, i).length > edgeOf(model.terrain.points, best).length ? i : best, 0); edit(m => ({ ...m, terrain: { points: insertVertex(m.terrain.points, longest).points } })); p.onSelect({ kind: "terrain", vertex: longest + 1 }); }}>{t("addCornerButton")}</button>
        <button onClick={() => p.onTool?.("terrain-poly")}>{t("redrawTerrain")}</button>
      </div>
      <ul className="inspector-hints"><li>{t("hintCorners")}</li></ul>
    </section>}

    {building && <section className="object-editor">
      <h4>{t("building")}</h4>
      <div className="color-row"><ColorField t={t} label={t("colorWalls")} value={building.color} fallback={DEFAULT_WALL_COLOUR} onChange={value => setBuilding(building.id, { color: value }, "color")} /><ColorField t={t} label={t("colorRoof")} value={building.roofColor} fallback={DEFAULT_ROOF_COLOUR} onChange={value => setBuilding(building.id, { roofColor: value }, "roofColor")} /></div>
      <div className="inspector-grid">
        <label>{t("deviceName")}<input value={building.name} maxLength={60} onChange={event => setBuilding(building.id, { name: event.target.value }, "name")} /></label>
        <NumberField label={t("groundElevation")} unit="m" step={0.1} min={-5} max={200} value={building.base} onChange={value => setBuilding(building.id, { base: round2(clamp(value, -5, 200)) }, "base")} />
        <NumberField label={t("wallThickness")} unit="m" step={0.05} min={0.1} max={1.5} value={building.thickness} onChange={value => setBuilding(building.id, { thickness: round2(clamp(value, 0.1, 1.5)) }, "thickness")} />
        <label>{t("buildingUse")}<select value={building.use ?? "house"} onChange={event => setBuilding(building.id, { use: event.target.value === "house" ? undefined : event.target.value as BuildingUse }, "use")}>{BUILDING_USES.map(use => <option key={use} value={use}>{t("buildingUse_" + use)}</option>)}</select></label>
        <label>{t("buildingMaterial")}<select value={building.material ?? "plaster"} onChange={event => setBuilding(building.id, { material: event.target.value === "plaster" ? undefined : event.target.value as BuildingMaterial }, "material")}>{BUILDING_MATERIALS.map(material => <option key={material} value={material}>{t("buildingMaterial_" + material)}</option>)}</select></label>
      </div>
      <label className="check-row"><input type="checkbox" checked={Boolean(building.roofHidden)} onChange={event => setBuilding(building.id, { roofHidden: event.target.checked || undefined }, "roofHidden")} /> {t("roofHidden")}</label>
      <p className="muted small">{area(building.points).toFixed(1)} m² · {t("totalHeight")} {formatMetres(totalHeight(building.floors))}{building.roof.style !== "flat" && <> · {t("roofRise")} {formatMetres(roofRise(building.points, building.roof))}</>}</p>

      <h4>{t("floors")}</h4>
      <div className="floor-list">
        {building.floors.map((height, floor) => <div key={floor} className="floor-row">
          <span>{floor === 0 ? t("groundFloor") : `${t("floor")} ${floor + 1}`}</span>
          <input type="number" min={1.8} max={8} step={0.05} value={height} aria-label={`${t("floorHeight")} ${floor + 1}`} onChange={event => { const next = Number(event.target.value); if (Number.isFinite(next)) setBuilding(building.id, { floors: building.floors.map((h, index) => index === floor ? round2(clamp(next, 1.8, 8)) : h) }, `floor${floor}`); }} /><small>m</small>
          <button className="mini" disabled={building.floors.length <= 1} title={t("removeFloor")} aria-label={t("removeFloor")} onClick={() => edit(m => removeFloor(m, building.id, floor))}>−</button>
        </div>)}
      </div>
      <div className="inspector-actions"><button onClick={() => edit(m => addFloor(m, building.id, FLOOR_HEIGHT_M))}>{t("addFloor")}</button></div>

      <h4>{t("roof")}</h4>
      <div className="inspector-grid">
        <label>{t("roofStyle")}<select value={building.roof.style} onChange={event => setBuilding(building.id, { roof: { ...building.roof, style: event.target.value as RoofStyle } }, "roofStyle")}>{ROOF_STYLES.map(style => <option key={style} value={style}>{t(`roof_${style}`)}</option>)}</select></label>
        <NumberField label={t("roofSlope")} unit="°" min={0} max={70} step={1} value={building.roof.slope} onChange={value => setBuilding(building.id, { roof: { ...building.roof, slope: clamp(value, 0, 70) } }, "slope")} />
        <NumberField label={t("roofOverhang")} unit="m" min={0} max={3} step={0.05} value={building.roof.overhang} onChange={value => setBuilding(building.id, { roof: { ...building.roof, overhang: round2(clamp(value, 0, 3)) } }, "overhang")} />
        <NumberField label={t("roofRidge")} unit="°" min={0} max={180} step={5} value={building.roof.ridge} onChange={value => setBuilding(building.id, { roof: { ...building.roof, ridge: ((value % 180) + 180) % 180 } }, "ridge")} />
      </div>

      <h4>{t("sides")}</h4>
      {isRectangle(building.points)
        ? <div className="inspector-grid">
            <NumberField label={t("lengthLabel")} unit="m" min={0.5} step={0.1} value={round2(edgeOf(building.points, 0).length)} onChange={value => edit(m => setFootprint(m, building.id, resizeRectangle(building.points, value, edgeOf(building.points, 1).length)), `building:${building.id}:len`)} />
            <NumberField label={t("widthLabel")} unit="m" min={0.5} step={0.1} value={round2(edgeOf(building.points, 1).length)} onChange={value => edit(m => setFootprint(m, building.id, resizeRectangle(building.points, edgeOf(building.points, 0).length, value)), `building:${building.id}:wid`)} />
          </div>
        : <div className="inspector-grid">{building.points.map((_, edge) => <NumberField key={edge} label={`${t("side")} ${edge + 1}`} unit="m" min={0.1} step={0.1} value={round2(edgeOf(building.points, edge).length)} onChange={value => edit(m => setFootprint(m, building.id, setSideLength(building.points, edge, value)), `building:${building.id}:side${edge}`)} />)}</div>}
      <h4>{t("cornersList")}</h4>
      <CornerTable t={t} points={building.points} selected={selection.kind === "building" ? selection.vertex : undefined} keyPrefix={`building:${building.id}`}
        onSelect={index => p.onSelect({ kind: "building", id: building.id, vertex: index })}
        onMove={(index, axis, value, key) => edit(m => { const current = m.buildings.find(item => item.id === building.id); return current ? setFootprint(m, building.id, moveVertex(current.points, index, { ...current.points[index], [axis]: value })) : m; }, key)}
        onInsert={edge => { let index = edge + 1; edit(m => { const result = insertBuildingVertex(m, building.id, edge); index = result.index; return result.model; }); p.onSelect({ kind: "building", id: building.id, vertex: index }); }}
        onRemove={index => edit(m => removeBuildingVertex(m, building.id, index))} />
      <div className="inspector-actions">
        <button onClick={p.onDuplicate}>{t("duplicate")}</button>
        {selection.kind === "building" && selection.vertex !== undefined && building.points.length > 3 && <button className="danger-button" onClick={p.onRemove}>{t("deleteCorner")}</button>}
        <button className="danger-button" onClick={() => edit(m => deleteBuilding(m, building.id))}>{t("deleteBuilding")}</button>
      </div>
    </section>}

    {opening && (() => {
      const owner = model.buildings.find(item => item.id === opening.buildingId), wall = owner ? edgeOf(owner.points, Math.min(opening.edge, owner.points.length - 1)).length : 1;
      return <section className="object-editor">
        <h4>{t(opening.kind === "door" ? "doorProperties" : opening.kind === "window" ? "windowProperties" : opening.kind === "garage" ? "garageProperties" : "archProperties")}</h4>
        <ColorField t={t} label={opening.kind === "door" || opening.kind === "garage" ? t("colorDoor") : t("colorFrame")} value={opening.color} fallback={opening.kind === "door" ? DEFAULT_DOOR_COLOUR : DEFAULT_WINDOW_FRAME_COLOUR} onChange={value => setOpening(opening.id, { color: value }, "color")} />
        <div className="inspector-grid">
          <label>{t("floor")}<select value={opening.floor} onChange={event => setOpening(opening.id, { floor: Number(event.target.value) }, "floor")}>{(owner?.floors ?? [0]).map((_, floor) => <option key={floor} value={floor}>{floor === 0 ? t("groundFloor") : `${t("floor")} ${floor + 1}`}</option>)}</select></label>
          <label>{t("wallSide")}<select value={opening.edge} onChange={event => setOpening(opening.id, { edge: Number(event.target.value) }, "edge")}>{(owner?.points ?? []).map((_, edge) => <option key={edge} value={edge}>{t("side")} {edge + 1}</option>)}</select></label>
          <NumberField label={t("openingPosition")} unit="m" min={0} max={wall} step={0.05} value={opening.offset} onChange={value => setOpening(opening.id, { offset: round2(clamp(value, 0, Math.max(0, wall - opening.width))) }, "offset")} />
          <NumberField label={t("openingWidth")} unit="m" min={0.3} max={wall} step={0.05} value={opening.width} onChange={value => setOpening(opening.id, { width: round2(clamp(value, 0.3, wall)) }, "width")} />
          <NumberField label={t("openingHeight")} unit="m" min={0.3} max={6} step={0.05} value={opening.height} onChange={value => setOpening(opening.id, { height: round2(clamp(value, 0.3, 6)) }, "height")} />
          <NumberField label={t("openingSill")} unit="m" min={0} max={6} step={0.05} value={opening.sill} onChange={value => setOpening(opening.id, { sill: round2(clamp(value, 0, 6)) }, "sill")} />
        </div>
        <label className="check-row"><input type="checkbox" checked={Boolean(opening.arch)} onChange={event => setOpening(opening.id, { arch: event.target.checked || undefined }, "arch")} /> {t("openingArch")}</label>
        {(opening.kind === "door" || opening.kind === "window") && <label className="check-row"><input type="checkbox" checked={Boolean(opening.balcony)} onChange={event => setOpening(opening.id, { balcony: event.target.checked || undefined }, "balcony")} /> {t("openingBalcony")}</label>}
        {OPENING_STYLES[opening.kind] && <div className="inspector-grid">
          <label>{t("openingStyle")}<select value={opening.style ?? OPENING_STYLES[opening.kind]![0]} onChange={event => setOpening(opening.id, { style: event.target.value === OPENING_STYLES[opening.kind]![0] ? undefined : event.target.value }, "style")}>{OPENING_STYLES[opening.kind]!.map(style => <option key={style} value={style}>{t("openStyle_" + style)}</option>)}</select></label>
          {(opening.kind === "door" || opening.kind === "garage") && <label>{t("doorSwing")}<select value={opening.swing ?? "in"} onChange={event => setOpening(opening.id, { swing: event.target.value === "out" ? "out" : undefined }, "swing")}><option value="in">{t("doorSwing_in")}</option><option value="out">{t("doorSwing_out")}</option></select></label>}
          {opening.kind === "door" && <label>{t("doorHinge")}<select value={opening.hinge ?? "left"} onChange={event => setOpening(opening.id, { hinge: event.target.value === "right" ? "right" : undefined }, "hinge")}><option value="left">{t("doorHinge_left")}</option><option value="right">{t("doorHinge_right")}</option></select></label>}
        </div>}
        {opening.kind !== "opening" && <label className="check-row"><input type="checkbox" checked={Boolean(opening.shutter)} onChange={event => setOpening(opening.id, { shutter: event.target.checked || undefined }, "shutter")} /> {t("openingShutter")}</label>}
        {opening.kind !== "opening" && <label className="check-row"><input type="checkbox" checked={Boolean(opening.contact)} onChange={event => setOpening(opening.id, { contact: event.target.checked || undefined }, "contact")} /> {t("openingContact")}</label>}
        <div className="inspector-actions">{remove}</div>
      </section>;
    })()}

    {roofItem && <section className="object-editor">
      <h4>{t(`roofItem_${roofItem.kind}`)}</h4>
      <ColorField t={t} label={t("colorLabel")} value={roofItem.color} fallback={DEFAULT_ROOF_ITEM_COLOUR[roofItem.kind]} onChange={value => setRoofItem(roofItem.id, { color: value }, "color")} />
      <div className="inspector-grid">
        <NumberField label="X" unit="m" step={0.1} value={roofItem.x} onChange={value => setRoofItem(roofItem.id, { x: round2(value) }, "x")} />
        <NumberField label="Y" unit="m" step={0.1} value={roofItem.y} onChange={value => setRoofItem(roofItem.id, { y: round2(value) }, "y")} />
        <NumberField label={t("objectWidth")} unit="m" min={0.05} step={0.05} value={roofItem.width} onChange={value => setRoofItem(roofItem.id, { width: round2(Math.max(0.05, value)) }, "width")} />
        <NumberField label={t("objectDepth")} unit="m" min={0.05} step={0.05} value={roofItem.depth} onChange={value => setRoofItem(roofItem.id, { depth: round2(Math.max(0.05, value)) }, "depth")} />
        <NumberField label={t("objectHeight")} unit="m" min={0.02} step={0.05} value={roofItem.height} onChange={value => setRoofItem(roofItem.id, { height: round2(Math.max(0.02, value)) }, "height")} />
        <NumberField label={t("objectRotation")} unit="°" step={5} value={roofItem.rotation} onChange={value => setRoofItem(roofItem.id, { rotation: value }, "rotation")} />
        {roofItem.kind === "solar" && <NumberField label={t("panelTilt")} unit="°" step={5} min={0} max={80} value={roofItem.tilt} onChange={value => setRoofItem(roofItem.id, { tilt: Math.max(0, Math.min(80, value)) }, "tilt")} />}
        {roofItem.kind === "solar" && <NumberField label={t("panelWatts")} unit="W" min={10} max={2000} step={10} value={roofItem.watts ?? 400} onChange={value => setRoofItem(roofItem.id, { watts: clamp(Math.round(value), 10, 2000) === 400 ? undefined : clamp(Math.round(value), 10, 2000) }, "watts")} />}
        {roofItem.kind === "solar" && <NumberField label={t("panelCount")} min={1} max={500} step={1} value={roofItem.count ?? 1} onChange={value => setRoofItem(roofItem.id, { count: clamp(Math.round(value), 1, 500) === 1 ? undefined : clamp(Math.round(value), 1, 500) }, "count")} />}
      </div>
      {roofItem.kind === "solar" && <p className="muted small">{t("panelArrayTotal")} {((roofItem.watts ?? 400) * (roofItem.count ?? 1)).toLocaleString()} W</p>}
      <p className="muted small">{t("roofItemNote")}</p>
      <div className="inspector-actions">{remove}</div>
    </section>}

    {wallLamp && <section className="object-editor">
      <h4>{t("toolWallLamp")}</h4>
      <ColorField t={t} label={t("colorLight")} value={wallLamp.color} fallback={DEFAULT_LIGHT_COLOUR} onChange={value => setWallLamp(wallLamp.id, { color: value }, "color")} />
      <div className="inspector-grid">
        <NumberField label={t("openingPosition")} unit="m" min={0} step={0.05} value={wallLamp.offset} onChange={value => setWallLamp(wallLamp.id, { offset: round2(Math.max(0, value)) }, "offset")} />
        <NumberField label={t("mountHeight")} unit="m" min={0} step={0.1} value={wallLamp.z} onChange={value => setWallLamp(wallLamp.id, { z: round2(Math.max(0, value)) }, "z")} />
        <NumberField label={t("armReach")} unit="m" min={0.1} max={2} step={0.05} value={wallLamp.reach} onChange={value => setWallLamp(wallLamp.id, { reach: round2(clamp(value, 0.1, 2)) }, "reach")} />
        <label>{t("lampKind")}<select value={wallLamp.lampKind ?? "bulb"} onChange={event => setWallLamp(wallLamp.id, { lampKind: event.target.value === "bulb" ? undefined : event.target.value as LampKind }, "lampKind")}>{LAMP_KINDS.map(kind => <option key={kind} value={kind}>{t("lampKind_" + kind)}</option>)}</select></label>
        <NumberField label={t("lampWatts")} unit="W" min={1} max={2000} step={1} value={wallLamp.watts ?? 10} onChange={value => setWallLamp(wallLamp.id, { watts: clamp(Math.round(value), 1, 2000) === 10 ? undefined : clamp(Math.round(value), 1, 2000) }, "watts")} />
      </div>
      <label className="check-row"><input type="checkbox" checked={Boolean(wallLamp.motion)} onChange={event => setWallLamp(wallLamp.id, { motion: event.target.checked || undefined }, "motion")} /> {t("lampMotion")}</label>
      <div className="inspector-actions">{remove}</div>
    </section>}

    {feature && <section className="object-editor">
      <h4>{t(toolLabelKey(FEATURE_TOOL[feature.kind]))}</h4>
      <ColorField t={t} label={t("colorLabel")} value={feature.color} fallback={featureColourOf(feature.kind, feature.style)} onChange={value => setFeature(feature.id, { color: value }, "color")} />
      <label className="feature-name">{t("featureName")}<input value={feature.label ?? ""} maxLength={40} placeholder={t("featureNameHint")} onChange={event => setFeature(feature.id, { label: event.target.value || undefined }, "label")} /></label>
      <div className="inspector-grid">
        <NumberField label="X" unit="m" step={0.1} value={feature.x} onChange={value => setFeature(feature.id, { x: round2(value) }, "x")} />
        <NumberField label="Y" unit="m" step={0.1} value={feature.y} onChange={value => setFeature(feature.id, { y: round2(value) }, "y")} />
        <NumberField label={t("objectWidth")} unit="m" min={0.05} step={0.05} value={feature.width} onChange={value => setFeature(feature.id, { width: round2(Math.max(0.05, value)) }, "width")} />
        {!["lamp", "mast"].includes(feature.kind) && <NumberField label={t("objectDepth")} unit="m" min={0.05} step={0.05} value={feature.depth} onChange={value => setFeature(feature.id, { depth: round2(Math.max(0.05, value)) }, "depth")} />}
        <NumberField label={t("objectHeight")} unit="m" min={0.01} step={0.1} value={feature.height} onChange={value => setFeature(feature.id, { height: round2(Math.max(0.01, value)) }, "height")} />
        <NumberField label={t("objectElevation")} unit="m" min={0} step={0.1} value={feature.z} onChange={value => setFeature(feature.id, { z: round2(Math.max(0, value)) }, "z")} />
        {feature.kind === "terrace" && (() => {
          // a terrace can stand on any floor of the house it belongs to: the building it is over (or beside), and the floor whose level its elevation is at
          const near = model.buildings.map(item => ({ item, distance: pointInPolygon({ x: feature.x, y: feature.y }, item.points) ? 0 : nearestOnOutline(item.points, { x: feature.x, y: feature.y }).distance })).filter(entry => entry.distance < 4).sort((x, y) => x.distance - y.distance)[0]?.item;
          if (!near) return null;
          const levels = near.floors.map((_, floor) => near.base + floorBottom(near.floors, floor));
          const current = levels.findIndex(level => Math.abs(level - feature.z) < 0.05);
          return <label>{t("terraceFloor")}<select value={current} onChange={event => { const floor = Number(event.target.value); if (floor >= 0) setFeature(feature.id, { z: round2(levels[floor]) }, "z"); }}>
            {current < 0 && <option value={-1}>{t("terraceFloorCustom")}</option>}
            {levels.map((_, floor) => <option key={floor} value={floor}>{floor === 0 ? t("groundFloor") : `${t("floorShort")} ${floor + 1}`}</option>)}
          </select></label>;
        })()}
        <NumberField label={t("turnAboutVertical")} unit="°" step={5} min={-180} max={180} value={feature.rotation} onChange={value => setFeature(feature.id, { rotation: value }, "rotation")} />
        <NumberField label={t("tiltAboutX")} unit="°" step={5} min={-180} max={180} value={feature.pitch ?? 0} onChange={value => setFeature(feature.id, { pitch: clamp(value, -180, 180) || undefined }, "pitch")} />
        <NumberField label={t("tiltAboutZ")} unit="°" step={5} min={-180} max={180} value={feature.roll ?? 0} onChange={value => setFeature(feature.id, { roll: clamp(value, -180, 180) || undefined }, "roll")} />
        {feature.kind === "lamp" && <NumberField label={t("lampWatts")} unit="W" min={1} max={2000} step={1} value={feature.watts ?? 10} onChange={value => setFeature(feature.id, { watts: clamp(Math.round(value), 1, 2000) === 10 ? undefined : clamp(Math.round(value), 1, 2000) }, "watts")} />}
        {FEATURE_STYLES[feature.kind] && <label>{t("featureStyle")}<select value={feature.style ?? FEATURE_STYLES[feature.kind]![0]} onChange={event => setFeature(feature.id, { style: event.target.value }, "style")}>{FEATURE_STYLES[feature.kind]!.map(style => <option key={style} value={style}>{t(`style_${style}`)}</option>)}</select></label>}
        {["solar", "canopy"].includes(feature.kind) && <NumberField label={t("roofSlope")} unit="°" min={0} max={60} step={1} value={feature.slope} onChange={value => setFeature(feature.id, { slope: clamp(value, 0, 60) }, "slope")} />}
      </div>
      {feature.kind === "lamp" && <label className="check-row"><input type="checkbox" checked={Boolean(feature.motion)} onChange={event => setFeature(feature.id, { motion: event.target.checked || undefined }, "motion")} /> {t("lampMotion")}</label>}
      {feature.kind === "gate" && <label className="check-row"><input type="checkbox" checked={Boolean(feature.automatic)} onChange={event => setFeature(feature.id, { automatic: event.target.checked || undefined }, "automatic")} /> {t("gateAutomatic")}</label>}
      {feature.kind === "mast" && <>
        <h4>{t("mastParts")}</h4>
        {(feature.parts ?? []).map((part, index) => <div key={index} className="inspector-grid mast-part">
          <label>{t(`mastPart_${part.kind}`)}<NumberField label={t("objectElevation")} unit="m" min={0} max={feature.height} step={0.1} value={part.z} onChange={value => edit(m => updateMastPart(m, feature.id, index, { z: round2(clamp(value, 0, feature.height)) }), `mast:${feature.id}:${index}:z`)} /></label>
          <NumberField label={t("turnAboutVertical")} unit="°" min={-180} max={180} step={5} value={part.rotation} onChange={value => edit(m => updateMastPart(m, feature.id, index, { rotation: clamp(value, -360, 360) }), `mast:${feature.id}:${index}:r`)} />
          <NumberField label={t("objectWidth")} unit="m" min={0.1} max={5} step={0.05} value={part.size} onChange={value => edit(m => updateMastPart(m, feature.id, index, { size: round2(clamp(value, 0.1, 5)) }), `mast:${feature.id}:${index}:s`)} />
          <button className="danger-button" onClick={() => edit(m => removeMastPart(m, feature.id, index))}>{t("deleteObject")}</button>
        </div>)}
        <div className="inspector-actions">{MAST_PART_KINDS.map(kind => <button key={kind} onClick={() => edit(m => addMastPart(m, feature.id, kind))}>+ {t(`mastPart_${kind}`)}</button>)}</div>
      </>}
      <div className="inspector-actions">{remove}</div>
    </section>}

    {camera && <section className="object-editor">
      <h4>{t("toolCamera")}</h4>
      <div className="inspector-grid">
        {heading(camera, value => setCamera(camera.id, { heading: value }, "heading"))}
        <NumberField label={t("tiltDown")} unit="°" min={-90} max={90} step={5} value={camera.tilt ?? 0} onChange={value => setCamera(camera.id, { tilt: clamp(value, -90, 90) || undefined }, "tilt")} />
        <NumberField label={t("mountHeight")} unit="m" min={0} max={100} step={0.1} value={camera.z ?? CAMERA_HEIGHT_M} onChange={value => setCamera(camera.id, { z: round2(clamp(value, 0, 100)) }, "z")} />
        <label>{t("cameraKind")}<select value={camera.kind === "ptz" ? "ptz" : "fixed"} onChange={event => setCamera(camera.id, event.target.value === "ptz" ? { kind: "ptz" } : { kind: undefined, pan: undefined, tiltSweep: undefined }, "kind")}><option value="fixed">{t("cameraKindFixed")}</option><option value="ptz">{t("cameraKindPtz")}</option></select></label>
        <label>{t("cameraMount")}<select value={camera.mount ?? "wall"} onChange={event => setCamera(camera.id, { mount: event.target.value === "wall" ? undefined : event.target.value as "ceiling" | "pole" | "ground" }, "mount")}>{(["wall", "ceiling", "pole", "ground"] as const).map(mount => <option key={mount} value={mount}>{t("cameraMount_" + mount)}</option>)}</select></label>
        <label>{t("cameraLens")}<select value={camera.lens ?? "fixed"} onChange={event => setCamera(camera.id, event.target.value === "fixed" ? { lens: undefined, opticalZoom: undefined } : { lens: event.target.value as CameraLens }, "lens")}>{CAMERA_LENSES.map(lens => <option key={lens} value={lens}>{t("cameraLens_" + lens)}</option>)}</select></label>
        {camera.lens && <NumberField label={t("cameraOpticalZoom")} unit="×" min={1} max={60} step={1} value={camera.opticalZoom ?? 1} onChange={value => setCamera(camera.id, { opticalZoom: clamp(Math.round(value), 1, 60) === 1 ? undefined : clamp(Math.round(value), 1, 60) }, "opticalZoom")} />}
        <NumberField label={t("cameraDigitalZoom")} unit="×" min={1} max={32} step={1} value={camera.digitalZoom ?? 1} onChange={value => setCamera(camera.id, { digitalZoom: clamp(Math.round(value), 1, 32) === 1 ? undefined : clamp(Math.round(value), 1, 32) }, "digitalZoom")} />
        {camera.kind === "ptz" && <NumberField label={t("cameraPan")} unit="°" min={90} max={360} step={5} value={camera.pan ?? 360} onChange={value => setCamera(camera.id, { pan: clamp(Math.round(value), 90, 360) === 360 ? undefined : clamp(Math.round(value), 90, 360) }, "pan")} />}
        {camera.kind === "ptz" && <NumberField label={t("cameraTiltSweep")} unit="°" min={30} max={180} step={5} value={camera.tiltSweep ?? 90} onChange={value => setCamera(camera.id, { tiltSweep: clamp(Math.round(value), 30, 180) === 90 ? undefined : clamp(Math.round(value), 30, 180) }, "tiltSweep")} />}
        <NumberField label={t(camera.lens ? "cameraFovWide" : camera.kind === "ptz" ? "cameraLensFov" : "cameraFov")} unit="°" min={20} max={180} step={5} value={camera.fov ?? 90} onChange={value => setCamera(camera.id, { fov: clamp(Math.round(value), 20, 180) === 90 ? undefined : clamp(Math.round(value), 20, 180) }, "fov")} />
        <NumberField label={t("cameraRange")} unit="m" min={2} max={60} step={1} value={camera.range ?? 12} onChange={value => setCamera(camera.id, { range: clamp(Math.round(value), 2, 60) === 12 ? undefined : clamp(Math.round(value), 2, 60) }, "range")} />
        <NumberField label={t("cameraNight")} unit="m" min={0} max={100} step={1} value={camera.nightRange ?? 0} onChange={value => setCamera(camera.id, { nightRange: clamp(Math.round(value), 0, 100) || undefined }, "nightRange")} />
      </div>
      {cameraZoom(camera) > 1 && <p className="muted small">{`${t("cameraTele")} ${cameraTeleDeg(camera)}° · ${cameraTeleRangeM(camera)} m`}</p>}
      {camera.digitalZoom !== undefined && <p className="muted small">{t("cameraDigitalNote")}</p>}
      <p className="muted small">{t(camera.kind === "ptz" ? "cameraPtzNote" : "cameraViewNote")}</p>
    </section>}

    {sensor && <section className="object-editor">
      <h4>{t("toolSensor")} · {sensor.kind}</h4>
      <div className="inspector-grid">
        <label>{t("deviceName")}<input value={sensor.name} maxLength={80} onChange={event => setSensor(sensor.id, { name: event.target.value }, "name")} /></label>
        <label>{t("sensorModel")}<select value={sensor.kind} onChange={event => setSensor(sensor.id, { kind: event.target.value === "LD2461" ? "LD2461" : "LD2450" }, "kind")}><option value="LD2450">LD2450</option><option value="LD2461">LD2461</option></select></label>
        {heading(sensor, value => setSensor(sensor.id, { heading: value }, "heading"))}
        <NumberField label={t("tiltDown")} unit="°" min={-90} max={90} step={5} value={sensor.tilt ?? 0} onChange={value => setSensor(sensor.id, { tilt: clamp(value, -90, 90) || undefined }, "tilt")} />
        <NumberField label={t("mountHeight")} unit="m" min={0} max={100} step={0.1} value={sensor.z ?? SENSOR_HEIGHT_M} onChange={value => setSensor(sensor.id, { z: round2(clamp(value, 0, 100)) }, "z")} />
        <label title={t("sensorNodeHelp")}>{t("sensorNode")}<input list="armor-node-ids" value={sensor.node ?? ""} placeholder={t("noNodeChosen")} maxLength={64} onChange={event => { const value = event.target.value.trim().toLowerCase(); setSensor(sensor.id, { node: value === "" ? undefined : value }, "node"); }} /></label>
        <datalist id="armor-node-ids">{(p.nodeIds ?? []).map(id => <option key={id} value={id} />)}</datalist>
        <NumberField label={t("sensorChannel")} min={0} max={255} step={1} value={sensor.channel ?? 0} onChange={value => setSensor(sensor.id, { channel: Math.round(clamp(value, 0, 255)) || undefined }, "channel")} />
        <label className="check-line"><input type="checkbox" checked={sensor.mirror === true} onChange={event => setSensor(sensor.id, { mirror: event.target.checked || undefined }, "mirror")} /> {t("sensorMirror")}</label>
      </div>
      <p className="muted small">{`${t("radarRated")} ${radarView(sensor).rangeM} m, ±${radarView(sensor).halfAngleDeg}°. ${t("radarMountNote")}`}</p>
      <div className="inspector-actions">{remove}</div>
    </section>}

    {placement && (() => {
      const device = deviceOf(placement.device_id);
      const set = (patch: Partial<typeof placement>, field: string) => edit(m => ({ ...m, placements: m.placements.map(item => item.device_id === placement.device_id ? { ...item, ...patch } : item) }), `device:${placement.device_id}:${field}`);
      return <section className="object-editor">
        <h4>{device ? t(`kind_${device.kind}`) : placement.device_id}</h4>
        <div className="inspector-grid">
          <NumberField label="X" unit="m" step={0.1} value={placement.x} onChange={value => set({ x: round2(value) }, "x")} />
          <NumberField label="Y" unit="m" step={0.1} value={placement.y} onChange={value => set({ y: round2(value) }, "y")} />
          <NumberField label={t("mountHeight")} unit="m" step={0.05} min={-5} max={100} value={placement.z} onChange={value => set({ z: round2(clamp(value, -5, 100)) }, "z")} />
          <NumberField label={t("turnAboutVertical")} unit="°" step={5} min={-180} max={180} value={placement.rotation} onChange={value => set({ rotation: value }, "rotation")} />
          <NumberField label={t("tiltAboutX")} unit="°" step={5} min={-180} max={180} value={placement.pitch ?? 0} onChange={value => set({ pitch: clamp(value, -180, 180) || undefined }, "pitch")} />
          <NumberField label={t("tiltAboutZ")} unit="°" step={5} min={-180} max={180} value={placement.roll ?? 0} onChange={value => set({ roll: clamp(value, -180, 180) || undefined }, "roll")} />
        </div>
        <div className="inspector-actions"><button onClick={p.onOpenDevices}>{t("devices")}</button><button className="danger-button" onClick={p.onRemove}>{t("removeFromDesign")}</button></div>
      </section>;
    })()}

    </>}

    {tab === "objects" && <>
    {unplaced.length > 0 && <section className="object-editor site-object-list">
      <h4>{t("devicesToPlace")} · {unplaced.length}</h4>
      <div className="list-group">{unplaced.map(device => <button key={device.id} className={p.pendingDevice === device.id ? "selected" : ""} onClick={() => p.onPickDevice?.(device.id)}><span className="list-icon"><KindIcon kind={device.kind} size={16} /></span><span className="list-name">{device.name}</span><small>{t(`kind_${device.kind}`)}</small></button>)}</div>
      <p className="muted small">{t("placeDeviceHint")}</p>
    </section>}

    <section className="site-object-list">
      <h4>{t("siteObjects")}</h4>
      <div className="list-group">{listRow({ kind: "terrain" }, "terrain-poly", t("terrain"), `${terrainArea.toFixed(0)} m²`)}</div>
      {model.buildings.length > 0 && <div className="list-group"><span>{t("buildingsCount")} · {model.buildings.length}</span>{model.buildings.map(item => listRow({ kind: "building", id: item.id }, "building-rect", item.name, `${item.floors.length} ${t("floorsShort")}`))}</div>}
      {model.roofItems.length + model.wallLamps.length > 0 && <div className="list-group"><span>{t("onBuildings")} · {model.roofItems.length + model.wallLamps.length}</span>
        {model.roofItems.map(item => listRow({ kind: "roofItem", id: item.id }, ROOF_ITEM_TOOL[item.kind], t(`roofItem_${item.kind}`), item.id))}
        {model.wallLamps.map(item => listRow({ kind: "wallLamp", id: item.id }, "wall-lamp", t("toolWallLamp"), item.id))}</div>}
      {model.openings.length > 0 && <div className="list-group"><span>{t("openings")} · {model.openings.length}</span>{model.openings.map(item => listRow({ kind: "opening", id: item.id }, item.kind === "opening" ? "arch" : item.kind, `${t(item.kind)} · ${t("floorShort")} ${item.floor + 1}`, model.buildings.find(b => b.id === item.buildingId)?.name ?? ""))}</div>}
      {model.features.length > 0 && <div className="list-group"><span>{t("groundObjects")} · {model.features.length}</span>{model.features.map(item => listRow({ kind: "feature", id: item.id }, FEATURE_TOOL[item.kind], item.label ?? t(toolLabelKey(FEATURE_TOOL[item.kind])), item.label ? t(toolLabelKey(FEATURE_TOOL[item.kind])) : item.id))}</div>}
      {model.cameras.length > 0 && <div className="list-group"><span>{t("toolCamera")} · {model.cameras.length}</span>{model.cameras.map(item => listRow({ kind: "camera", id: item.id }, "camera", item.name, item.enabled ? "" : t("powerOff")))}</div>}
      {model.placements.length > 0 && <div className="list-group"><span>{t("devices")} · {model.placements.length}</span>{model.placements.map(item => { const device = deviceOf(item.device_id); return listRow({ kind: "device", id: item.device_id }, "device", device?.name ?? item.device_id, device ? t(`kind_${device.kind}`) : ""); })}</div>}
      {model.sensors.length > 0 && <div className="list-group"><span>{t("toolSensor")} · {model.sensors.length}</span>{model.sensors.map(item => listRow({ kind: "sensor", id: item.id }, "sensor", item.name, item.kind))}</div>}
    </section>
    </>}
  </aside>;
}
