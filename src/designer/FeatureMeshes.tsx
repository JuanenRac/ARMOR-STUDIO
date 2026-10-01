/**
 * The 3D bodies of the garden and farm objects: trees (oak, pine, palm, bush), fences (mesh, picket, rail, wire, wall), gates (iron, wood,
 * modern, stone), fountains, dog kennels and chicken coops. Each is drawn at its own origin on the ground, facing +Z (south) at rotation 0.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useMemo } from "react";
import * as THREE from "three";
import type { SiteFeature } from "../domain";
import { shade } from "./colors";

type Glow = { emissive: string; emissiveIntensity: number };
type Props = { feature: SiteFeature; glow: Glow };

const Box = ({ size, at, color, glow, rough = 0.85, metal = 0, cast = true, rotation }: { size: [number, number, number]; at: [number, number, number]; color: string; glow?: Glow; rough?: number; metal?: number; cast?: boolean; rotation?: [number, number, number] }) =>
  <mesh position={at} rotation={rotation} castShadow={cast} receiveShadow><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={rough} metalness={metal} {...glow} /></mesh>;

function Tree({ feature, glow }: Props) {
  const w = feature.width, h = feature.height, style = feature.style ?? "oak", leaf = feature.color, leafLight = leaf ? shade(leaf, 0.18) : undefined;
  const trunkRadius = Math.max(0.07, w * 0.035);
  if (style === "pine") {
    const trunk = h * 0.22, layers = [[w / 2, h * 0.42, trunk], [w * 0.36, h * 0.36, trunk + h * 0.24], [w * 0.22, h * 0.3, trunk + h * 0.46]] as const;
    return <group>
      <mesh position={[0, trunk / 2, 0]} castShadow><cylinderGeometry args={[trunkRadius * 0.8, trunkRadius, trunk, 8]} /><meshStandardMaterial color="#5b4030" roughness={0.9} {...glow} /></mesh>
      {layers.map(([radius, height, base], index) => <mesh key={index} position={[0, base + height / 2, 0]} castShadow receiveShadow><coneGeometry args={[radius, height, 12]} /><meshStandardMaterial color={index === 2 ? "#2d6a45" : "#245c3b"} roughness={0.85} {...glow} /></mesh>)}
    </group>;
  }
  if (style === "palm") {
    const trunk = h * 0.8;
    return <group>
      <mesh position={[0.08, trunk / 2, 0]} rotation={[0, 0, -0.06]} castShadow><cylinderGeometry args={[trunkRadius * 0.7, trunkRadius, trunk, 8]} /><meshStandardMaterial color="#8a6b47" roughness={0.9} {...glow} /></mesh>
      {Array.from({ length: 8 }, (_, index) => <mesh key={index} position={[Math.cos(index * Math.PI / 4) * w * 0.2 + 0.1, trunk + 0.05, Math.sin(index * Math.PI / 4) * w * 0.2]} rotation={[0, -index * Math.PI / 4, -0.7]} castShadow>
        <boxGeometry args={[w * 0.55, 0.03, w * 0.14]} /><meshStandardMaterial color={leaf ?? "#3f8f4a"} roughness={0.8} {...glow} /></mesh>)}
      <mesh position={[0.1, trunk, 0]}><sphereGeometry args={[0.13, 10, 10]} /><meshStandardMaterial color="#6a4a2a" /></mesh>
    </group>;
  }
  if (style === "bush") {
    return <group>{[[0, 0.5, 0, 0.5], [0.32, 0.38, 0.12, 0.36], [-0.3, 0.4, -0.1, 0.38]].map(([x, y, z, r], index) => <mesh key={index} position={[x * w, Math.min(h, y * h * 1.4), z * w]} scale={[1, 0.85, 1]} castShadow receiveShadow>
      <sphereGeometry args={[Math.max(0.2, (r as number) * w * 0.9), 14, 12]} /><meshStandardMaterial color={index === 1 ? (leafLight ?? "#3a8c50") : (leaf ?? "#2f7d45")} roughness={0.9} {...glow} /></mesh>)}</group>;
  }
  const trunk = h * 0.38;
  return <group>
    <mesh position={[0, trunk / 2, 0]} castShadow><cylinderGeometry args={[trunkRadius * 0.8, trunkRadius * 1.15, trunk, 8]} /><meshStandardMaterial color="#5f4632" roughness={0.9} {...glow} /></mesh>
    {[[0, 0, 0, 0.5], [w * 0.22, -0.05, w * 0.1, 0.32], [-w * 0.2, -0.08, -w * 0.12, 0.34], [0.05, 0.22, -w * 0.15, 0.3]].map(([x, y, z, r], index) => <mesh key={index} position={[x, trunk + w * 0.32 + (y as number) * h * 0.4, z]} scale={[1, 0.88, 1]} castShadow receiveShadow>
      <sphereGeometry args={[(r as number) * w, 16, 14]} /><meshStandardMaterial color={index % 2 ? (leafLight ?? "#3c8d4d") : (leaf ?? "#2f7d45")} roughness={0.9} {...glow} /></mesh>)}
  </group>;
}

function Fence({ feature, glow }: Props) {
  const length = feature.width, h = feature.height, style = feature.style ?? "mesh";
  const segments = Math.max(1, Math.ceil(length / 2)), postColour = feature.color ? shade(feature.color, -0.25) : style === "wall" ? "#8f9a9d" : style === "wire" || style === "mesh" ? "#7d8b93" : "#8b6a44", main = feature.color;
  const posts = Array.from({ length: segments + 1 }, (_, index) => -length / 2 + (length * index) / segments);
  if (style === "wall") {
    return <group>
      <Box size={[length, h, Math.max(0.2, feature.depth * 3)]} at={[0, h / 2, 0]} color={main ?? "#9ea8ab"} glow={glow} rough={0.95} />
      <Box size={[length + 0.06, 0.08, Math.max(0.26, feature.depth * 3.4)]} at={[0, h + 0.03, 0]} color="#7d878a" glow={glow} />
      {posts.map(x => <Box key={x} size={[0.28, h + 0.12, 0.3]} at={[x, (h + 0.12) / 2, 0]} color="#8a9497" rough={0.95} />)}
    </group>;
  }
  const pickets = style === "picket" ? Math.min(90, Math.floor(length / 0.14)) : 0;
  const strands = style === "mesh" ? Math.min(60, Math.max(6, Math.floor(length / 0.1))) : 0;
  return <group>
    {posts.map(x => <Box key={x} size={[style === "wire" || style === "mesh" ? 0.05 : 0.09, h + 0.05, style === "wire" || style === "mesh" ? 0.05 : 0.09]} at={[x, (h + 0.05) / 2, 0]} color={postColour} glow={glow} />)}
    {style === "picket" && <>{[0.3, 0.75].map(f => <Box key={f} size={[length, 0.05, 0.04]} at={[0, h * f, -0.03]} color={postColour} glow={glow} />)}
      {Array.from({ length: pickets }, (_, index) => <Box key={index} size={[0.06, h * 0.92, 0.02]} at={[-length / 2 + 0.07 + index * (length - 0.14) / Math.max(1, pickets - 1), h * 0.46, 0.01]} color={main ?? "#c9b48f"} rough={0.9} cast={false} />)}</>}
    {style === "rail" && [0.25, 0.5, 0.78].map(f => <Box key={f} size={[length, 0.09, 0.05]} at={[0, h * f, 0]} color={postColour} glow={glow} />)}
    {style === "wire" && [0.2, 0.45, 0.7, 0.95].map(f => <mesh key={f} position={[0, h * f, 0]}><boxGeometry args={[length, 0.012, 0.012]} /><meshStandardMaterial color={main ?? "#b9c4c8"} metalness={0.8} roughness={0.4} /></mesh>)}
    {/* A real chain-link/mesh security fence: a top and bottom tension wire (the frame a real diamond mesh fabric is tied to) plus a dense
        crosshatch of thin diagonal strands standing in for the woven wire fabric itself - the geometry this file already uses elsewhere
        (thin boxes, no textures), just doubled up in both diagonal directions to read as a mesh rather than a few bare strands. */}
    {style === "mesh" && <>
      {[0.04, 0.96].map(f => <mesh key={f} position={[0, h * f, 0]}><boxGeometry args={[length, 0.02, 0.02]} /><meshStandardMaterial color={main ?? "#9aa4a8"} metalness={0.7} roughness={0.45} /></mesh>)}
      {Array.from({ length: strands }, (_, index) => {
        const x = -length / 2 + (index + 0.5) * (length / strands), tilt = Math.min(1.3, h / (length / strands));
        return <group key={index}>
          <mesh position={[x, h / 2, 0]} rotation={[0, 0, tilt]}><boxGeometry args={[0.014, h * 1.05, 0.014]} /><meshStandardMaterial color={main ?? "#b9c4c8"} metalness={0.75} roughness={0.4} /></mesh>
          <mesh position={[x, h / 2, 0]} rotation={[0, 0, -tilt]}><boxGeometry args={[0.014, h * 1.05, 0.014]} /><meshStandardMaterial color={main ?? "#b9c4c8"} metalness={0.75} roughness={0.4} /></mesh>
        </group>;
      })}
    </>}
  </group>;
}

