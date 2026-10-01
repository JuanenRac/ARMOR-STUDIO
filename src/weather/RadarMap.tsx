/**
 * The live radar of the Weather menu: a map (Leaflet) with the rain radar of the last two hours from RainViewer, played as an animation, and the infrared image of the clouds from the Meteosat
 * satellite (EUMETSAT) laid over it on demand. The map and its layers are plain objects kept in refs; React only draws the controls.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { BASE_MAP_TEMPLATE, LABELS_TEMPLATE, loadRadarFrames, radarTileTemplate, satelliteImageUrl } from "./api";
import type { Frame, Place } from "./model";

type Translate = (key: string) => string;
type Radar = { host: string; frames: Frame[] };

/** The pictures of the clouds for the map's view: the view is cut into a few strips of latitude, each asked on its own, so that the straight stretch of an image over the map's own projection stays small. */
export function cloudStrips(box: { south: number; west: number; north: number; east: number }, heightPx: number): Array<{ south: number; north: number }> {
  const span = box.north - box.south, count = Math.min(8, Math.max(1, Math.ceil(span / 2.5), Math.ceil(heightPx / 400)));
  return Array.from({ length: count }, (_, index) => ({ south: box.south + (span * index) / count, north: box.south + (span * (index + 1)) / count }));
}

