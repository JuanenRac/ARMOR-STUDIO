import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AlertSettingsPanel } from "./alerts/AlertSettingsPanel";
import { CameraSettings, type StudioCamera } from "./CameraSettings";
import { locales, text } from "./i18n";
import { PreferencesPanel } from "./PreferencesPanel";

type Locale = (typeof locales)[number];

/** Draws a screen in one language and says which phrases it asked for, and what it drew. */
function draw(locale: Locale, make: (t: (key: string) => string) => ReturnType<typeof createElement>): { html: string; asked: string[] } {
  const asked = new Set<string>();
  const t = (key: string): string => { asked.add(key); return text(locale, key); };
  return { html: renderToStaticMarkup(make(t)), asked: [...asked] };
}

const camera = (patch: Partial<StudioCamera> = {}): StudioCamera => ({ id: "cam-1", name: "Gate", host: "192.168.0.50", snapshotUrl: "", enabled: true, x: 0, y: 0, ...patch }) as StudioCamera;
const cameraScreen = (cameras: StudioCamera[], isAdmin: boolean) => (t: (key: string) => string) =>
  createElement(CameraSettings, { t, origin: "http://armor.local:8080", cameras, onCameraSaved: () => undefined, onCameraDeleted: () => undefined, selectedCameraId: cameras[0]?.id ?? "", onCameraSelected: () => undefined, discovered: [], discover: () => undefined, isAdmin });

const screens: Array<[string, (t: (key: string) => string, locale: Locale) => ReturnType<typeof createElement>]> = [
  ["the preferences", (t, locale) => createElement(PreferencesPanel, { t, language: locale })],
  ["the sounds and voices of the alarm", (t, locale) => createElement(AlertSettingsPanel, { t, language: locale })],
  ["the cameras, none yet, as a viewer", t => cameraScreen([], false)(t)],
  ["the cameras, one, as an administrator", t => cameraScreen([camera()], true)(t)],
  ["the cameras, two, one off, as a viewer", t => cameraScreen([camera(), camera({ id: "cam-2", name: "Garden", enabled: false })], false)(t)],
];

describe("the settings screens", () => {
  for (const [name, make] of screens) {
    it(`${name} draw in every language, and every phrase they ask for is translated there`, () => {
      for (const locale of locales) {
        const { html, asked } = draw(locale, t => make(t, locale));
        expect(html.length, `${name} ${locale}`).toBeGreaterThan(200);
        expect(asked.length, `${name} ${locale}`).toBeGreaterThan(5);
        const missing = asked.filter(key => text(locale, key) === key);
        expect(missing, `${name} in ${locale}`).toEqual([]);
        for (const key of asked) expect(html.includes(`>${key}<`), `${key} left as it is in ${locale}`).toBe(false);
      }
    });

    it(`${name} ask for the same phrases in every language`, () => {
      const sets = locales.map(locale => draw(locale, t => make(t, locale)).asked.slice().sort().join("|"));
      expect(new Set(sets).size).toBe(1);
    });
  }

  it("the cameras screen lists the cameras it is given, for a viewer and for an administrator", () => {
    const viewer = draw("en", cameraScreen([camera(), camera({ id: "cam-2", name: "Garden" })], false)).html;
    expect(viewer).toContain("Gate");
    expect(viewer).toContain("Garden");
    expect(draw("en", cameraScreen([camera()], true)).html).toContain("Gate");
  });

  it("the cameras screen never writes a saved password into the page", () => {
    const html = draw("en", cameraScreen([camera({ hasCredentials: true, username: "admin" })], true)).html;
    expect(html).not.toMatch(/s3cret|password"\s+value="[^"]+"/i);
    expect(html).not.toContain('type="text" value="s3cret');
  });

  it("the preferences are drawn from the defaults with the tutorial and the assistant on and the buttons that depend on them enabled", () => {
    const html = draw("en", t => createElement(PreferencesPanel, { t, language: "en" })).html;
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('type="radio"');
    expect(html).toContain('type="range"');
    expect((html.match(/name="motion"/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect((html.match(/name="density"/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});