function Gate({ feature, glow }: Props) {
  const w = feature.width, h = feature.height, style = feature.style ?? "iron";
  const pillar = style === "stone" ? 0.7 : 0.55, gap = Math.max(1, w - 2 * pillar), leaf = gap / 2 - 0.03, px = w / 2 - pillar / 2;
  const stone = style === "stone" || style === "wood" ? "#9a8f82" : "#8d979a", leafColour = feature.color ?? (style === "wood" ? "#8a6234" : style === "modern" ? "#2d3438" : "#20272b");
  const leafHeight = h * (style === "stone" ? 0.8 : 0.85);
  const bars = Math.max(4, Math.floor(leaf / 0.13)), planks = Math.max(3, Math.floor(leaf / 0.16));
  return <group>
    {[-px, px].map(x => <group key={x}>
      <Box size={[pillar, h, pillar]} at={[x, h / 2, 0]} color={stone} glow={glow} rough={0.95} />
      <Box size={[pillar + 0.14, 0.12, pillar + 0.14]} at={[x, h + 0.06, 0]} color="#7d7468" glow={glow} />
      <mesh position={[x, h + 0.28, 0]} castShadow><sphereGeometry args={[0.15, 12, 12]} /><meshStandardMaterial color={style === "modern" ? "#ffe9a8" : "#b8b0a2"} emissive={style === "modern" ? "#ffd36b" : "#000000"} emissiveIntensity={style === "modern" ? 1.2 : 0} roughness={0.7} /></mesh>
    </group>)}
    {style === "stone" && <Box size={[w, 0.3, pillar * 0.8]} at={[0, h - 0.15, 0]} color={stone} glow={glow} rough={0.95} />}
    {[-1, 1].map(side => <group key={side} position={[side * (leaf / 2 + 0.03), 0, 0]}>
      {style === "wood"
        ? <>{Array.from({ length: planks }, (_, index) => <Box key={index} size={[leaf / planks - 0.01, leafHeight - 0.15, 0.05]} at={[-leaf / 2 + (index + 0.5) * leaf / planks, 0.15 + (leafHeight - 0.15) / 2, 0]} color={leafColour} rough={0.9} />)}
            <Box size={[leaf, 0.09, 0.07]} at={[0, 0.3, 0.05]} color="#6f4c28" /><Box size={[leaf, 0.09, 0.07]} at={[0, leafHeight - 0.15, 0.05]} color="#6f4c28" /></>
        : style === "modern"
          ? <>{Array.from({ length: Math.floor(leafHeight / 0.16) }, (_, index) => <Box key={index} size={[leaf, 0.09, 0.05]} at={[0, 0.16 + index * 0.16, 0]} color={leafColour} metal={0.5} rough={0.5} />)}</>
          : <>{Array.from({ length: bars }, (_, index) => <Box key={index} size={[0.03, leafHeight - 0.2, 0.03]} at={[-leaf / 2 + (index + 0.5) * leaf / bars, 0.1 + (leafHeight - 0.2) / 2, 0]} color={leafColour} metal={0.7} rough={0.4} />)}
              <Box size={[leaf, 0.05, 0.05]} at={[0, 0.2, 0]} color={leafColour} metal={0.7} rough={0.4} /><Box size={[leaf, 0.05, 0.05]} at={[0, leafHeight - 0.1, 0]} color={leafColour} metal={0.7} rough={0.4} />
              {Array.from({ length: bars }, (_, index) => <mesh key={`t${index}`} position={[-leaf / 2 + (index + 0.5) * leaf / bars, leafHeight - 0.02, 0]}><coneGeometry args={[0.03, 0.09, 6]} /><meshStandardMaterial color="#c8a24a" metalness={0.7} roughness={0.35} /></mesh>)}</>}
    </group>)}
  </group>;
}

