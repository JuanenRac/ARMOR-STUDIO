import { describe, expect, it } from "vitest";
import { placeBubble, type Box, type Size } from "./placement";

const view: Size = { width: 1280, height: 720 };
const bubble: Size = { width: 340, height: 300 };
const mascot = (left: number, top: number): Box => ({ left, top, width: 56, height: 63 });
/** The rectangle the bubble takes. */
const rect = (m: Box, p: { dx: number; dy: number }, b: Size = bubble) => ({ left: m.left + p.dx, top: m.top + p.dy, right: m.left + p.dx + b.width, bottom: m.top + p.dy + b.height });
const inside = (r: ReturnType<typeof rect>, v: Size) => r.left >= 0 && r.top >= 0 && r.right <= v.width && r.bottom <= v.height;
const overlaps = (m: Box, r: ReturnType<typeof rect>) => r.left < m.left + m.width && r.right > m.left && r.top < m.top + m.height && r.bottom > m.top;

describe("where the bubble of the assistant opens", () => {
  it("opens to the right when there is room, and slides up to stay inside near the bottom", () => {
    const m = mascot(100, 100);
    expect(placeBubble(m, bubble, view).side).toBe("right");
    const low = mascot(100, 640);
    const p = placeBubble(low, bubble, view);
    expect(p.side).toBe("right");
    expect(inside(rect(low, p), view)).toBe(true);
  });

  it("opens to the left at the right edge, and below at the left edge of a narrow window", () => {
    const m = mascot(1200, 300);
    expect(placeBubble(m, bubble, view).side).toBe("left");
    const narrow: Size = { width: 380, height: 720 };
    const edge = mascot(10, 100);
    const p = placeBubble(edge, bubble, narrow);
    expect(["below", "above"]).toContain(p.side);
    expect(inside(rect(edge, p), narrow)).toBe(true);
  });

  it("uses a diagonal when no side fits whole", () => {
    const small: Size = { width: 420, height: 420 };
    const tall: Size = { width: 300, height: 250 };
    const m = mascot(180, 150);   // no room at either side or above/below for the whole bubble
    const p = placeBubble(m, tall, small);
    expect(inside(rect(m, p, tall), small)).toBe(true);
  });

  it("never leaves the work area, whatever the corner, and keeps off the mascot when it can", () => {
    for (const left of [0, 200, 640, 1100, 1224]) for (const top of [0, 150, 360, 600, 657]) {
      const m = mascot(left, top);
      const p = placeBubble(m, bubble, view);
      const r = rect(m, p);
      expect(inside(r, { width: view.width - 8, height: view.height - 44 }) || inside(r, view), `${left},${top}`).toBe(true);
      expect(r.left >= 8 && r.top >= 8 && r.right <= view.width - 8 && r.bottom <= view.height - 44, `${left},${top} ${p.side}`).toBe(true);
      expect(overlaps(m, r), `${left},${top} ${p.side} covers the mascot`).toBe(false);
    }
  });

  it("is pushed back inside even when the bubble is larger than the window", () => {
    const m = mascot(50, 50);
    const huge: Size = { width: 2000, height: 1500 };
    const p = placeBubble(m, huge, view);
    expect(Number.isFinite(p.dx) && Number.isFinite(p.dy)).toBe(true);
  });
});