export function RadarMap({ place, t, locale }: { place: Place; t: Translate; locale: string }) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const rainLayers = useRef<Map<number, L.TileLayer>>(new Map());
  const cloudLayers = useRef<L.ImageOverlay[]>([]);
  const timer = useRef<number | undefined>(undefined);
  const [radar, setRadar] = useState<Radar | null>(null);
  const [failed, setFailed] = useState(false);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [showRain, setShowRain] = useState(true);
  const [showClouds, setShowClouds] = useState(false);
  const [opacity, setOpacity] = useState(0.75);

  // the map itself
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const instance = L.map(element, { center: [place.latitude, place.longitude], zoom: 7, minZoom: 3, maxZoom: 10, worldCopyJump: true, zoomSnap: 0.5 });
    // The layers, from the bottom: the base map, the clouds (the map's overlay pane), the rain, and the names of places on top of all.
    instance.createPane("radar").style.zIndex = "420";
    instance.createPane("labels").style.zIndex = "450";
    instance.getPane("labels")!.style.pointerEvents = "none";
    L.tileLayer(BASE_MAP_TEMPLATE, { maxZoom: 16, attribution: "Esri, HERE, Garmin, © OpenStreetMap contributors" }).addTo(instance);
    L.tileLayer(LABELS_TEMPLATE, { maxZoom: 16, pane: "labels" }).addTo(instance);
    L.circleMarker([place.latitude, place.longitude], { radius: 6, color: "#00e5ff", weight: 2, fillColor: "#00e5ff", fillOpacity: 0.45 }).addTo(instance).bindTooltip(place.name);
    map.current = instance;
    const observer = new ResizeObserver(() => instance.invalidateSize());
    observer.observe(element);
    return () => { observer.disconnect(); instance.remove(); map.current = null; rainLayers.current.clear(); cloudLayers.current = []; };
  }, [place.latitude, place.longitude, place.name]);

  // the list of radar frames, every five minutes
  useEffect(() => {
    let cancelled = false;
    const pull = () => loadRadarFrames().then(found => { if (!cancelled) { setRadar(found); setFailed(found === null); if (found) setIndex(current => Math.min(current, found.frames.length - 1)); } }).catch(() => { if (!cancelled) setFailed(true); });
    void pull();
    const again = window.setInterval(pull, 5 * 60 * 1000);
    return () => { cancelled = true; window.clearInterval(again); };
  }, []);

  // the rain: one tile layer per frame, made when it is first shown and kept, only the current one visible
  useEffect(() => {
    const instance = map.current;
    if (!instance || !radar) return;
    const layers = rainLayers.current;
    for (const [time, layer] of layers) if (!radar.frames.some(frame => frame.time === time)) { instance.removeLayer(layer); layers.delete(time); }
    const frame = radar.frames[Math.min(index, radar.frames.length - 1)];
    if (!frame) return;
    for (const candidate of [frame, radar.frames[index + 1]]) {
      if (!candidate || layers.has(candidate.time)) continue;
      const layer = L.tileLayer(radarTileTemplate(radar.host, candidate), { opacity: 0, maxNativeZoom: 7, maxZoom: 10, tileSize: 256, pane: "radar", attribution: "RainViewer" });
      layer.addTo(instance);
      layers.set(candidate.time, layer);
    }
    for (const [time, layer] of layers) layer.setOpacity(showRain && time === frame.time ? opacity : 0);
  }, [radar, index, showRain, opacity]);

  // the animation
  useEffect(() => {
    window.clearInterval(timer.current);
    if (!playing || !radar || radar.frames.length < 2 || !showRain) return;
    timer.current = window.setInterval(() => setIndex(current => (current + 1) % radar.frames.length), 700);
    return () => window.clearInterval(timer.current);
  }, [playing, radar, showRain]);

  // the clouds: the pictures of the satellite for what the map shows now, made again when the view moves
  const drawClouds = useCallback(() => {
    const instance = map.current;
    if (!instance) return;
    const old = cloudLayers.current;
    cloudLayers.current = [];
    if (showClouds) {
      const bounds = instance.getBounds(), size = instance.getSize();
      const box = { south: Math.max(-85, bounds.getSouth()), north: Math.min(85, bounds.getNorth()), west: Math.max(-180, bounds.getWest()), east: Math.min(180, bounds.getEast()) };
      const strips = cloudStrips(box, size.y);
      cloudLayers.current = strips.map(strip => {
        const top = instance.latLngToContainerPoint([strip.north, box.west]).y, bottom = instance.latLngToContainerPoint([strip.south, box.west]).y;
        const url = satelliteImageUrl({ south: strip.south, north: strip.north, west: box.west, east: box.east }, Math.min(1400, size.x), Math.max(32, Math.min(700, Math.abs(bottom - top))));
        const overlay = L.imageOverlay(url, [[strip.south, box.west], [strip.north, box.east]], { opacity: 0.7, className: "wx-cloud", zIndex: 200, interactive: false });
        overlay.addTo(instance);
        return overlay;
      });
    }
    window.setTimeout(() => old.forEach(overlay => instance.removeLayer(overlay)), 1500);   // the new pictures take over before the old ones go
  }, [showClouds]);
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    drawClouds();
    let wait: number | undefined;
    const later = () => { window.clearTimeout(wait); wait = window.setTimeout(drawClouds, 500); };
    instance.on("moveend zoomend resize", later);
    const refresh = window.setInterval(drawClouds, 10 * 60 * 1000);
    return () => { instance.off("moveend zoomend resize", later); window.clearTimeout(wait); window.clearInterval(refresh); };
  }, [drawClouds, place.latitude, place.longitude]);
  useEffect(() => { cloudLayers.current.forEach(overlay => overlay.setOpacity(Math.min(1, opacity + 0.1))); }, [opacity]);

  const frame = radar?.frames[Math.min(index, (radar?.frames.length ?? 1) - 1)];
  const clock = (seconds: number) => new Date(seconds * 1000).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  return <div className="wx-radar">
    <div className="wx-radar-bar">
      <button className={showRain ? "on" : ""} onClick={() => setShowRain(value => !value)}>🌧 {t("wxRadarRain")}</button>
      <button className={showClouds ? "on" : ""} onClick={() => setShowClouds(value => !value)}>☁ {t("wxRadarClouds")}</button>
      <button onClick={() => setPlaying(value => !value)} disabled={!showRain || !radar}>{playing ? `⏸ ${t("wxRadarPause")}` : `▶ ${t("wxRadarPlay")}`}</button>
      <label className="wx-opacity">{t("wxRadarOpacity")} <input type="range" min={0.2} max={1} step={0.05} value={opacity} onChange={event => setOpacity(Number(event.target.value))} /></label>
    </div>
    <div className="wx-map" ref={host} />
    {radar && showRain && frame && <div className="wx-timeline">
      <span className="wx-frame-time">{clock(frame.time)}</span>
      <input type="range" min={0} max={radar.frames.length - 1} value={Math.min(index, radar.frames.length - 1)} onChange={event => { setPlaying(false); setIndex(Number(event.target.value)); }} aria-label={t("wxRadar")} />
      <span className="wx-frame-span">{t("wxRadarPast")}</span>
    </div>}
    {failed && <p className="wx-note bad">{t("wxRadarNoData")}</p>}
    {showClouds && <p className="wx-note">{t("wxRadarCloudsNote")}</p>}
  </div>;
}
