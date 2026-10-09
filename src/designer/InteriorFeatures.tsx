/**
 * The 3D bodies of the objects of the inside of a building: walls (solid, with a door, a double door, a window, a large window or an opening), fireplaces (against a wall, in a corner
 * or in the middle of a room), stairs, the kitchen, the bathroom fittings and the furniture (bed, wardrobe, sofa, armchair, dining table, television on the wall or on a piece of
 * furniture). Each is drawn at its own origin on the floor, facing +Z (south) at rotation 0, from the width, depth and height of the object.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useMemo } from "react";
import * as THREE from "three";
import type { SiteFeature } from "../domain";
import { shade } from "./colors";

type Glow = { emissive: string; emissiveIntensity: number };
type Props = { feature: SiteFeature; glow: Glow };
type Vec = [number, number, number];

const Box = ({ size, at, color, glow, rough = 0.85, metal = 0, cast = true, opacity }: { size: Vec; at: Vec; color: string; glow?: Glow; rough?: number; metal?: number; cast?: boolean; opacity?: number }) =>
  <mesh position={at} castShadow={cast} receiveShadow><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={rough} metalness={metal} transparent={opacity !== undefined} opacity={opacity ?? 1} {...glow} /></mesh>;
const Cylinder = ({ radius, height, at, color, glow, rough = 0.7, metal = 0, segments = 18 }: { radius: number; height: number; at: Vec; color: string; glow?: Glow; rough?: number; metal?: number; segments?: number }) =>
  <mesh position={at} castShadow receiveShadow><cylinderGeometry args={[radius, radius, height, segments]} /><meshStandardMaterial color={color} roughness={rough} metalness={metal} {...glow} /></mesh>;

/** A right-angled triangle on the floor (the corner of the room at the back left), standing `height` tall. */
function Corner({ w, d, height, color, glow }: { w: number; d: number; height: number; color: string; glow?: Glow }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, d / 2); shape.lineTo(w / 2, d / 2); shape.lineTo(-w / 2, -d / 2); shape.closePath();   // (x, -z) of the floor
    const made = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
    made.rotateX(-Math.PI / 2);
    return made;
  }, [w, d, height]);
  return <mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial color={color} roughness={0.9} {...glow} /></mesh>;
}

/** The size of the gap and where it stands for each look of a wall. */
export const WALL_GAP: Record<string, { width: number; sill: number; top: number } | undefined> = {
  wDoor: { width: 0.9, sill: 0, top: 2.1 }, wDoubleDoor: { width: 1.6, sill: 0, top: 2.1 }, wWindow: { width: 1.2, sill: 0.9, top: 2.1 },
  wWideWindow: { width: 2.2, sill: 0.4, top: 2.2 }, wOpening: { width: 1.2, sill: 0, top: 2.2 },
};
export const wallGap = (feature: { style?: string; width: number; height: number }): { width: number; sill: number; top: number } | undefined => {
  const gap = WALL_GAP[feature.style ?? "wSolid"];
  return gap ? { width: Math.min(gap.width, Math.max(0.3, feature.width - 0.4)), sill: gap.sill, top: Math.min(gap.top, feature.height - 0.1) } : undefined;
};

function Wall({ feature, glow }: Props) {
  const w = feature.width, d = feature.depth, h = feature.height, plaster = feature.color ?? "#cdd6d8", gap = wallGap(feature), style = feature.style ?? "wSolid";
  if (!gap) return <Box size={[w, h, d]} at={[0, h / 2, 0]} color={plaster} glow={glow} rough={0.95} />;
  const side = (w - gap.width) / 2, door = gap.sill === 0 && style !== "wOpening", wood = shade(plaster, -0.35);
  return <group>
    {[-1, 1].map(sign => <Box key={sign} size={[side, h, d]} at={[sign * (gap.width / 2 + side / 2), h / 2, 0]} color={plaster} glow={glow} rough={0.95} />)}
    {h > gap.top && <Box size={[gap.width, h - gap.top, d]} at={[0, gap.top + (h - gap.top) / 2, 0]} color={plaster} glow={glow} rough={0.95} />}
    {gap.sill > 0 && <Box size={[gap.width, gap.sill, d]} at={[0, gap.sill / 2, 0]} color={plaster} glow={glow} rough={0.95} />}
    {gap.sill > 0 && <Box size={[gap.width, gap.top - gap.sill, 0.02]} at={[0, (gap.top + gap.sill) / 2, 0]} color="#bfe3f0" rough={0.1} metal={0.2} opacity={0.35} cast={false} />}
    {gap.sill > 0 && <Box size={[0.04, gap.top - gap.sill, d + 0.02]} at={[0, (gap.top + gap.sill) / 2, 0]} color="#eef6f8" cast={false} />}
    {door && (style === "wDoubleDoor" ? [-1, 1] : [0]).map(sign => <Box key={sign} size={[sign === 0 ? gap.width - 0.08 : gap.width / 2 - 0.05, gap.top - 0.05, 0.04]} at={[sign === 0 ? 0 : sign * gap.width / 4, (gap.top - 0.05) / 2, 0]} color={wood} glow={glow} />)}
  </group>;
}

