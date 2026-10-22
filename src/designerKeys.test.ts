// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { isTypingTarget, viewKey, zoomView } from "./designerKeys";

const key = (value: string, extra: Partial<Pick<KeyboardEvent, "ctrlKey" | "metaKey" | "altKey">> = {}) => ({ key: value, ctrlKey: false, metaKey: false, altKey: false, ...extra });

describe("the view keys of the designers", () => {
  it("fit, zoom in and zoom out, in either case and with either plus key", () => {
    expect(viewKey(key("f"))).toBe("fit");
    expect(viewKey(key("F"))).toBe("fit");
    expect(viewKey(key("+"))).toBe("zoomIn");
    expect(viewKey(key("="))).toBe("zoomIn");
    expect(viewKey(key("-"))).toBe("zoomOut");
    expect(viewKey(key("_"))).toBe("zoomOut");
  });
  it("leave alone what the browser keeps for itself (Ctrl, the system key, Alt) and every other key", () => {
    for (const extra of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }]) { expect(viewKey(key("f", extra))).toBeNull(); expect(viewKey(key("+", extra))).toBeNull(); }
    for (const other of ["v", "w", "r", "Delete", "ArrowLeft", "Escape", "d"]) expect(viewKey(key(other))).toBeNull();
  });
});

describe("zooming a view around the middle of the drawing area", () => {
  const area = { width: 800, height: 600 };
  it("keeps the point under the middle where it was", () => {
    const view = { x: 40, y: 40, k: 1 };
    const zoomed = zoomView(view, 1.25, area, 0.15, 3);
    expect(zoomed.k).toBeCloseTo(1.25);
    const world = (v: typeof view, px: number, py: number) => ({ x: (px - v.x) / v.k, y: (py - v.y) / v.k });
    expect(world(zoomed, 400, 300).x).toBeCloseTo(world(view, 400, 300).x);
    expect(world(zoomed, 400, 300).y).toBeCloseTo(world(view, 400, 300).y);
  });
  it("stops at the limits and returns the same view when nothing changes", () => {
    const top = { x: 0, y: 0, k: 3 };
    expect(zoomView(top, 1.25, area, 0.15, 3)).toBe(top);
    const bottom = { x: 0, y: 0, k: 0.15 };
    expect(zoomView(bottom, 0.8, area, 0.15, 3)).toBe(bottom);
    expect(zoomView({ x: 0, y: 0, k: 2.9 }, 1.25, area, 0.15, 3).k).toBe(3);
  });
  it("is undone by the opposite factor", () => {
    const view = { x: 120, y: -30, k: 1 };
    const back = zoomView(zoomView(view, 1.25, area, 0.15, 3), 0.8, area, 0.15, 3);
    expect(back.k).toBeCloseTo(1); expect(back.x).toBeCloseTo(120); expect(back.y).toBeCloseTo(-30);
  });
});

describe("where a key is typing", () => {
  it("a field that takes text is typing; a button, the page and nothing are not", () => {
    for (const tag of ["input", "select", "textarea"]) expect(isTypingTarget(document.createElement(tag))).toBe(true);
    expect(isTypingTarget(document.createElement("button"))).toBe(false);
    expect(isTypingTarget(document.body)).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});