function Fountain({ feature, glow }: Props) {
  const w = feature.width, h = feature.height, rim = 0.42;
  return <group>
    <mesh position={[0, rim / 2, 0]} castShadow receiveShadow><cylinderGeometry args={[w / 2, w / 2 * 0.94, rim, 32, 1, true]} /><meshStandardMaterial color={feature.color ?? "#b3b8b3"} roughness={0.9} side={THREE.DoubleSide} {...glow} /></mesh>
    <mesh position={[0, 0.05, 0]} receiveShadow><cylinderGeometry args={[w / 2 * 0.94, w / 2 * 0.94, 0.1, 32]} /><meshStandardMaterial color="#9da39d" roughness={0.95} /></mesh>
    <mesh position={[0, rim - 0.06, 0]}><cylinderGeometry args={[w / 2 * 0.95, w / 2 * 0.95, 0.02, 32]} /><meshStandardMaterial color="#59b8e6" transparent opacity={0.55} emissive="#1c6f9a" emissiveIntensity={0.45} roughness={0.1} /></mesh>
    <mesh position={[0, h * 0.3, 0]} castShadow><cylinderGeometry args={[0.1, 0.16, h * 0.55, 12]} /><meshStandardMaterial color={feature.color ?? "#b3b8b3"} roughness={0.85} /></mesh>
    <mesh position={[0, h * 0.58, 0]} castShadow><cylinderGeometry args={[w * 0.2, w * 0.1, 0.16, 24]} /><meshStandardMaterial color={feature.color ?? "#b3b8b3"} roughness={0.85} /></mesh>
    <mesh position={[0, h * 0.58 + 0.07, 0]}><cylinderGeometry args={[w * 0.19, w * 0.19, 0.02, 24]} /><meshStandardMaterial color="#59b8e6" transparent opacity={0.6} emissive="#1c6f9a" emissiveIntensity={0.4} /></mesh>
    <mesh position={[0, h * 0.8, 0]}><coneGeometry args={[0.09, h * 0.4, 12, 1, true]} /><meshStandardMaterial color="#9fdcf5" transparent opacity={0.45} side={THREE.DoubleSide} emissive="#3aa0d0" emissiveIntensity={0.4} /></mesh>
  </group>;
}