function Fireplace({ feature, glow }: Props) {
  const w = feature.width, d = feature.depth, h = feature.height, stone = feature.color ?? "#8a6a5a", style = feature.style ?? "fWall", hearth = Math.min(0.9, h * 0.35);
  if (style === "fCentral") {
    const r = Math.min(w, d) / 2;
    return <group>
      <Cylinder radius={r} height={0.3} at={[0, 0.15, 0]} color={shade(stone, -0.1)} glow={glow} />
      <Cylinder radius={r * 0.55} height={hearth} at={[0, 0.3 + hearth / 2, 0]} color="#2a2a2e" metal={0.6} />
      <mesh position={[0, 0.3 + hearth + 0.25, 0]} castShadow><coneGeometry args={[r * 0.9, 0.5, 18]} /><meshStandardMaterial color="#3a4348" metalness={0.6} roughness={0.5} {...glow} /></mesh>
      <Cylinder radius={0.14} height={Math.max(0.2, h - hearth - 0.8)} at={[0, 0.3 + hearth + 0.5 + (h - hearth - 0.8) / 2, 0]} color="#3a4348" metal={0.6} />
      <mesh position={[0, 0.5, 0]}><sphereGeometry args={[r * 0.3, 10, 10]} /><meshStandardMaterial color="#ff8a3d" emissive="#ff6a1a" emissiveIntensity={1.2} /></mesh>
    </group>;
  }
  const front = d / 2;
  return <group>
    {style === "fCorner" ? <Corner w={w} d={d} height={hearth + 0.15} color={stone} glow={glow} /> : <Box size={[w, hearth + 0.15, d]} at={[0, (hearth + 0.15) / 2, 0]} color={stone} glow={glow} rough={0.95} />}
    {style === "fCorner" ? <Corner w={w * 0.55} d={d * 0.55} height={h} color={shade(stone, -0.05)} glow={glow} /> : <Box size={[w * 0.7, h - hearth - 0.15, d * 0.7]} at={[0, hearth + 0.15 + (h - hearth - 0.15) / 2, -d * 0.15]} color={shade(stone, -0.05)} glow={glow} rough={0.95} />}
    {style !== "fCorner" && <Box size={[w * 0.5, hearth * 0.7, 0.04]} at={[0, 0.15 + hearth * 0.45, front + 0.005]} color="#1d1d20" cast={false} />}
    {style !== "fCorner" && <mesh position={[0, 0.15 + hearth * 0.25, front - 0.02]}><sphereGeometry args={[hearth * 0.16, 10, 10]} /><meshStandardMaterial color="#ff8a3d" emissive="#ff6a1a" emissiveIntensity={1.2} /></mesh>}
    {style === "fCorner" && <mesh position={[-w * 0.05, 0.3, d * 0.05]}><sphereGeometry args={[hearth * 0.18, 10, 10]} /><meshStandardMaterial color="#ff8a3d" emissive="#ff6a1a" emissiveIntensity={1.2} /></mesh>}
    <Box size={[w + 0.08, 0.05, d * 0.4]} at={[0, hearth + 0.17, d * 0.1]} color={shade(stone, 0.15)} cast={false} />
  </group>;
}

