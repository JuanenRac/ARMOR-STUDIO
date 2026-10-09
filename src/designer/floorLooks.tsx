/**
 * The drawing of floors: a texture for the 3D view (painted on a canvas once per finish and colour: planks, tiles, marble veins, carpet, terrazzo chips...) and an SVG pattern for the plan.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { ReactElement } from "react";
import * as THREE from "three";
import type { FloorStyle } from "../domain";
import { shade } from "./colors";
import { FLOOR_LOOKS, floorPatternId } from "./floors";

const SIZE = 256;
const cache = new Map<string, THREE.CanvasTexture>();

/** A small deterministic random series, so a floor looks the same every time it is painted. */
function series(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296; };
}

function paint(style: FloorStyle, colour: string, context: CanvasRenderingContext2D): void {
  const random = series(style.length * 7919 + colour.charCodeAt(2) * 31);
  const fill = (c: string, x: number, y: number, w: number, h: number) => { context.fillStyle = c; context.fillRect(x, y, w, h); };
  fill(colour, 0, 0, SIZE, SIZE);
  const planks = (rows: number, lengthSteps: number, seam: string, spread: number) => {
    const h = SIZE / rows;
    for (let row = 0; row < rows; row += 1) {
      const length = SIZE / lengthSteps, offset = (row % lengthSteps) * (length / 2) + (random() * length * 0.3);
      for (let k = -1; k <= lengthSteps + 1; k += 1) {
        const x = k * length - (offset % length);
        fill(shade(colour, (random() - 0.5) * spread), x, row * h, length, h);
        context.fillStyle = seam; context.fillRect(x, row * h, 1.6, h); context.fillRect(x, row * h, length, 1.6);
        context.strokeStyle = shade(colour, -0.12); context.globalAlpha = 0.25; context.lineWidth = 1;   // the grain
        for (let g = 0; g < 3; g += 1) { const gy = row * h + 4 + random() * (h - 8); context.beginPath(); context.moveTo(x + 2, gy); context.lineTo(x + length - 2, gy + (random() - 0.5) * 3); context.stroke(); }
        context.globalAlpha = 1;
      }
    }
  };
  switch (style) {
    case "flParquet": planks(8, 2, shade(colour, -0.35), 0.18); break;
    case "flLaminate": planks(6, 1, shade(colour, -0.28), 0.1); break;
    case "flCeramic": {
      const n = 4, s = SIZE / n;
      for (let i = 0; i < n; i += 1) for (let j = 0; j < n; j += 1) fill(shade(colour, (random() - 0.5) * 0.08), i * s, j * s, s, s);
      context.fillStyle = shade(colour, 0.35); for (let i = 0; i <= n; i += 1) { context.fillRect(i * s - 1.5, 0, 3, SIZE); context.fillRect(0, i * s - 1.5, SIZE, 3); }
      break;
    }
    case "flMarble": {
      context.strokeStyle = shade(colour, -0.4); context.globalAlpha = 0.22;
      for (let v = 0; v < 9; v += 1) { context.lineWidth = 0.6 + random() * 1.8; context.beginPath(); const y = random() * SIZE; context.moveTo(0, y); context.bezierCurveTo(SIZE * 0.3, y + (random() - 0.5) * 120, SIZE * 0.6, y + (random() - 0.5) * 120, SIZE, y + (random() - 0.5) * 90); context.stroke(); }
      context.globalAlpha = 1;
      context.fillStyle = shade(colour, 0.5); context.globalAlpha = 0.5; context.fillRect(SIZE / 2 - 0.75, 0, 1.5, SIZE); context.fillRect(0, SIZE / 2 - 0.75, SIZE, 1.5); context.globalAlpha = 1;
      break;
    }
    case "flStone": {
      for (let i = 0; i < 14; i += 1) { const w = 50 + random() * 70, h = 40 + random() * 60, x = random() * SIZE - 20, y = random() * SIZE - 20; fill(shade(colour, (random() - 0.5) * 0.3), x, y, w, h); context.strokeStyle = shade(colour, -0.4); context.lineWidth = 2.5; context.strokeRect(x, y, w, h); }
      break;
    }
    case "flTerrazzo": {
      const chips = ["#f1ede4", "#8a8f94", "#c9b79c", "#4f565b", "#b9a58a"];
      for (let i = 0; i < 160; i += 1) { context.fillStyle = chips[Math.floor(random() * chips.length)]; context.beginPath(); context.ellipse(random() * SIZE, random() * SIZE, 1.5 + random() * 4, 1 + random() * 3, random() * 3, 0, Math.PI * 2); context.fill(); }
      break;
    }
    case "flCarpet": {
      for (let i = 0; i < 2600; i += 1) { context.fillStyle = shade(colour, (random() - 0.5) * 0.35); context.fillRect(random() * SIZE, random() * SIZE, 2, 2); }
      break;
    }
    case "flVinyl": {
      for (let i = 0; i < 500; i += 1) { context.fillStyle = shade(colour, (random() - 0.5) * 0.08); context.fillRect(random() * SIZE, random() * SIZE, 3 + random() * 10, 1); }
      context.fillStyle = shade(colour, -0.18); context.fillRect(0, 0, SIZE, 1.5); context.fillRect(0, 0, 1.5, SIZE);
      break;
    }
    case "flMicrocement": {
      for (let i = 0; i < 40; i += 1) { const gradient = context.createRadialGradient(random() * SIZE, random() * SIZE, 2, random() * SIZE, random() * SIZE, 70 + random() * 60); gradient.addColorStop(0, shade(colour, (random() - 0.5) * 0.14)); gradient.addColorStop(1, "rgba(0,0,0,0)"); context.globalAlpha = 0.4; context.fillStyle = gradient; context.fillRect(0, 0, SIZE, SIZE); }
      context.globalAlpha = 1;
      break;
    }
    default: {   // concrete
      for (let i = 0; i < 1400; i += 1) { context.fillStyle = shade(colour, (random() - 0.5) * 0.16); context.fillRect(random() * SIZE, random() * SIZE, 1.5, 1.5); }
    }
  }
}

