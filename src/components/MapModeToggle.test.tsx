// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MapModeToggle, useMapMode, type MapMode } from "./MapModeToggle";
import { text } from "../i18n";

let root: Root | null = null;
let host: HTMLElement | null = null;
const t = (key: string) => text("en", key);

function Probe({ storageKey }: { storageKey: string }) {
  const [mode, setMode] = useMapMode(storageKey);
  return createElement("div", null, createElement(MapModeToggle, { t, mode, onChange: setMode }), createElement("output", null, mode));
}
const draw = async (key: string) => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => { root!.render(createElement(Probe, { storageKey: key })); });
  return host;
};

describe("the 2D / 3D icon buttons of a map", () => {
  beforeEach(() => { (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; window.localStorage.clear(); });
  afterEach(async () => { await act(async () => { root?.unmount(); }); host?.remove(); root = null; host = null; });

  it("starts in 2D, names both buttons and switches with a click", async () => {
    const view = await draw("test-map");
    const buttons = [...view.querySelectorAll<HTMLButtonElement>(".map-mode button")];
    expect(buttons.map(button => button.getAttribute("aria-label"))).toEqual([t("view2d"), t("view3d")]);
    expect(buttons.map(button => button.getAttribute("aria-pressed"))).toEqual(["true", "false"]);
    expect(buttons.every(button => button.querySelector("svg"))).toBe(true);
    await act(async () => { buttons[1].click(); });
    expect(view.querySelector("output")!.textContent).toBe("3d");
    expect([...view.querySelectorAll(".map-mode button")].map(button => button.getAttribute("aria-pressed"))).toEqual(["false", "true"]);
  });

  it("remembers the mode of each map apart from the others", async () => {
    window.localStorage.setItem("map-a", "3d");
    const view = await draw("map-a");
    expect(view.querySelector("output")!.textContent).toBe("3d" as MapMode);
    await act(async () => { root?.unmount(); });
    view.remove();
    const other = await draw("map-b");
    expect(other.querySelector("output")!.textContent).toBe("2d");
  });

  it("falls back to 2D when the browser keeps nothing", async () => {
    window.localStorage.setItem("map-c", "something else");
    expect((await draw("map-c")).querySelector("output")!.textContent).toBe("2d");
  });
});
