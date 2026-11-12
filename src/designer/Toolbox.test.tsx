// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement, createRef } from "react";
import { FloatingToolbox, type ToolboxItem } from "./Toolbox";
import { mount } from "../testLive";

const labels = { drag: "Drag", collapse: "Fold", expand: "Unfold" };
const KEY = "test-toolbox";
const item = (id: string, extra: Partial<ToolboxItem> = {}): ToolboxItem => ({ id, icon: id, label: `Tool ${id}`, help: `Help ${id}`, onClick: () => undefined, ...extra });

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} unobserve() {} });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const panel = this.className.includes("floating-toolbox");
    return { left: 0, top: 0, right: 0, bottom: 0, x: 0, y: 0, width: panel ? 40 : 800, height: panel ? 100 : 600, toJSON: () => ({}) } as DOMRect;
  });
  (HTMLElement.prototype as unknown as { setPointerCapture: () => void }).setPointerCapture = () => undefined;
  (HTMLElement.prototype as unknown as { releasePointerCapture: () => void }).releasePointerCapture = () => undefined;
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ""; try { window.localStorage.clear(); } catch { /* blocked */ } });

const box = (sections: ToolboxItem[][], initial?: { x: number; y: number }) => {
  const container = document.createElement("div");
  document.body.append(container);
  return createElement(FloatingToolbox, { storageKey: KEY, title: "Tools", sections, containerRef: { current: container } as never, labels, initial });
};
const fire = async (target: Element | null, type: string, init: MouseEventInit = {}) => { await act(async () => { target?.dispatchEvent(new MouseEvent(type, { bubbles: true, button: 0, ...init })); }); };

describe("the floating tool panel", () => {
  it("draws a button for each tool in its group and runs the one that is clicked, not a disabled one", async () => {
    const run = vi.fn(), blocked = vi.fn();
    const view = await mount(box([[item("a", { onClick: run }), item("b", { disabled: true, onClick: blocked })], [item("c", { active: true, danger: true })]]));
    expect(view.host.querySelectorAll(".tb-group")).toHaveLength(2);
    expect(view.host.querySelectorAll(".tb-tool")).toHaveLength(3);
    await view.click(view.host.querySelector('[aria-label="Tool a"]'));
    await view.click(view.host.querySelector('[aria-label="Tool b"]'));
    expect(run).toHaveBeenCalledTimes(1);
    expect(blocked).not.toHaveBeenCalled();
    const last = view.host.querySelector('[aria-label="Tool c"]');
    expect(last?.getAttribute("aria-pressed")).toBe("true");
    expect(last?.className).toContain("danger");
    await view.unmount();
  });

  it("shows the name, the help and the key of a tool while it has the focus, and hides them when it loses it", async () => {
    const view = await mount(box([[item("a", { keyHint: "V" }), item("b")]]));
    const first = view.host.querySelector<HTMLButtonElement>('[aria-label="Tool a"]');
    await act(async () => { first?.focus(); });
    expect(view.host.querySelector("[role=tooltip]")?.textContent).toContain("Tool a");
    expect(view.host.querySelector("[role=tooltip] kbd")?.textContent).toBe("V");
    expect(view.host.querySelector("[role=tooltip]")?.textContent).toContain("Help a");
    await act(async () => { first?.blur(); });
    expect(view.host.querySelector("[role=tooltip]")).toBeNull();
    await view.unmount();
  });

  it("moves the focus along the enabled tools with the arrow keys and wraps round", async () => {
    const view = await mount(box([[item("a"), item("b", { disabled: true }), item("c")]]));
    const [a, c] = [view.host.querySelector<HTMLButtonElement>('[aria-label="Tool a"]'), view.host.querySelector<HTMLButtonElement>('[aria-label="Tool c"]')];
    await act(async () => { a?.focus(); });
    const press = async (key: string) => { await act(async () => { document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })); }); };
    await press("ArrowDown");
    expect(document.activeElement).toBe(c);
    await press("ArrowRight");
    expect(document.activeElement).toBe(a);
    await press("ArrowUp");
    expect(document.activeElement).toBe(c);
    await press("ArrowLeft");
    expect(document.activeElement).toBe(a);
    await view.unmount();
  });

  it("folds into its grip, says so on the button and remembers it for the next time", async () => {
    let view = await mount(box([[item("a")]]));
    await view.click(view.host.querySelector(".tb-collapse"));
    expect(view.host.querySelectorAll(".tb-tool")).toHaveLength(0);
    expect(view.host.querySelector(".tb-collapse")?.getAttribute("aria-label")).toBe("Unfold");
    expect(JSON.parse(window.localStorage.getItem(KEY) ?? "{}").collapsed).toBe(true);
    await view.unmount();
    view = await mount(box([[item("a")]]));
    expect(view.host.querySelector(".floating-toolbox")?.className).toContain("collapsed");
    await view.click(view.host.querySelector(".tb-collapse"));
    expect(view.host.querySelectorAll(".tb-tool")).toHaveLength(1);
    await view.unmount();
  });

  it("starts where it was left, or at the place it was given, and ignores a saved place that is not numbers", async () => {
    window.localStorage.setItem(KEY, JSON.stringify({ x: 40, y: 50, collapsed: false }));
    let view = await mount(box([[item("a")]], { x: 100, y: 60 }));
    expect(view.host.querySelector<HTMLElement>(".floating-toolbox")?.style.left).toBe("40px");
    await view.unmount();
    window.localStorage.setItem(KEY, JSON.stringify({ x: "far", y: null }));
    view = await mount(box([[item("a")]], { x: 100, y: 60 }));
    expect(view.host.querySelector<HTMLElement>(".floating-toolbox")?.style.left).toBe("100px");
    await view.unmount();
    window.localStorage.setItem(KEY, "{not json");
    view = await mount(box([[item("a")]]));
    expect(view.host.querySelector<HTMLElement>(".floating-toolbox")?.style.left).toBe("32px");
    await view.unmount();
  });

  it("is dragged by its grip with the main button only and keeps the place it was dropped at", async () => {
    const view = await mount(box([[item("a")]]));
    const grip = view.host.querySelector(".tb-grip");
    const before = view.host.querySelector<HTMLElement>(".floating-toolbox")?.style.left;
    await fire(grip, "pointerdown", { button: 2, clientX: 10, clientY: 10 });
    await fire(grip, "pointermove", { clientX: 30, clientY: 30 });
    await fire(grip, "pointerup");
    expect(view.host.querySelector<HTMLElement>(".floating-toolbox")?.style.left).toBe(before);   // a right-click did not start a drag
    await fire(grip, "pointerdown", { clientX: 10, clientY: 10 });
    await fire(grip, "pointermove", { clientX: 30, clientY: 30 });
    await fire(grip, "pointerup");
    const saved = JSON.parse(window.localStorage.getItem(KEY) ?? "{}");
    expect(saved).toEqual({ x: 52, y: 52, collapsed: false });   // the grip was taken at (10, 10) of a panel at (32, 32) and let go at (30, 30)
    await view.unmount();
  });

  it("works with the container not yet known and with storage that refuses to write", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    const view = await mount(createElement(FloatingToolbox, { storageKey: KEY, title: "Tools", sections: [[item("a")]], containerRef: createRef<HTMLElement>(), labels }));
    await view.click(view.host.querySelector(".tb-collapse"));
    expect(view.host.querySelector(".floating-toolbox")?.className).toContain("collapsed");
    vi.restoreAllMocks();
    await view.unmount();
  });
});
