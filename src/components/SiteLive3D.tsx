/**
 * The site in 3D for the overview and the radar menu: the same lit model of the designer (terrain, buildings with their floors and roofs, cameras, radars with their coverage, the placed
 * devices) that can be orbited, with the targets the radars see now drawn where they stand. It only shows: nothing in it can be moved, drawn or deleted. The 3D engine is loaded the first time
 * this is shown, so a person who never asks for 3D never downloads it.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { lazy, Suspense, useMemo, useState } from "react";
import type { StudioDevice } from "../api";
import { placeTargets } from "../designer/radarMap";
import type { SiteModel } from "../designer/ops";
import type { Dimensions } from "../domain";
import type { NodeState } from "../types";
import "../designer/designer.css";
import "./live3d.css";

const Viewport3D = lazy(() => import("../designer/Viewport3D"));
const NOTHING = () => undefined;

export function SiteLive3D({ t, model, dimensions, devices, nodes }: { t: (key: string) => string; model: SiteModel; dimensions: Dimensions; devices: StudioDevice[]; nodes: NodeState[] }) {
  const [floor, setFloor] = useState(-1);
  const floorCount = Math.max(1, ...model.buildings.map(building => building.floors.length));
  const { placed } = useMemo(() => placeTargets(nodes, model.sensors, dimensions), [nodes, model.sensors, dimensions]);
  const live = useMemo(() => ({ targets: placed }), [placed]);
  return <div className="live3d">
    <Suspense fallback={<p className="live3d-loading muted">{t("loading3d")}</p>}>
      <Viewport3D t={t} devices={devices} dimensions={dimensions} model={model} selection={{ kind: "none" }} tool="select" onTool={NOTHING} activeFloor={floor >= floorCount ? -1 : floor} floorCount={floorCount}
        onFloor={setFloor} onSelect={NOTHING} onDragStart={NOTHING} onMove={NOTHING} onElevate={NOTHING} onPlace={NOTHING} onNotice={NOTHING} sharedSections={[]} live={live} />
    </Suspense>
  </div>;
}
