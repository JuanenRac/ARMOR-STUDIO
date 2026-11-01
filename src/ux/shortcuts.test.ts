// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { shortcutFor, takesTyping } from "./shortcuts";

const on = (tag: string) => document.createElement(tag);

describe("the one-key shortcuts", () => {
  it("? opens the Help and B folds the menu, in either case", () => {
    expect(shortcutFor({ key: "?", target: document.body })).toBe("help");
    expect(shortcutFor({ key: "b", target: document.body })).toBe("sidebar");
    expect(shortcutFor({ key: "B", target: document.body })).toBe("sidebar");
    expect(shortcutFor({ key: "x", target: document.body })).toBeNull();
  });

  it("do nothing with a modifier held or when something already handled the key", () => {
    expect(shortcutFor({ key: "b", ctrlKey: true, target: document.body })).toBeNull();
    expect(shortcutFor({ key: "b", altKey: true, target: document.body })).toBeNull();
    expect(shortcutFor({ key: "b", metaKey: true, target: document.body })).toBeNull();
    expect(shortcutFor({ key: "b", defaultPrevented: true, target: document.body })).toBeNull();
  });

  it("do nothing while typing in a field, on a button or a link, inside a dialog or in editable text", () => {
    for (const tag of ["input", "textarea", "select", "button", "a"]) expect(shortcutFor({ key: "?", target: on(tag) }), tag).toBeNull();
    const dialog = on("div"); dialog.setAttribute("role", "dialog"); const inside = on("div"); dialog.appendChild(inside);
    expect(takesTyping(inside)).toBe(true);
    const editable = on("div"); Object.defineProperty(editable, "isContentEditable", { value: true });
    expect(takesTyping(editable)).toBe(true);
    expect(takesTyping(null)).toBe(false);
    expect(takesTyping(on("div"))).toBe(false);
  });
});
