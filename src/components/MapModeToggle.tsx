/**
 * Two small icon buttons to see a map of the site as a plan (2D) or as the model (3D). The choice of each place is kept in the browser (and is only a convenience: the map shows
 * in 2D when the browser keeps nothing).
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useState } from "react";
import "./map-mode.css";

export type MapMode = "2d" | "3d";

/** The mode of a map and a way to change it, kept under `key` in the browser. */
export function useMapMode(key: string): [MapMode, (mode: MapMode) => void] {
  const [mode, setMode] = useState<MapMode>(() => { try { return window.localStorage.getItem(key) === "3d" ? "3d" : "2d"; } catch { return "2d"; } });
  const choose = (next: MapMode) => { setMode(next); try { window.localStorage.setItem(key, next); } catch { /* the choice is only kept for the session */ } };
  return [mode, choose];
}

const ICON = { viewBox: "0 0 24 24", width: 16, height: 16, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: false } as const;

export function MapModeToggle({ t, mode, onChange }: { t: (key: string) => string; mode: MapMode; onChange: (mode: MapMode) => void }) {
  return <div className="map-mode" role="group" aria-label={`${t("view2d")} / ${t("view3d")}`}>
    <button type="button" className={mode === "2d" ? "on" : ""} aria-pressed={mode === "2d"} title={t("view2d")} aria-label={t("view2d")} onClick={() => onChange("2d")}>
      <svg {...ICON}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>
    </button>
    <button type="button" className={mode === "3d" ? "on" : ""} aria-pressed={mode === "3d"} title={t("view3d")} aria-label={t("view3d")} onClick={() => onChange("3d")}>
      <svg {...ICON}><path d="M12 2 3 7v10l9 5 9-5V7z" /><path d="M3 7l9 5 9-5" /><path d="M12 12v10" /></svg>
    </button>
  </div>;
}