function Stairs({ feature, glow }: Props) {
  const w = feature.width, d = feature.depth, h = feature.height, wood = feature.color ?? "#b09a7c", steps = Math.max(3, Math.round(h / 0.18)), rise = h / steps, run = d / steps;
  return <group>
    {Array.from({ length: steps }, (_, index) => <Box key={index} size={[w, rise * (index + 1), run]} at={[0, (rise * (index + 1)) / 2, d / 2 - run / 2 - index * run]} color={index % 2 ? shade(wood, -0.04) : wood} glow={glow} />)}
    {[-1, 1].map(side => <Box key={side} size={[0.04, 0.9, d]} at={[side * (w / 2 - 0.02), h / 2 + 0.45, 0]} color="#5f4a33" cast={false} />)}
  </group>;
}

function Kitchen({ feature, glow }: Props) {
  const w = feature.width, d = feature.depth, h = feature.height, body = feature.color ?? "#d8d2c4", style = feature.style ?? "kStraight", top = "#4a4f52", run = (length: number, along: "x" | "z", at: Vec, hob: boolean, upper: boolean) => {
    const size: Vec = along === "x" ? [length, h - 0.04, d] : [d, h - 0.04, length];
    const slab: Vec = along === "x" ? [length + 0.02, 0.04, d + 0.03] : [d + 0.03, 0.04, length + 0.02];
    return <group position={at}>
      <Box size={size} at={[0, (h - 0.04) / 2, 0]} color={body} glow={glow} />
      <Box size={slab} at={[0, h - 0.02, 0]} color={top} rough={0.4} />
      {hob && [-1, 1].flatMap(sx => [-1, 1].map(sz => <Cylinder key={`${sx}${sz}`} radius={0.08} height={0.012} at={along === "x" ? [sx * 0.17 + length * 0.15, h + 0.006, sz * d * 0.18] : [sz * d * 0.18, h + 0.006, sx * 0.17]} color="#15181a" metal={0.4} />))}
      {upper && <Box size={along === "x" ? [length, 0.7, d * 0.55] : [d * 0.55, 0.7, length]} at={along === "x" ? [0, 1.75, -d * 0.225] : [-d * 0.225, 1.75, 0]} color={shade(body, -0.06)} glow={glow} />}
    </group>;
  };
  if (style === "kIsland") return <group>{run(w, "x", [0, 0, 0], true, false)}<Box size={[w, 0.05, d * 0.45]} at={[0, h + 0.025, d * 0.45]} color="#5a4a3a" /></group>;
  if (style === "kL") return <group>{run(w, "x", [0, 0, -d / 2 + d / 2 - 0.001], true, true)}{run(Math.max(0.6, w * 0.5), "z", [w / 2 - d / 2, 0, Math.max(0.6, w * 0.5) / 2 + d / 2 - 0.001], false, true)}</group>;
  return <group>{run(w, "x", [0, 0, 0], true, true)}</group>;
}

function Bathroom({ feature, glow }: Props) {
  const w = feature.width, d = feature.depth, h = feature.height, white = feature.color ?? "#e6eef0", style = feature.style ?? "baBath";
  if (style === "baShower") return <group>
    <Box size={[w, 0.08, d]} at={[0, 0.04, 0]} color={white} glow={glow} rough={0.3} />
    <Box size={[w, 2, 0.02]} at={[0, 1.05, d / 2]} color="#bfe3f0" opacity={0.3} cast={false} /><Box size={[0.02, 2, d]} at={[w / 2, 1.05, 0]} color="#bfe3f0" opacity={0.3} cast={false} />
    <Cylinder radius={0.02} height={1.9} at={[-w / 2 + 0.05, 1.0, -d / 2 + 0.05]} color="#9aa6ab" metal={0.8} /><mesh position={[-w / 2 + 0.05, 1.95, -d / 2 + 0.12]}><sphereGeometry args={[0.09, 12, 8]} /><meshStandardMaterial color="#9aa6ab" metalness={0.8} roughness={0.3} /></mesh>
  </group>;
  if (style === "baToilet") return <group>
    <Box size={[Math.min(w, 0.4), 0.4, 0.2]} at={[0, 0.6, -d / 2 + 0.1]} color={white} glow={glow} rough={0.3} />
    <Cylinder radius={Math.min(w, 0.4) * 0.5} height={0.4} at={[0, 0.2, 0.02]} color={white} glow={glow} rough={0.3} />
    <Box size={[Math.min(w, 0.4), 0.04, 0.5]} at={[0, 0.42, 0.02]} color={shade(white, -0.04)} cast={false} />
  </group>;
  if (style === "baBasin") return <group>
    <Box size={[w, 0.8, d]} at={[0, 0.4, 0]} color="#8a7a66" glow={glow} />
    <Box size={[w * 0.7, 0.04, d * 0.7]} at={[0, 0.82, 0]} color={white} rough={0.3} />
    <Cylinder radius={0.02} height={0.16} at={[0, 0.92, -d * 0.3]} color="#9aa6ab" metal={0.8} />
    <Box size={[w * 0.6, 0.7, 0.02]} at={[0, 1.5, -d / 2 + 0.01]} color="#cfe6ee" metal={0.5} rough={0.1} cast={false} />
  </group>;
  return <group>
    <Box size={[w, h, d]} at={[0, h / 2, 0]} color={white} glow={glow} rough={0.3} />
    <Box size={[w - 0.2, 0.03, d - 0.2]} at={[0, h + 0.002, 0]} color="#bfe3f0" rough={0.1} />
    <Cylinder radius={0.025} height={0.25} at={[-w / 2 + 0.1, h + 0.12, 0]} color="#9aa6ab" metal={0.8} />
  </group>;
}

