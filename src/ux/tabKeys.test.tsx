// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { handleTabKey, tabTarget } from "./tabKeys";

describe("where an arrow key leads among the tabs", () => {
  it("moves one tab and wraps round at the ends", () => {
    const all = [true, true, true];
    expect(tabTarget("ArrowRight", 0, all)).toBe(1);
    expect(tabTarget("ArrowRight", 2, all)).toBe(0);
    expect(tabTarget("ArrowLeft", 0, all)).toBe(2);
    expect(tabTarget("Home", 2, all)).toBe(0);
    expect(tabTarget("End", 0, all)).toBe(2);
  });
  it("skips a tab that is off, and finds nothing when none can be reached", () => {
    expect(tabTarget("ArrowRight", 0, [true, false, true])).toBe(2);
    expect(tabTarget("ArrowLeft", 0, [true, false, true])).toBe(2);
    expect(tabTarget("Home", 1, [false, true, true])).toBe(1);
    expect(tabTarget("End", 0, [true, true, false])).toBe(1);
    expect(tabTarget("ArrowRight", 0, [true, false, false])).toBe(0);
    expect(tabTarget("ArrowRight", 0, [])).toBeNull();
  });
  it("ignores every other key", () => {
    expect(tabTarget("a", 0, [true, true])).toBeNull();
    expect(tabTarget("ArrowDown", 0, [true, true])).toBeNull();
  });
});

describe("the arrow keys in a tab list of the page", () => {
  afterEach(() => { document.body.innerHTML = ""; });
  const build = () => {
    document.body.innerHTML = '<div role="tablist"><button role="tab" id="a">A</button><button role="tab" id="b">B</button><button role="tab" id="c" disabled>C</button></div><button id="x">x</button>';
    const get = (id: string) => document.getElementById(id) as HTMLButtonElement;
    return { a: get("a"), b: get("b"), c: get("c"), x: get("x") };
  };
  it("focuses and opens the next tab", () => {
    const { a, b } = build();
    const clicked = vi.fn(); b.addEventListener("click", clicked);
    const preventDefault = vi.fn();
    expect(handleTabKey({ key: "ArrowRight", target: a, preventDefault })).toBe(true);
    expect(document.activeElement).toBe(b);
    expect(clicked).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalled();
  });
  it("wraps to the first tab past a disabled last one", () => {
    const { a, b } = build();
    expect(handleTabKey({ key: "ArrowRight", target: b })).toBe(true);
    expect(document.activeElement).toBe(a);
  });
  it("does nothing outside a tab list, with a modifier, or for another key", () => {
    const { a, x } = build();
    expect(handleTabKey({ key: "ArrowRight", target: x })).toBe(false);
    expect(handleTabKey({ key: "ArrowRight", target: a, ctrlKey: true })).toBe(false);
    expect(handleTabKey({ key: "Enter", target: a })).toBe(false);
    expect(handleTabKey({ key: "ArrowRight", target: a, defaultPrevented: true })).toBe(false);
  });
});
