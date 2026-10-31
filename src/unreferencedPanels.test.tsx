/**
 * Characterization of panels and helpers no other test reaches: the root console only opens for an administrator, the copy button falls back when the clipboard is refused, the words for
 * a sound that cannot be used and the first drawing of the panels that read from the server.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { soundErrorText, AlarmSounds } from "./AlarmSounds";
import { SoundFileError } from "./alarmSoundWav";
import { ApiError } from "./api/transport";
import { CapturePanel } from "./CapturePanel";
import { CopyButton, copyToClipboard } from "./components/CopyButton";
import { ConsolePanel, QUICK, TIME_LIMITS } from "./ConsolePanel";
import { MediaLibrary } from "./MediaLibrary";
import { NodeMessages } from "./views/NodeMessages";
import { locales, text } from "./i18n";

const t = (key: string) => text("en", key);

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("the root console", () => {
  it("shows nothing but the refusal to someone who is not an administrator", () => {
    const html = renderToStaticMarkup(createElement(ConsolePanel, { t, origin: "http://s", isAdmin: false }));
    expect(html).toContain(t("cs_admin_only"));
    expect(html).not.toContain("<input");
    expect(html).not.toContain("<textarea");
    expect(html).not.toContain("password");
  });

  it("keeps its time limits and quick commands as they are", () => {
    expect([...TIME_LIMITS]).toEqual([30, 120, 600, 3600]);
    expect(QUICK.map(item => item.key)).toEqual(["mc_q_services", "mc_q_log", "mc_q_disk", "mc_q_memory", "mc_q_network", "mc_q_restart"]);
    for (const item of QUICK) for (const locale of locales) expect(text(locale, item.key).trim().length, `${locale} ${item.key}`).toBeGreaterThan(0);
  });
});

describe("the copy button", () => {
  it("uses the clipboard of the browser first", async () => {
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    expect(await copyToClipboard("hello")).toBe(true);
    expect(writeText).toHaveBeenCalledWith("hello");
  });

  it("falls back to the hidden text area when the clipboard is refused, and says no when that fails too", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: async () => { throw new Error("denied"); } } });
    const area = { value: "", setAttribute: vi.fn(), style: { cssText: "" }, select: vi.fn(), remove: vi.fn() };
    const execCommand = vi.fn(() => true);
    vi.stubGlobal("document", { createElement: () => area, body: { appendChild: vi.fn() }, execCommand });
    expect(await copyToClipboard("fallback")).toBe(true);
    expect(area.value).toBe("fallback");
    expect(area.remove).toHaveBeenCalled();
    execCommand.mockReturnValue(false);
    expect(await copyToClipboard("x")).toBe(false);
    vi.stubGlobal("document", { createElement: () => { throw new Error("no dom"); } });
    expect(await copyToClipboard("x")).toBe(false);
  });

  it("is drawn idle, named for a screen reader and with the label it was given", () => {
    const html = renderToStaticMarkup(createElement(CopyButton, { t, text: "abc", label: "Copy the thing" }));
    expect(html).toContain("copy-button idle");
    expect(html).toContain("Copy the thing");
  });
});

describe("the words for a sound that cannot be used", () => {
  it("uses the words of the file errors and, for anything the server refused, those of its code", () => {
    expect(soundErrorText(t, new SoundFileError("unreadable"))).toBe(t("als_err_unreadable"));
    expect(soundErrorText(t, new SoundFileError("too_long"))).toBe(t("als_err_too_long"));
    expect(soundErrorText(t, new ApiError(400, "generic"))).toBe(t("als_err_generic"));
    expect(soundErrorText(t, new Error("anything"))).toBe(t("als_err_generic"));
    for (const locale of locales) for (const code of ["unreadable", "too_long", "generic"]) expect(text(locale, `als_err_${code}`).trim().length, `${locale} ${code}`).toBeGreaterThan(0);
  });
});

describe("the sounds of the alarms", () => {
  it("draws nothing until the server has said what it has", () => {
    expect(renderToStaticMarkup(createElement(AlarmSounds, { t, origin: "http://s", spokenOn: false, customOn: false }))).toBe("");
  });
});

describe("the panels that read from the server draw something before the answer comes", () => {
  it.each([
    ["the media library", () => createElement(MediaLibrary, { t, origin: "http://s", cameras: [{ id: "c1", name: "Door" }] })],
    ["the capture panel", () => createElement(CapturePanel, { t, origin: "http://s", isAdmin: false })],
    ["the messages of the nodes", () => createElement(NodeMessages, { t, origin: "http://s" })],
  ])("%s", (_name, make) => {
    const html = renderToStaticMarkup(make());
    expect(html.length).toBeGreaterThan(20);
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("[object Object]");
  });
});
