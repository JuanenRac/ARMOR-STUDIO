/**
 * The 2D plan symbols of the objects of the inside of a building, seen from above at the same size as in the 3D view (see InteriorFeatures), drawn about the object's centre with the front at
 * the bottom. A wall shows its door (with the swing), its window or its opening as a gap in the line.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { ReactNode } from "react";
import type { SiteFeature } from "../domain";
import { DEFAULT_FEATURE_COLOUR } from "./colors";
import { wallGap } from "./InteriorFeatures";

export function interiorShape(feature: SiteFeature): ReactNode {
  const w = feature.width, d = feature.depth, fill = `var(--c, ${DEFAULT_FEATURE_COLOUR[feature.kind]})`;
  const body = { className: "p-x", style: { fill } }, dark = { className: "p-x p-x-dark" }, line = { className: "p-x-line" }, open = { className: "p-x-open" };
  const style = feature.style ?? "";
  switch (feature.kind) {
    case "wall": {
      const gap = wallGap(feature), half = gap ? gap.width / 2 : 0, door = gap && gap.sill === 0 && style !== "wOpening", glass = gap && gap.sill > 0;
      const pick = <rect x={-w / 2} y={-Math.max(d, 0.5) / 2} width={w} height={Math.max(d, 0.5)} style={{ fill: "transparent" }} />;
      if (!gap) return <>{pick}<rect x={-w / 2} y={-d / 2} width={w} height={d} {...body} /></>;
      return <>{pick}
        <rect x={-w / 2} y={-d / 2} width={w / 2 - half} height={d} {...body} /><rect x={half} y={-d / 2} width={w / 2 - half} height={d} {...body} />
        {glass && <><rect x={-half} y={-d / 2} width={gap.width} height={d} className="p-x-open" /><path d={`M${-half} 0H${half}`} {...line} /></>}
        {door && style === "wDoubleDoor" && <><path d={`M${-half} 0A${half} ${half} 0 0 1 0 ${half}M${half} 0A${half} ${half} 0 0 0 0 ${half}`} className="p-door-swing" /><path d={`M${-half} 0V${half}M${half} 0V${half}`} {...line} /></>}
        {door && style !== "wDoubleDoor" && <><path d={`M${-half} 0A${gap.width} ${gap.width} 0 0 1 ${half} ${gap.width}`} className="p-door-swing" /><path d={`M${-half} 0V${gap.width}`} {...line} /></>}</>;
    }
    case "fireplace":
      if (style === "fCentral") return <><circle r={Math.min(w, d) / 2} {...body} /><circle r={Math.min(w, d) / 2 * 0.55} {...dark} /><circle r={0.14} {...open} /></>;
      if (style === "fCorner") return <><path d={`M${-w / 2} ${d / 2}H${w / 2}L${-w / 2} ${-d / 2}Z`} {...body} /><path d={`M${-w / 2} ${d / 2}H${w * 0.1}L${-w / 2} ${-d * 0.1}Z`} {...dark} /></>;
      return <><rect x={-w / 2} y={-d / 2} width={w} height={d} {...body} /><rect x={-w * 0.3} y={d / 2 - 0.18} width={w * 0.6} height={0.14} {...dark} /><rect x={-w * 0.35} y={-d / 2} width={w * 0.7} height={d * 0.55} {...open} /></>;
    case "stairs": {
      const steps = Math.max(3, Math.round(feature.height / 0.18));
      return <><rect x={-w / 2} y={-d / 2} width={w} height={d} {...body} />{Array.from({ length: steps - 1 }, (_, i) => <path key={i} d={`M${-w / 2} ${d / 2 - ((i + 1) * d) / steps}H${w / 2}`} {...line} />)}<path d={`M0 ${d / 2 - 0.2}V${-d / 2 + 0.25}M${-0.15} ${-d / 2 + 0.45}L0 ${-d / 2 + 0.25}L0.15 ${-d / 2 + 0.45}`} {...line} /></>;
    }
    case "kitchen": {
      const hobs = [[-w * 0.2, -d * 0.18], [-w * 0.2 + 0.34, -d * 0.18], [-w * 0.2, d * 0.18], [-w * 0.2 + 0.34, d * 0.18]];
      const island = style === "kIsland", l = style === "kL", side = Math.max(0.6, w * 0.5);
      return <>{!l && <rect x={-w / 2} y={-d / 2} width={w} height={d} {...body} />}
        {l && <><rect x={-w / 2} y={-d / 2} width={w} height={d} {...body} /><rect x={w / 2 - d} y={-d / 2} width={d} height={side + d} {...body} /></>}
        {hobs.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={Math.min(0.09, d * 0.15)} {...dark} />)}
        <rect x={w * 0.2} y={-d * 0.3} width={w * 0.2} height={d * 0.6} rx={0.04} {...open} />{island && <rect x={-w / 2} y={d / 2 - 0.02} width={w} height={0.04} {...line} />}</>;
    }
    case "bathroom":
      if (style === "baShower") return <><rect x={-w / 2} y={-d / 2} width={w} height={d} {...body} /><path d={`M${-w / 2} ${d / 2}H${w / 2}V${-d / 2}`} {...line} /><circle cx={-w / 2 + 0.1} cy={-d / 2 + 0.1} r={0.07} {...dark} /></>;
      if (style === "baToilet") return <><rect x={-Math.min(w, 0.4) / 2} y={-d / 2} width={Math.min(w, 0.4)} height={0.2} {...body} /><ellipse cx={0} cy={0.08} rx={Math.min(w, 0.4) / 2} ry={0.27} {...body} /><ellipse cx={0} cy={0.1} rx={Math.min(w, 0.4) / 2 - 0.05} ry={0.2} {...open} /></>;
      if (style === "baBasin") return <><rect x={-w / 2} y={-d / 2} width={w} height={d} {...body} /><ellipse cx={0} cy={0} rx={w * 0.32} ry={d * 0.3} {...open} /><circle cy={-d * 0.3} r={0.03} {...dark} /></>;
      return <><rect x={-w / 2} y={-d / 2} width={w} height={d} rx={0.12} {...body} /><rect x={-w / 2 + 0.1} y={-d / 2 + 0.1} width={w - 0.2} height={d - 0.2} rx={0.18} {...open} /><circle cx={-w / 2 + 0.2} cy={0} r={0.04} {...dark} /></>;
    case "bed": {
      const double = style !== "bSingle";
      return <><rect x={-w / 2} y={-d / 2} width={w} height={d} rx={0.04} {...body} /><rect x={-w / 2} y={-d / 2} width={w} height={0.08} {...dark} />
        {(double ? [-1, 1] : [0]).map(s => <rect key={s} x={s * w * 0.23 - (double ? w * 0.2 : w * 0.35)} y={-d / 2 + 0.13} width={double ? w * 0.4 : w * 0.7} height={0.35} rx={0.06} {...open} />)}
        <path d={`M${-w / 2 + 0.05} ${-d * 0.1}H${w / 2 - 0.05}`} {...line} /></>;
    }
    case "wardrobe": {
      const doors = Math.max(2, Math.round(w / 0.6));
      return <><rect x={-w / 2} y={-d / 2} width={w} height={d} {...body} />{Array.from({ length: doors - 1 }, (_, i) => <path key={i} d={`M${-w / 2 + ((i + 1) * w) / doors} ${d / 2 - 0.02}V${d / 2}`} {...line} />)}<path d={`M${-w / 2} ${-d / 2}L${w / 2} ${d / 2}M${w / 2} ${-d / 2}L${-w / 2} ${d / 2}`} {...line} /></>;
    }
    case "sofa": case "armchair": {
      const arm = Math.min(0.2, w * 0.14), corner = style === "sCorner" && feature.kind === "sofa";
      return <><rect x={-w / 2} y={-d / 2} width={w} height={d} rx={0.08} {...body} />{corner && <rect x={w / 2 - d} y={d / 2 - 0.02} width={d} height={d * 1.7} rx={0.08} {...body} />}
        <rect x={-w / 2} y={-d / 2} width={w} height={d * 0.28} rx={0.08} {...dark} />
        <rect x={-w / 2} y={-d / 2} width={arm} height={d} rx={0.06} {...open} /><rect x={w / 2 - arm} y={-d / 2} width={arm} height={d} rx={0.06} {...open} /></>;
    }
    case "dining": {
      const count = Math.max(2, Math.round(w / 0.6));
      return <><rect x={-w / 2} y={-d / 2} width={w} height={d} rx={0.05} {...body} />{[-1, 1].flatMap(side => Array.from({ length: count }, (_, i) => <rect key={`${side}${i}`} x={-w / 2 + ((i + 0.5) * w) / count - 0.2} y={side * (d / 2 + 0.22) - 0.2} width={0.4} height={0.4} rx={0.06} {...open} />))}</>;
    }
    case "tv": {
      const stand = style === "tStand";
      return stand ? <><rect x={-w / 2} y={-d / 2} width={w} height={d} rx={0.03} {...body} /><rect x={-w * 0.45} y={-0.03} width={w * 0.9} height={0.06} {...dark} /></>
        : <><rect x={-w / 2} y={-d / 2} width={w} height={0.08} {...dark} /><path d={`M${-w / 2} ${-d / 2 + 0.14}H${w / 2}`} {...line} /></>;
    }
    default: return null;
  }
}
