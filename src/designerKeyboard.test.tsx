// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { text } from "./i18n";
import { ViewSlot } from "./viewSlots";
import { AlarmDesigner } from "./AlarmDesigner";
import { ElectricalDesigner } from "./ElectricalDesigner";
import { NetworkDesigner } from "./NetworkDesigner";
import { housePreset as alarmHouse } from "./alarm/presets";
import { housePreset as electricalHouse } from "./electrical/presets";
import { housePreset as networkHouse } from "./network/presets";

/** Each designer is mounted whole in a browser-like page, and the keys are pressed on the window as a person does. */
const t = (key: string) => text("en", key);
type Case = { name: string; wire: string; select: string; design: { elements: unknown[] }; mount: (setDesign: (next: never) => void) => ReturnType<typeof createElement> };
const cases: Case[] = [
  { name: "alarm", wire: "ad_tool_link", select: "elToolSelect", design: alarmHouse(t), mount: setDesign => createElement(AlarmDesigner, { t, design: alarmHouse(t), setDesign: setDesign as never, status: "saved", panels: null }) },
  { name: "electrical", wire: "elToolWire", select: "elToolSelect", design: electricalHouse(t), mount: setDesign => createElement(ElectricalDesigner, { t, design: electricalHouse(t), setDesign: setDesign as never, status: "saved", nodeIds: [], solarDevices: [], solarWaiting: [] }) },
  { name: "network", wire: "nd_tool_link", select: "elToolSelect", design: networkHouse(t), mount: setDesign => createElement(NetworkDesigner, { t, design: networkHouse(t), setDesign: setDesign as never, status: "saved", overview: null }) },
];

let root: Root | null = null;
let container: HTMLElement;
beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  container = document.createElement("div");
  document.body.appendChild(container);
});
afterEach(() => { act(() => root?.unmount()); root = null; container.remove(); vi.unstubAllGlobals(); });

async function show(node: ReturnType<typeof createElement>, active: boolean) {
  root = createRoot(container);
  await act(async () => { root!.render(createElement(ViewSlot, { active, children: node })); });
}
const press = (key: string, extra: KeyboardEventInit = {}, target: EventTarget = window) => act(() => { target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...extra })); });
const button = (label: string) => container.querySelector<HTMLButtonElement>(`button[aria-label="${t(label)}"]`)!;

describe.each(cases)("the keyboard of the $name designer, mounted whole", item => {
  it("W takes the wire tool and V the select tool", async () => {
    await show(item.mount(vi.fn()), true);
    expect(button(item.select).className).toContain("on");
    press("w");
    expect(button(item.wire).className).toContain("on");
    expect(button(item.select).className).not.toContain("on");
    press("v");
    expect(button(item.select).className).toContain("on");
  });

  it("does not answer while its menu is open but hidden behind another one", async () => {
    await show(item.mount(vi.fn()), false);
    press("w");
    expect(button(item.wire).className).not.toContain("on");
    press("d", { ctrlKey: true });
  });

  it("does not take the keys typed in a field", async () => {
    await show(item.mount(vi.fn()), true);
    const field = document.createElement("input");
    document.body.appendChild(field);
    press("w", {}, field);
    expect(button(item.wire).className).not.toContain("on");
    field.remove();
  });

  it("Escape leaves the wire tool", async () => {
    await show(item.mount(vi.fn()), true);
    press("w");
    expect(button(item.wire).className).toContain("on");
    press("Escape");
    expect(button(item.wire).className).not.toContain("on");
  });

  it("Ctrl+D copies the selected element and does nothing with nothing selected", async () => {
    const setDesign = vi.fn();
    await show(item.mount(setDesign), true);
    press("d", { ctrlKey: true });
    expect(setDesign).not.toHaveBeenCalled();
    const element = container.querySelector<SVGGElement>("svg g[style*='cursor: grab']");
    expect(element).not.toBeNull();
    await act(async () => { element!.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0, clientX: 10, clientY: 10 })); });
    await act(async () => { window.dispatchEvent(new MouseEvent("pointerup", { bubbles: true })); container.querySelector("svg")!.dispatchEvent(new MouseEvent("pointerup", { bubbles: true })); });
    press("d", { ctrlKey: true });
    expect(setDesign).toHaveBeenCalledTimes(1);
    expect((setDesign.mock.calls[0][0] as { elements: unknown[] }).elements.length).toBe(item.design.elements.length + 1);
  });

  it("Delete takes away the selected element", async () => {
    const setDesign = vi.fn();
    await show(item.mount(setDesign), true);
    const element = container.querySelector<SVGGElement>("svg g[style*='cursor: grab']")!;
    await act(async () => { element.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0, clientX: 10, clientY: 10 })); });
    press("Delete");
    expect(setDesign).toHaveBeenCalled();
    expect((setDesign.mock.calls.at(-1)![0] as { elements: unknown[] }).elements.length).toBe(item.design.elements.length - 1);
  });

  it("F and the plus and minus keys move the view and nothing else", async () => {
    const setDesign = vi.fn();
    await show(item.mount(setDesign), true);
    const grid = () => container.querySelector("pattern")!.getAttribute("width");
    const before = grid();
    press("+");
    expect(grid()).not.toBe(before);
    press("-");
    expect(grid()).toBe(before);
    press("f");
    expect(setDesign).not.toHaveBeenCalled();
  });
});
