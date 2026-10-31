/**
 * Plain 2D geometry for the coverage check: points and polygons in metres. Every function is pure and deterministic.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
export type P = { x: number; y: number };

const EPS = 1e-9;

/** Whether a point is inside a polygon or on its boundary. */
export function insidePolygon(point: P, polygon: readonly P[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i], b = polygon[j];
    const cross = (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x);
    if (Math.abs(cross) <= EPS && point.x >= Math.min(a.x, b.x) - EPS && point.x <= Math.max(a.x, b.x) + EPS && point.y >= Math.min(a.y, b.y) - EPS && point.y <= Math.max(a.y, b.y) + EPS) return true;
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

export function polygonArea(polygon: readonly P[]): number {
  let sum = 0;
  for (let i = 0; i < polygon.length; i += 1) { const a = polygon[i], b = polygon[(i + 1) % polygon.length]; sum += a.x * b.y - b.x * a.y; }
  return Math.abs(sum) / 2;
}

/**
 * Whether the segment from `from` to `to` meets the wall `a`-`b` anywhere but at its two ends (touching, crossing or running along it): such a segment is taken as blocked,
 * so the check never counts a sight line that might go through a wall.
 */
export function blockedBy(from: P, to: P, a: P, b: P): boolean {
  const rx = to.x - from.x, ry = to.y - from.y, sx = b.x - a.x, sy = b.y - a.y;
  const denominator = rx * sy - ry * sx;
  const qx = a.x - from.x, qy = a.y - from.y;
  const length = Math.hypot(rx, ry);
  if (length < EPS) return false;
  const endGap = 1e-6 / length;
  if (Math.abs(denominator) < EPS) {
    if (Math.abs(qx * ry - qy * rx) > 1e-9 * Math.max(1, length)) return false;   // parallel and apart
    const t0 = (qx * rx + qy * ry) / (length * length), t1 = ((b.x - from.x) * rx + (b.y - from.y) * ry) / (length * length);
    return Math.max(Math.min(t0, t1), endGap) < Math.min(Math.max(t0, t1), 1 - endGap);   // along it
  }
  const t = (qx * sy - qy * sx) / denominator, u = (qx * ry - qy * rx) / denominator;
  return t > endGap && t < 1 - endGap && u >= -1e-9 && u <= 1 + 1e-9;
}

/** Whether the target is in the sector (apex, heading in degrees anticlockwise from east, half angle, range). Smaller than the sector never exceeds it. */
export function inSectorOf(target: P, apex: P, heading: number, halfAngleDeg: number, rangeM: number): boolean {
  const dx = target.x - apex.x, dy = target.y - apex.y, distance = Math.hypot(dx, dy);
  if (distance > rangeM) return false;
  if (distance < EPS) return true;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  return Math.abs(((angle - heading) % 360 + 540) % 360 - 180) <= halfAngleDeg;
}
