// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { fallbackKind, fallbackLabel } from "./hintFallback";

const page = (html: string): void => { document.body.innerHTML = html; };
const find = (selector: string): Element => document.body.querySelector(selector)!;

describe("the kind and the name of a control that has no hint of its own", () => {
  afterEach(() => { document.body.innerHTML = ""; });

  it("tells what kind of control it is from its tag, its class and the group it sits in", () => {
    page(`<div class="ov-tile"><button id="tile"><span class="ov-tile-label">Radar</span></button></div>
      <button id="tool" class="tb-tool">Wall</button>
      <div class="grid-picker"><button id="grid">2x2</button></div>
      <div class="media-filters"><button id="filter">Alarms</button></div>
      <div class="plan-floors"><button id="floor">1</button></div>
      <div class="view-tabs"><button id="tab">Plan</button></div>
      <button id="aria-tab" role="tab">Other</button>
      <details><summary id="group">More</summary></details>
      <select id="select"><option>a</option></select><textarea id="area"></textarea>
      <input id="check" type="checkbox"><input id="radio" type="radio"><input id="range" type="range"><input id="text"><input id="number" type="number">
      <button id="plain">Save</button>`);
    const ids = ["tile", "tool", "grid", "filter", "floor", "tab", "aria-tab", "group", "select", "area", "check", "radio", "range", "text", "number", "plain"];
    const kinds = Object.fromEntries(ids.map(id => [id, fallbackKind(find(`#${id}`))]));
    expect(kinds).toEqual({ tile: "tile", tool: "tool", grid: "grid", filter: "filter", floor: "floor", tab: "tab", "aria-tab": "tab", group: "group", select: "choose", area: "type", check: "switch", radio: "switch", range: "slide", text: "type", number: "type", plain: "button" });
  });

  it("a tool wins over the group it sits in, and a tile over a tab", () => {
    page(`<div class="view-tabs"><button id="a" class="tb-tool">Wall</button></div><div class="ov-tile"><div role="tablist"><button id="b">x</button></div></div>`);
    expect(fallbackKind(find("#a"))).toBe("tool");
    expect(fallbackKind(find("#b"))).toBe("tile");
  });

  it("names a control by its aria-label first, then by its label without the options, then by the placeholder, then by its own words", () => {
    page(`<button id="aria" aria-label="  Close   the   panel ">X</button>
      <label>Camera name <select id="select"><option>First camera</option><option>Second</option></select></label>
      <label>Search <input id="search" placeholder="Type here"></label>
      <input id="ph" placeholder="  Find a node  ">
      <input id="bare"><select id="bareSelect"></select>
      <button id="words"> ★  Gate camera <small>3 alarms</small></button>
      <button id="icon">✖</button>`);
    expect(fallbackLabel(find("#aria"))).toBe("Close the panel");
    expect(fallbackLabel(find("#select"))).toBe("Camera name");
    expect(fallbackLabel(find("#search"))).toBe("Search");
    expect(fallbackLabel(find("#ph"))).toBe("Find a node");
    expect(fallbackLabel(find("#bare"))).toBe("");
    expect(fallbackLabel(find("#bareSelect"))).toBe("");
    expect(fallbackLabel(find("#words"))).toBe("Gate camera");
    expect(fallbackLabel(find("#icon"))).toBe("");
  });

  it("cuts a long name to sixty characters and reads a tile from its own label", () => {
    page(`<button id="long" aria-label="${"a".repeat(100)}">x</button><div class="ov-tile"><button id="tile"><span class="ov-tile-label"> Energy  </span><span>12 W</span></button></div>`);
    expect(fallbackLabel(find("#long"))).toHaveLength(60);
    expect(fallbackLabel(find("#tile"))).toBe("Energy");
  });
});
