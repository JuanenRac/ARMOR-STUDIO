/**
 * What the keys of the designers (alarm, electrical and network) do to the view: the zoom that the plus and minus keys give, around the middle of the drawing area, and the keys that must
 * leave a text field alone.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
export type DesignerView = { x: number; y: number; k: number };
export type Area = { width: number; height: number };

/** The view after zooming by `factor` around the middle of the drawing area, kept between `min` and `max`; the point under the middle stays where it is. */
export function zoomView(view: DesignerView, factor: number, area: Area, min: number, max: number): DesignerView {
  const k = Math.min(max, Math.max(min, view.k * factor));
  if (k === view.k) return view;
  const px = area.width / 2, py = area.height / 2;
  return { k, x: px - (px - view.x) * (k / view.k), y: py - (py - view.y) * (k / view.k) };
}

/** True when the key was pressed in a field where it types: the shortcuts of the drawing must not act then. */
export function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  return Boolean(element && (element.tagName === "INPUT" || element.tagName === "SELECT" || element.tagName === "TEXTAREA" || element.isContentEditable));
}

/** The view keys: F fits the drawing, plus zooms in and minus zooms out (without Ctrl or the system key, which the browser keeps for itself). */
export function viewKey(event: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey">): "fit" | "zoomIn" | "zoomOut" | null {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  const key = event.key.toLowerCase();
  if (key === "f") return "fit";
  if (key === "+" || key === "=") return "zoomIn";
  if (key === "-" || key === "_") return "zoomOut";
  return null;
}