function Kennel({ feature, glow }: Props) {
  const w = feature.width, d = feature.depth, h = feature.height, body = h * 0.62, slope = 0.62;
  const roofWidth = (w / 2 + 0.08) / Math.cos(slope);
  return <group>
    <Box size={[w, body, d]} at={[0, body / 2 + 0.06, 0]} color={feature.color ?? "#a6763f"} glow={glow} />
    <Box size={[w + 0.1, 0.06, d + 0.1]} at={[0, 0.03, 0]} color="#6f5030" />
    {[-1, 1].map(side => <Box key={side} size={[roofWidth, 0.05, d + 0.16]} at={[side * (w / 4 + 0.02), body + 0.06 + (w / 4) * Math.tan(slope), 0]} rotation={[0, 0, -side * slope]} color="#7b3a2c" rough={0.8} />)}
    <mesh position={[0, body + 0.06 + w / 2 * Math.tan(slope) * 0.5, d / 2 - 0.005]}><boxGeometry args={[w * 0.9, w / 2 * Math.tan(slope) * 0.9, 0.02]} /><meshStandardMaterial color={feature.color ?? "#a6763f"} /></mesh>
    <mesh position={[0, body * 0.36 + 0.06, d / 2 + 0.012]}><boxGeometry args={[w * 0.42, body * 0.72, 0.02]} /><meshStandardMaterial color="#1c1410" /></mesh>
    <mesh position={[0, body * 0.72 + 0.06, d / 2 + 0.012]}><cylinderGeometry args={[w * 0.21, w * 0.21, 0.02, 20, 1, false, 0, Math.PI]} /><meshStandardMaterial color="#1c1410" /></mesh>
    <mesh position={[w * 0.55, 0.05, d / 2 + 0.3]}><cylinderGeometry args={[0.12, 0.09, 0.07, 14]} /><meshStandardMaterial color="#c0c8cc" metalness={0.6} roughness={0.4} /></mesh>
  </group>;
}