function Bed({ feature, glow }: Props) {
  const w = feature.width, d = feature.depth, h = feature.height, frame = feature.color ?? "#8a8fb5", double = (feature.style ?? "bDouble") === "bDouble";
  return <group>
    <Box size={[w, h * 0.45, d]} at={[0, h * 0.225, 0]} color="#7a5a3c" glow={glow} />
    <Box size={[w - 0.08, h * 0.4, d - 0.12]} at={[0, h * 0.45 + h * 0.2, 0.04]} color="#f1ece2" />
    <Box size={[w - 0.04, h * 0.18, d * 0.62]} at={[0, h * 0.85 + 0.02, d * 0.17]} color={frame} glow={glow} />
    {(double ? [-1, 1] : [0]).map(sign => <Box key={sign} size={[(double ? w * 0.4 : w * 0.7), 0.12, 0.35]} at={[sign * w * 0.23, h * 0.85 + 0.06, -d / 2 + 0.3]} color="#ffffff" />)}
    <Box size={[w, h * 1.7, 0.08]} at={[0, h * 0.85, -d / 2 + 0.04]} color="#7a5a3c" glow={glow} />
  </group>;
}

function Wardrobe({ feature, glow }: Props) {
  const w = feature.width, d = feature.depth, h = feature.height, wood = feature.color ?? "#9a7a58", doors = Math.max(2, Math.round(w / 0.6));
  return <group>
    <Box size={[w, h, d]} at={[0, h / 2, 0]} color={wood} glow={glow} />
    {Array.from({ length: doors - 1 }, (_, index) => <Box key={index} size={[0.01, h * 0.96, 0.01]} at={[-w / 2 + ((index + 1) * w) / doors, h / 2, d / 2 + 0.006]} color="#3a2e22" cast={false} />)}
    {Array.from({ length: doors }, (_, index) => <Box key={index} size={[0.02, 0.18, 0.02]} at={[-w / 2 + ((index + 0.5) * w) / doors + (index % 2 ? -0.1 : 0.1), h * 0.5, d / 2 + 0.015]} color="#c9ccce" metal={0.8} cast={false} />)}
  </group>;
}

function Seat({ w, d, h, color, glow, at = [0, 0, 0] as Vec }: { w: number; d: number; h: number; color: string; glow?: Glow; at?: Vec }) {
  const arm = Math.min(0.2, w * 0.14), seat = h * 0.5;
  return <group position={at}>
    <Box size={[w, seat * 0.7, d]} at={[0, seat * 0.35, 0]} color={shade(color, -0.1)} glow={glow} />
    <Box size={[w - 2 * arm, seat * 0.35, d * 0.7]} at={[0, seat * 0.7 + 0.08, d * 0.12]} color={color} glow={glow} rough={0.95} />
    <Box size={[w, h, d * 0.28]} at={[0, h / 2, -d / 2 + d * 0.14]} color={color} glow={glow} rough={0.95} />
    {[-1, 1].map(sign => <Box key={sign} size={[arm, seat * 1.15, d]} at={[sign * (w / 2 - arm / 2), (seat * 1.15) / 2, 0]} color={shade(color, -0.05)} glow={glow} rough={0.95} />)}
  </group>;
}

