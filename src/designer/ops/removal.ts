import { isSimplePolygon } from "../geometry";
import type { Selection } from "../model";
import { deleteBuilding, removeBuildingVertex } from "./buildings";
import type { SiteModel } from "./shared";
/** Remove what is selected. Cameras belong to the server's configuration and are not removed here. */
export function removeSelected(model: SiteModel, selection: Selection): SiteModel {
  switch (selection.kind) {
    case "building":
      if (selection.vertex !== undefined) return removeBuildingVertex(model, selection.id, selection.vertex);
      return deleteBuilding(model, selection.id);
    case "terrain": {
      if (selection.vertex === undefined || model.terrain.points.length <= 3) return model;
      const points = model.terrain.points.filter((_, index) => index !== selection.vertex);
      return isSimplePolygon(points) ? { ...model, terrain: { points } } : model;
    }
    case "opening": return { ...model, openings: model.openings.filter(item => item.id !== selection.id) };
    case "roofItem": return { ...model, roofItems: model.roofItems.filter(item => item.id !== selection.id) };
    case "wallLamp": return { ...model, wallLamps: model.wallLamps.filter(item => item.id !== selection.id) };
    case "feature": {
      const chosen = model.features.find(item => item.id === selection.id);
      // The strips of one sidewalk go together.
      return { ...model, features: model.features.filter(item => chosen?.group ? item.group !== chosen.group : item.id !== selection.id) };
    }
    case "sensor": return { ...model, sensors: model.sensors.filter(item => item.id !== selection.id) };
    case "device": return { ...model, placements: model.placements.filter(item => item.device_id !== selection.id) };
    default: return model;
  }
}