function Coop({ feature, glow }: Props) {
  const w = feature.width, d = feature.depth, h = feature.height, leg = 0.38, body = h - leg - 0.2;
  const houseWidth = w * 0.62, ramp = Math.hypot(0.5, leg);
  const geometry = useMemo(() => new THREE.CylinderGeometry(0.02, 0.02, 1, 6), []);
  return <group>
    {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => <mesh key={`${sx}${sz}`} geometry={geometry} position={[sx * (houseWidth / 2 - 0.05), leg / 2, sz * (d / 2 - 0.05)]} scale={[3, leg, 3]} castShadow><meshStandardMaterial color="#6f5030" /></mesh>)}
    <Box size={[houseWidth, 0.06, d]} at={[0, leg, 0]} color="#8a6234" glow={glow} />
    <Box size={[houseWidth, body, d]} at={[0, leg + body / 2, 0]} color={feature.color ?? "#c9583b"} glow={glow} />
    <Box size={[houseWidth + 0.16, 0.06, d + 0.2]} at={[0, leg + body + 0.03, 0]} rotation={[0.16, 0, 0]} color="#4b5a60" metal={0.4} rough={0.6} />
    <mesh position={[0, leg + body * 0.4, d / 2 + 0.012]}><boxGeometry args={[0.3, 0.42, 0.02]} /><meshStandardMaterial color="#231a12" /></mesh>
    <Box size={[0.28, 0.06, 0.5]} at={[0, leg / 2 + 0.02, d / 2 + 0.28]} rotation={[Math.atan2(leg, 0.5), 0, 0]} color="#8a6234" />
    <Box size={[w - houseWidth, 0.34, d * 0.55]} at={[houseWidth / 2 + (w - houseWidth) / 2, leg + 0.28, 0]} color="#a26a3a" glow={glow} />
    <Box size={[w - houseWidth + 0.06, 0.04, d * 0.6]} at={[houseWidth / 2 + (w - houseWidth) / 2, leg + 0.47, 0]} rotation={[0, 0, -0.18]} color="#4b5a60" metal={0.4} />
    <mesh position={[0, leg / 2 + 0.02, d / 2 + 0.28 + ramp * 0.0]} visible={false}><boxGeometry args={[0.01, 0.01, 0.01]} /><meshBasicMaterial /></mesh>
  </group>;
}

function Sidewalk({ feature, glow }: Props) {
  const length = feature.width, wide = feature.depth, h = feature.height, style = feature.style ?? "concrete";
  const base = feature.color ?? (style === "brick" ? "#a9583f" : style === "gravel" ? "#a39d93" : "#b8bcbd"), joint = style === "brick" ? "#6d3325" : style === "gravel" ? "#8a857c" : "#8d9294";
  const slabs = Math.min(60, Math.max(1, Math.round(length / (style === "brick" ? 0.5 : 1.2))));
  return <group>
    <Box size={[length, h, wide]} at={[0, h / 2, 0]} color={base} glow={glow} rough={0.95} cast={false} />
    {style !== "gravel" && Array.from({ length: slabs - 1 }, (_, index) => <Box key={index} size={[0.02, 0.004, wide]} at={[-length / 2 + (index + 1) * length / slabs, h + 0.002, 0]} color={joint} cast={false} />)}
    <Box size={[length, h * 0.6, 0.04]} at={[0, h * 0.3, wide / 2 + 0.01]} color={joint} cast={false} />
  </group>;
}

/** The body for the kinds this file draws; the older kinds live in Viewport3D. */
export function FeatureBody(props: Props) {
  switch (props.feature.kind) {
    case "tree": return <Tree {...props} />;
    case "fence": return <Fence {...props} />;
    case "gate": return <Gate {...props} />;
    case "fountain": return <Fountain {...props} />;
    case "kennel": return <Kennel {...props} />;
    case "coop": return <Coop {...props} />;
    case "sidewalk": return <Sidewalk {...props} />;
    default: return null;
  }
}
export const NEW_FEATURE_KINDS: ReadonlySet<SiteFeature["kind"]> = new Set(["tree", "fence", "gate", "fountain", "kennel", "coop", "sidewalk"]);