function Sofa({ feature, glow }: Props) {
  const w = feature.width, d = feature.depth, h = feature.height, colour = feature.color ?? "#6b7f95";
  return <group><Seat w={w} d={d} h={h} color={colour} glow={glow} />{(feature.style ?? "sStraight") === "sCorner" && <Seat w={d} d={d * 1.7} h={h} color={colour} glow={glow} at={[w / 2 - d / 2, 0, d * 0.85]} />}</group>;
}

function Armchair({ feature, glow }: Props) {
  return <Seat w={feature.width} d={feature.depth} h={feature.height} color={feature.color ?? "#7a6a8f"} glow={glow} />;
}

function Dining({ feature, glow }: Props) {
  const w = feature.width, d = feature.depth, h = feature.height, wood = feature.color ?? "#a2784a", count = Math.max(2, Math.round(w / 0.6));
  return <group>
    <Box size={[w, 0.05, d]} at={[0, h, 0]} color={wood} glow={glow} />
    {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => <Box key={`${sx}${sz}`} size={[0.06, h, 0.06]} at={[sx * (w / 2 - 0.08), h / 2, sz * (d / 2 - 0.08)]} color="#5f4a33" />)}
    {[-1, 1].flatMap(side => Array.from({ length: count }, (_, index) => <group key={`${side}${index}`} position={[-w / 2 + ((index + 0.5) * w) / count, 0, side * (d / 2 + 0.22)]} rotation={[0, side > 0 ? Math.PI : 0, 0]}>
      <Box size={[0.4, 0.05, 0.4]} at={[0, 0.45, 0]} color={shade(wood, 0.1)} /><Box size={[0.4, 0.4, 0.04]} at={[0, 0.68, -0.19]} color={shade(wood, 0.1)} />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => <Box key={`${sx}${sz}`} size={[0.04, 0.45, 0.04]} at={[sx * 0.17, 0.225, sz * 0.17]} color="#5f4a33" cast={false} />)}
    </group>))}
  </group>;
}

function Television({ feature, glow }: Props) {
  const w = feature.width, d = feature.depth, h = feature.height, onWall = (feature.style ?? "tWall") === "tWall", screen = feature.color ?? "#1b2226";
  if (onWall) return <group>
    <Box size={[w, h, 0.05]} at={[0, 1.0 + h / 2, -d / 2 + 0.03]} color={screen} glow={glow} rough={0.2} metal={0.4} />
    <Box size={[w - 0.06, h - 0.06, 0.006]} at={[0, 1.0 + h / 2, -d / 2 + 0.058]} color="#2d4a63" rough={0.05} cast={false} />
  </group>;
  const cabinet = 0.5;
  return <group>
    <Box size={[w, cabinet, d]} at={[0, cabinet / 2, 0]} color="#8a6a48" glow={glow} />
    <Box size={[w * 0.9, h, 0.05]} at={[0, cabinet + h / 2 + 0.04, 0]} color={screen} glow={glow} rough={0.2} metal={0.4} />
    <Box size={[w * 0.9 - 0.06, h - 0.06, 0.006]} at={[0, cabinet + h / 2 + 0.04, 0.028]} color="#2d4a63" rough={0.05} cast={false} />
    <Box size={[0.3, 0.04, 0.16]} at={[0, cabinet + 0.02, 0]} color="#15181a" cast={false} />
  </group>;
}

/** The body of one of the objects of the inside of a building. */
export function InteriorBody(props: Props) {
  switch (props.feature.kind) {
    case "wall": return <Wall {...props} />;
    case "fireplace": return <Fireplace {...props} />;
    case "stairs": return <Stairs {...props} />;
    case "kitchen": return <Kitchen {...props} />;
    case "bathroom": return <Bathroom {...props} />;
    case "bed": return <Bed {...props} />;
    case "wardrobe": return <Wardrobe {...props} />;
    case "sofa": return <Sofa {...props} />;
    case "armchair": return <Armchair {...props} />;
    case "dining": return <Dining {...props} />;
    case "tv": return <Television {...props} />;
    default: return null;
  }
}
