import { describe, expect, it } from "vitest";
import app from "../App.tsx?raw";
import { locales, text } from "../i18n";

describe("the console wires the keyboard and screen reader comforts", () => {
  it("the skip link points at the element it focuses, and that element can take the focus", () => {
    const link = app.match(/className="skip-link" href="#([\w-]+)"/);
    expect(link).not.toBeNull();
    const target = link![1];
    expect(app).toContain(`getElementById("${target}")`);
    expect(app).toMatch(new RegExp(`id="${target}" tabIndex=\\{-1\\}`));
  });

  it("announces the open menu politely, and sets the title, the shortcuts and the warning on closing", () => {
    expect(app).toMatch(/role="status" aria-live="polite" data-testid="view-announcement"/);
    expect(app).toContain("usePageTitle(t(view))");
    expect(app).toContain("useShortcuts(prefs.shortcuts");
    expect(app).toContain("useTabKeys();");
    expect(app).toMatch(/useUnloadGuard\(hasUnsavedWork\(\[siteSync\.status, electricalStatus, networkStatus, alarmDesignStatus\]\)\)/);
  });

  it("the skip link and the announcement are worded in every language", () => {
    for (const code of locales) {
      expect(text(code, "ux_skip").length, code).toBeGreaterThan(3);
      expect(text(code, "ux_now_showing"), code).toContain("{0}");
    }
  });
});