/** The texture of a finish in a colour, to be repeated every `FLOOR_LOOKS[style].tile` metres. One is painted per finish and colour and shared. */
export function floorTexture(style: FloorStyle, colour: string): THREE.CanvasTexture | null {
  const key = `${style}|${colour}`;
  const known = cache.get(key);
  if (known) return known;
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const context = canvas.getContext("2d");
  if (!context) return null;
  paint(style, colour, context);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  cache.set(key, texture);
  return texture;
}

/** A copy of the texture of a finish set to repeat across a floor of `width` by `depth` metres (a box's UVs run 0 to 1 over each face). */
export function floorTextureFor(style: FloorStyle, colour: string, width: number, depth: number): THREE.Texture | null {
  const base = floorTexture(style, colour);
  if (!base) return null;
  const texture = base.clone();
  texture.needsUpdate = true;
  texture.repeat.set(Math.max(0.2, width / FLOOR_LOOKS[style].tile), Math.max(0.2, depth / FLOOR_LOOKS[style].tile));
  return texture;
}

/** The pattern of a finish for the plan, `tile` metres across (the plan is drawn in metres). */
function pattern(style: FloorStyle, colour: string): ReactElement {
  const tile = FLOOR_LOOKS[style].tile, id = floorPatternId(style, colour), dark = shade(colour, -0.3), light = shade(colour, 0.25);
  const lines: ReactElement[] = [];
  const line = (x1: number, y1: number, x2: number, y2: number, c: string, w = tile * 0.012) => lines.push(<line key={lines.length} x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth={w} />);
  if (style === "flParquet" || style === "flLaminate") {
    const rows = style === "flParquet" ? 6 : 5;
    for (let row = 0; row < rows; row += 1) { const y = (row * tile) / rows; line(0, y, tile, y, dark); const x = (row % 2) * (tile / 2); line(x, y, x, y + tile / rows, dark); }
  } else if (style === "flCeramic") { for (let i = 0; i <= 2; i += 1) { line(0, (i * tile) / 2, tile, (i * tile) / 2, light, tile * 0.03); line((i * tile) / 2, 0, (i * tile) / 2, tile, light, tile * 0.03); } }
  else if (style === "flMarble") { lines.push(<path key="m1" d={`M0 ${tile * 0.3} C ${tile * 0.3} ${tile * 0.1}, ${tile * 0.6} ${tile * 0.6}, ${tile} ${tile * 0.4}`} stroke={dark} strokeWidth={tile * 0.01} fill="none" opacity="0.5" />); line(tile / 2, 0, tile / 2, tile, light, tile * 0.012); line(0, tile / 2, tile, tile / 2, light, tile * 0.012); }
  else if (style === "flStone") { line(0, tile * 0.33, tile, tile * 0.33, dark, tile * 0.025); line(0, tile * 0.7, tile, tile * 0.7, dark, tile * 0.025); line(tile * 0.4, 0, tile * 0.4, tile * 0.33, dark, tile * 0.025); line(tile * 0.75, tile * 0.33, tile * 0.75, tile * 0.7, dark, tile * 0.025); line(tile * 0.25, tile * 0.7, tile * 0.25, tile, dark, tile * 0.025); }
  else if (style === "flTerrazzo") { for (let i = 0; i < 14; i += 1) lines.push(<circle key={i} cx={((i * 37) % 100) / 100 * tile} cy={((i * 59) % 100) / 100 * tile} r={tile * (0.012 + (i % 3) * 0.006)} fill={i % 2 ? light : dark} opacity="0.8" />); }
  else if (style === "flCarpet") { for (let i = 0; i < 30; i += 1) lines.push(<circle key={i} cx={((i * 41) % 100) / 100 * tile} cy={((i * 67) % 100) / 100 * tile} r={tile * 0.01} fill={i % 2 ? light : dark} opacity="0.5" />); }
  else if (style === "flVinyl") { line(0, 0, tile, 0, dark, tile * 0.008); line(0, 0, 0, tile, dark, tile * 0.008); }
  else { for (let i = 0; i < 12; i += 1) lines.push(<circle key={i} cx={((i * 43) % 100) / 100 * tile} cy={((i * 71) % 100) / 100 * tile} r={tile * 0.006} fill={dark} opacity="0.35" />); }
  return <pattern key={id} id={id} width={tile} height={tile} patternUnits="userSpaceOnUse"><rect width={tile} height={tile} fill={colour} />{lines}</pattern>;
}

/** The patterns the plan needs, one for each finish and colour in use, to be placed in the plan's <defs>. */
export function floorPatternDefs(used: ReadonlyArray<{ style: FloorStyle; colour: string }>): ReactElement[] {
  const seen = new Set<string>(), out: ReactElement[] = [];
  for (const { style, colour } of used) {
    const id = floorPatternId(style, colour);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(pattern(style, colour));
  }
  return out;
}
