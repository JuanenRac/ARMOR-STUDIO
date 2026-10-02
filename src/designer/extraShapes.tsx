/**
 * The 2D plan symbols of the objects of ExtraFeatures: the same objects as in the 3D view, seen from above, at the same size, drawn about the object's centre with the front (+Z in 3D, down on
 * the plan) at the bottom. The fill is the object's colour (the one the operator chose, or the kind's own).
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { ReactNode } from "react";
import type { SiteFeature } from "../domain";
import { DEFAULT_FEATURE_COLOUR } from "./colors";

/** The kinds this file draws, to show a hit area on the small ones. */
export const SMALL_EXTRA_KINDS: ReadonlySet<SiteFeature["kind"]> = new Set(["bench", "mailbox", "ac-unit", "electrical-box", "barbecue"]);

export function extraShape(feature: SiteFeature): ReactNode {
  const w = feature.width, d = feature.depth, fill = `var(--c, ${DEFAULT_FEATURE_COLOUR[feature.kind]})`;
  const body = { className: "p-x", style: { fill } }, dark = { className: "p-x p-x-dark" }, line = { className: "p-x-line" };
  switch (feature.kind) {
    case "bench": return <><rect x={-w / 2} y={-d / 2} width={w} height={d} rx={0.04} {...body} /><path d={`M${-w / 2} ${-d / 2 + 0.1}H${w / 2}`} {...line} /></>;
    case "table": {
      const tw = w * 0.68, td = d * 0.55;
      return <><rect x={-tw / 2} y={-td / 2} width={tw} height={td} rx={0.05} {...body} />
        {[[-tw * 0.25, td / 2 + 0.3], [tw * 0.25, td / 2 + 0.3], [-tw * 0.25, -td / 2 - 0.3], [tw * 0.25, -td / 2 - 0.3]].map(([x, y], index) => <rect key={index} x={x - 0.21} y={y - 0.21} width={0.42} height={0.42} rx={0.05} {...body} />)}</>;
    }
    case "barbecue": return <><rect x={-w / 2} y={-d / 2} width={w} height={d} {...body} /><rect x={-w * 0.41} y={-d * 0.4} width={w * 0.82} height={d * 0.8} {...dark} />{[1, 2, 3, 4].map(i => <path key={i} d={`M${-w * 0.41} ${-d * 0.4 + (d * 0.8 * i) / 5}H${w * 0.41}`} {...line} />)}<circle cx={w * 0.3} cy={-d * 0.2} r={0.09} {...dark} /></>;
    case "pergola": return <><rect x={-w / 2} y={-d / 2} width={w} height={d} className="p-x-open" />{Array.from({ length: Math.max(4, Math.round(w / 0.38)) }, (_, i, count = Math.max(4, Math.round(w / 0.38))) => <path key={i} d={`M${-w / 2 + 0.1 + (i * (w - 0.2)) / (count - 1)} ${-d / 2 - 0.1}V${d / 2 + 0.1}`} {...line} />)}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => <rect key={`${sx}${sz}`} x={sx * (w / 2 - 0.08) - 0.08} y={sz * (d / 2 - 0.08) - 0.08} width={0.16} height={0.16} {...body} />)}</>;
    case "shed": return <><rect x={-w / 2 - 0.12} y={-d / 2 - 0.12} width={w + 0.24} height={d + 0.24} {...body} /><path d={`M${-w / 2 - 0.12} 0H${w / 2 + 0.12}`} {...line} /><rect x={-0.4} y={d / 2 - 0.02} width={0.8} height={0.1} {...dark} /></>;
    case "hedge": return <><rect x={-w / 2} y={-d / 2} width={w} height={d} rx={Math.min(0.25, d / 2)} {...body} />{Array.from({ length: Math.max(2, Math.round(w / Math.max(0.5, d))) }, (_, i, lumps = Math.max(2, Math.round(w / Math.max(0.5, d)))) => <circle key={i} cx={-w / 2 + ((i + 0.5) * w) / lumps} cy={0} r={d * 0.3} {...line} />)}</>;
    case "mailbox": return <><rect x={-w / 2} y={-d / 2} width={w} height={d} rx={0.06} {...body} /><circle cy={-d * 0.15} r={0.05} {...dark} /></>;
    case "bins": {
      const count = Math.max(2, Math.round(w / 0.7)), bw = Math.min(0.55, w / count - 0.06);
      return <>{Array.from({ length: count }, (_, i) => <g key={i}><rect x={-w / 2 + ((i + 0.5) * w) / count - bw / 2} y={-d * 0.4} width={bw} height={d * 0.8} rx={0.05} className="p-x" style={{ fill: i % 2 ? "#c9a227" : fill }} /><path d={`M${-w / 2 + ((i + 0.5) * w) / count - bw / 2} ${-d * 0.4 + 0.12}H${-w / 2 + ((i + 0.5) * w) / count + bw / 2}`} {...line} /></g>)}</>;
    }
    case "tank": return <><circle r={w / 2} {...body} /><circle r={w / 2 * 0.72} {...line} /><circle r={0.12} {...dark} /></>;
    case "ac-unit": return <><rect x={-w / 2} y={-d / 2} width={w} height={d} {...body} /><path d={`M${-w / 2} ${d / 2 - 0.04}H${w / 2}`} {...line} /><circle cx={-w * 0.12} cy={d / 2 - 0.03} r={Math.min(0.1, d * 0.25)} {...dark} /></>;
    case "electrical-box": return <><rect x={-w / 2} y={-d / 2} width={w} height={d} {...body} /><rect x={-w * 0.2} y={d / 2 - 0.05} width={w * 0.4} height={0.04} {...dark} /><path d={`M${w * 0.05} ${-d * 0.25}l-0.1 0.18h0.1l-0.07 0.16`} {...line} /></>;
    case "car": return <><rect x={-w / 2} y={-d / 2} width={w} height={d} rx={0.35} {...body} /><rect x={-w * 0.31} y={-d * 0.4} width={w * 0.5} height={d * 0.8} rx={0.2} {...dark} /><path d={`M${w * 0.36} ${-d * 0.4}V${d * 0.4}`} {...line} />
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz]) => <rect key={`${sx}${sz}`} x={sx * w * 0.3 - 0.32} y={sz * (d / 2 - 0.02) - 0.07} width={0.64} height={0.14} rx={0.05} {...dark} />)}</>;
    default: return null;
  }
}
