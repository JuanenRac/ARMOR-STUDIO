/**
 * The 3D bodies of the objects that complete a house and its garden: bench, garden table with chairs, barbecue, pergola, garden shed, hedge, mailbox, bins, water tank, air-conditioning
 * unit, electrical cabinet and a parked car. Each is drawn at its own origin on the ground, facing +Z (south) at rotation 0, from the width, depth and height of the object.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { SiteFeature } from "../domain";
import { shade } from "./colors";
import { InteriorBody } from "./InteriorFeatures";

type Glow = { emissive: string; emissiveIntensity: number };
type Props = { feature: SiteFeature; glow: Glow };
type Vec = [number, number, number];

const Box = ({ size, at, color, glow, rough = 0.85, metal = 0, cast = true, rotation }: { size: Vec; at: Vec; color: string; glow?: Glow; rough?: number; metal?: number; cast?: boolean; rotation?: Vec }) =>
  <mesh position={at} rotation={rotation} castShadow={cast} receiveShadow><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={rough} metalness={metal} {...glow} /></mesh>;
const Cylinder = ({ radius, height, at, color, glow, rough = 0.7, metal = 0, rotation, segments = 16 }: { radius: number; height: number; at: Vec; color: string; glow?: Glow; rough?: number; metal?: number; rotation?: Vec; segments?: number }) =>
  <mesh position={at} rotation={rotation} castShadow receiveShadow><cylinderGeometry args={[radius, radius, height, segments]} /><meshStandardMaterial color={color} roughness={rough} metalness={metal} {...glow} /></mesh>;

function Bench({ feature, glow }: Props) {
  const w = feature.width, d = feature.depth, h = feature.height, wood = feature.color ?? "#9a6b3d", iron = "#3a4348";
  return <group>
    <Box size={[w, 0.06, d * 0.8]} at={[0, h * 0.53, d * 0.1]} color={wood} glow={glow} />
    <Box size={[w, h * 0.45, 0.05]} at={[0, h * 0.78, -d / 2 + 0.05]} color={wood} glow={glow} rotation={[-0.12, 0, 0]} />
    {[-1, 1].map(side => <Box key={side} size={[0.05, h * 0.53, d * 0.75]} at={[side * (w / 2 - 0.1), h * 0.265, d * 0.08]} color={iron} metal={0.6} />)}
  </group>;
}

function GardenTable({ feature, glow }: Props) {
  const w = feature.width, d = feature.depth, wood = feature.color ?? "#a2784a";
  const tw = w * 0.68, td = d * 0.55, top = 0.74;
  const chairs: Array<[number, number, number]> = [[-tw * 0.25, td / 2 + 0.3, 0], [tw * 0.25, td / 2 + 0.3, 0], [-tw * 0.25, -td / 2 - 0.3, Math.PI], [tw * 0.25, -td / 2 - 0.3, Math.PI]];
  return <group>
    <Box size={[tw, 0.05, td]} at={[0, top, 0]} color={wood} glow={glow} />
    {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => <Box key={`${sx}${sz}`} size={[0.06, top, 0.06]} at={[sx * (tw / 2 - 0.08), top / 2, sz * (td / 2 - 0.08)]} color="#5f4a33" />)}
    {chairs.map(([x, z, turn], index) => <group key={index} position={[x, 0, z]} rotation={[0, turn, 0]}>
      <Box size={[0.42, 0.05, 0.42]} at={[0, 0.45, 0]} color={wood} glow={glow} />
      <Box size={[0.42, 0.42, 0.04]} at={[0, 0.7, 0.2]} color={wood} glow={glow} />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => <Box key={`${sx}${sz}`} size={[0.04, 0.45, 0.04]} at={[sx * 0.18, 0.225, sz * 0.18]} color="#5f4a33" cast={false} />)}
    </group>)}
  </group>;
}

function Barbecue({ feature, glow }: Props) {
  const w = feature.width, d = feature.depth, h = feature.height, brick = feature.color ?? "#8a5a4a";
  return <group>
    <Box size={[w, h * 0.55, d]} at={[0, h * 0.275, 0]} color={brick} glow={glow} rough={0.95} />
    <Box size={[w + 0.06, 0.08, d + 0.06]} at={[0, h * 0.55 + 0.04, 0]} color="#3a4348" metal={0.5} />
    <Box size={[w * 0.82, 0.03, d * 0.8]} at={[0, h * 0.55 + 0.1, 0]} color="#1d2327" metal={0.7} rough={0.5} />
    {Array.from({ length: 6 }, (_, index) => <Box key={index} size={[w * 0.82, 0.012, 0.012]} at={[0, h * 0.55 + 0.13, -d * 0.35 + index * d * 0.14]} color="#9aa5ab" metal={0.8} cast={false} />)}
    <Box size={[w * 0.5, h * 0.3, d * 0.22]} at={[0, h * 0.55 + 0.25, -d * 0.4]} color="#5f6a70" metal={0.4} />
    <Cylinder radius={0.09} height={h * 0.45} at={[w * 0.3, h * 0.78, -d * 0.2]} color="#3a4348" metal={0.5} />
  </group>;
}

function Pergola({ feature, glow }: Props) {
  const w = feature.width, d = feature.depth, h = feature.height, wood = feature.color ?? "#9a7448", slats = Math.max(4, Math.round(w / 0.38));
  return <group>
    {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => <Box key={`${sx}${sz}`} size={[0.16, h, 0.16]} at={[sx * (w / 2 - 0.08), h / 2, sz * (d / 2 - 0.08)]} color={wood} glow={glow} />)}
    {[-1, 1].map(side => <Box key={side} size={[w + 0.2, 0.16, 0.12]} at={[0, h - 0.08, side * (d / 2 - 0.08)]} color={wood} glow={glow} />)}
    {Array.from({ length: slats }, (_, index) => <Box key={index} size={[0.07, 0.09, d + 0.3]} at={[-w / 2 + 0.1 + (index * (w - 0.2)) / (slats - 1), h + 0.02, 0]} color={shade(wood, -0.08)} glow={glow} />)}
  </group>;
}

function Shed({ feature, glow }: Props) {
  const w = feature.width, d = feature.depth, h = feature.height, wall = h * 0.74, rise = h - wall, run = d / 2 + 0.12, slope = Math.atan2(rise, run), length = Math.hypot(rise, run);
  const body = feature.color ?? "#8a6a4a";
  return <group>
    <Box size={[w, wall, d]} at={[0, wall / 2, 0]} color={body} glow={glow} rough={0.9} />
    {[1, -1].map(side => <Box key={side} size={[w + 0.24, 0.06, length]} at={[0, wall + rise / 2, side * run / 2]} rotation={[side * slope, 0, 0]} color="#4a5258" glow={glow} metal={0.3} />)}
    <Box size={[0.8, wall * 0.82, 0.05]} at={[0, wall * 0.41, d / 2 + 0.025]} color={shade(body, -0.25)} />
    <Box size={[0.05, 0.12, 0.06]} at={[0.28, wall * 0.42, d / 2 + 0.06]} color="#d8dde0" metal={0.8} cast={false} />
    <Box size={[0.5, 0.4, 0.04]} at={[w * 0.3, wall * 0.62, d / 2 + 0.02]} color="#8fd8ff" rough={0.1} metal={0.3} cast={false} />
  </group>;
}

function Hedge({ feature, glow }: Props) {
  const w = feature.width, d = feature.depth, h = feature.height, leaf = feature.color ?? "#2f6b3a", lumps = Math.max(2, Math.round(w / Math.max(0.5, d)));
  return <group>
    <Box size={[w, h * 0.8, d]} at={[0, h * 0.4, 0]} color={leaf} glow={glow} rough={1} />
    {Array.from({ length: lumps }, (_, index) => <mesh key={index} position={[-w / 2 + ((index + 0.5) * w) / lumps, h * 0.8, 0]} scale={[1, 0.55, 1]} castShadow>
      <sphereGeometry args={[Math.min(d * 0.62, (w / lumps) * 0.62), 12, 10]} /><meshStandardMaterial color={shade(leaf, 0.1)} roughness={1} {...glow} /></mesh>)}
  </group>;
}

function Mailbox({ feature, glow }: Props) {
  const w = feature.width, d = feature.depth, h = feature.height, paint = feature.color ?? "#b8392f";
  return <group>
    <Box size={[0.07, h * 0.78, 0.07]} at={[0, h * 0.39, -d * 0.15]} color="#59666d" metal={0.5} />
    <Box size={[w, 0.22, d]} at={[0, h * 0.78 + 0.11, 0]} color={paint} glow={glow} rough={0.5} metal={0.3} />
    <Cylinder radius={0.11} height={w} at={[0, h * 0.78 + 0.22, 0]} rotation={[0, 0, Math.PI / 2]} color={paint} glow={glow} rough={0.5} metal={0.3} />
    <Box size={[w * 0.5, 0.03, 0.02]} at={[0, h * 0.78 + 0.12, d / 2 + 0.01]} color="#1d2327" />
  </group>;
}

function Bins({ feature, glow }: Props) {
  const w = feature.width, d = feature.depth, h = feature.height, colours = [feature.color ?? "#2f6b4a", "#c9a227"], count = Math.max(2, Math.round(w / 0.7)), bw = Math.min(0.55, w / count - 0.06);
  return <group>
    {Array.from({ length: count }, (_, index) => {
      const x = -w / 2 + ((index + 0.5) * w) / count, paint = colours[index % colours.length];
      return <group key={index} position={[x, 0, 0]}>
        <Box size={[bw, h * 0.88, d * 0.8]} at={[0, h * 0.44 + 0.05, 0]} color={paint} glow={glow} rough={0.6} />
        <Box size={[bw + 0.04, 0.06, d * 0.8 + 0.06]} at={[0, h * 0.88 + 0.08, 0]} color={shade(paint, -0.2)} rough={0.6} />
        <Cylinder radius={0.07} height={bw} at={[0, 0.07, -d * 0.36]} rotation={[0, 0, Math.PI / 2]} color="#1d2327" />
      </group>;
    })}
  </group>;
}

function Tank({ feature, glow }: Props) {
  const w = feature.width, h = feature.height, plastic = feature.color ?? "#cfd8dc", r = w / 2, body = h * 0.88;
  return <group>
    <Cylinder radius={r} height={body} at={[0, body / 2 + 0.06, 0]} color={plastic} glow={glow} rough={0.55} segments={28} />
    {[0.25, 0.5, 0.75].map(f => <mesh key={f} position={[0, body * f + 0.06, 0]}><torusGeometry args={[r + 0.005, 0.015, 6, 28]} /><meshStandardMaterial color={shade(plastic, -0.2)} roughness={0.6} /></mesh>)}
    <mesh position={[0, body + 0.06, 0]} scale={[1, 0.22, 1]} castShadow><sphereGeometry args={[r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={plastic} roughness={0.55} {...glow} /></mesh>
    <Cylinder radius={0.12} height={0.12} at={[0, body + 0.06 + r * 0.22, 0]} color="#2f3b41" />
    <Cylinder radius={0.04} height={0.5} at={[r * 0.55, 0.3, r * 0.82]} rotation={[Math.PI / 2, 0, 0]} color="#3a4348" metal={0.6} />
    <Box size={[w * 1.1, 0.06, w * 1.1]} at={[0, 0.03, 0]} color="#9aa0a3" rough={0.95} />
  </group>;
}

function AirConditioner({ feature, glow }: Props) {
  const w = feature.width, d = feature.depth, h = feature.height, shell = feature.color ?? "#e7ecee";
  return <group>
    <Box size={[w * 0.9, 0.08, d]} at={[0, 0.04, 0]} color="#59666d" metal={0.4} />
    <Box size={[w, h - 0.08, d]} at={[0, 0.08 + (h - 0.08) / 2, 0]} color={shell} glow={glow} rough={0.5} />
    <Cylinder radius={Math.min(h, w) * 0.36} height={0.03} at={[-w * 0.12, h * 0.52, d / 2 + 0.005]} rotation={[Math.PI / 2, 0, 0]} color="#1d2327" />
    {[0.5, 0.65, 0.8].map(f => <Box key={f} size={[w * 0.18, 0.012, 0.02]} at={[w * 0.33, h * f, d / 2 + 0.012]} color="#9aa5ab" cast={false} />)}
    <Box size={[w * 0.12, h * 0.12, 0.02]} at={[w * 0.33, h * 0.25, d / 2 + 0.01]} color="#a9b4b9" cast={false} />
  </group>;
}

function ElectricalBox({ feature, glow }: Props) {
  const w = feature.width, d = feature.depth, h = feature.height, shell = feature.color ?? "#9aa6ab";
  return <group>
    <Box size={[w * 0.92, 0.14, d * 0.92]} at={[0, 0.07, 0]} color="#7d8b93" rough={0.95} />
    <Box size={[w, h - 0.14, d]} at={[0, 0.14 + (h - 0.14) / 2, 0]} color={shell} glow={glow} rough={0.55} metal={0.35} />
    <Box size={[w + 0.06, 0.05, d + 0.06]} at={[0, h + 0.025, 0]} color={shade(shell, -0.2)} metal={0.35} />
    <Box size={[w * 0.82, (h - 0.14) * 0.86, 0.015]} at={[0, 0.14 + (h - 0.14) / 2, d / 2 + 0.008]} color={shade(shell, 0.08)} metal={0.35} cast={false} />
    <Box size={[w * 0.4, 0.12, 0.02]} at={[0, h * 0.68, d / 2 + 0.02]} color="#8fd8ff" rough={0.1} metal={0.3} cast={false} />
    <Box size={[0.04, 0.1, 0.025]} at={[w * 0.3, h * 0.45, d / 2 + 0.02]} color="#d8dde0" metal={0.8} cast={false} />
    <Box size={[w * 0.18, 0.18, 0.012]} at={[-w * 0.25, h * 0.42, d / 2 + 0.018]} color="#e6b93a" cast={false} />
  </group>;
}

function Car({ feature, glow }: Props) {
  const w = feature.width, d = feature.depth, h = feature.height, paint = feature.color ?? "#b5332e", wheel = 0.32, lowerH = h * 0.36, base = wheel * 0.85;
  return <group>
    <Box size={[w, lowerH, d]} at={[0, base + lowerH / 2, 0]} color={paint} glow={glow} rough={0.35} metal={0.5} />
    <Box size={[w * 0.5, h * 0.3, d * 0.9]} at={[-w * 0.06, base + lowerH + h * 0.15, 0]} color="#8fb8c9" rough={0.1} metal={0.4} />
    <Box size={[w * 0.46, 0.04, d * 0.86]} at={[-w * 0.06, base + lowerH + h * 0.3 + 0.02, 0]} color={paint} rough={0.35} metal={0.5} />
    {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz]) => <Cylinder key={`${sx}${sz}`} radius={wheel} height={0.24} at={[sx * w * 0.3, wheel, sz * (d / 2 - 0.1)]} rotation={[Math.PI / 2, 0, 0]} color="#1d2327" rough={0.9} />)}
    {[-1, 1].map(side => <Box key={side} size={[0.04, 0.12, 0.3]} at={[w / 2 + 0.01, base + lowerH * 0.7, side * d * 0.32]} color="#ffe9a8" cast={false} />)}
    {[-1, 1].map(side => <Box key={side} size={[0.04, 0.1, 0.24]} at={[-w / 2 - 0.01, base + lowerH * 0.7, side * d * 0.32]} color="#c1272d" cast={false} />)}
  </group>;
}

/** The body of one of the objects of this file. */
export function ExtraBody(props: Props) {
  switch (props.feature.kind) {
    case "bench": return <Bench {...props} />;
    case "table": return <GardenTable {...props} />;
    case "barbecue": return <Barbecue {...props} />;
    case "pergola": return <Pergola {...props} />;
    case "shed": return <Shed {...props} />;
    case "hedge": return <Hedge {...props} />;
    case "mailbox": return <Mailbox {...props} />;
    case "bins": return <Bins {...props} />;
    case "tank": return <Tank {...props} />;
    case "ac-unit": return <AirConditioner {...props} />;
    case "electrical-box": return <ElectricalBox {...props} />;
    case "car": return <Car {...props} />;
    default: return <InteriorBody {...props} />;
  }
}
