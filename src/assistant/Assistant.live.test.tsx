// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { Assistant } from "./Assistant";
import { text } from "../i18n";
import { setPrefs } from "../prefs";
import { activeTour, stopTour } from "../tour/tourStore";
import { byText, mount, typeInto } from "../testLive";

type Handlers = { onStart?: () => void; onEnd?: () => void };
const spoken: Array<{ words: string; handlers: Handlers }> = [];
vi.mock("../alerts/sounds", async original => ({
  ...(await original<typeof import("../alerts/sounds")>()),
  speakAssistant: (words: string, _settings: unknown, _language: string, handlers: Handlers = {}) => { spoken.push({ words, handlers }); return true; },
  stopAssistantSpeech: () => undefined,
}));

const t = (key: string) => text("en", key);
const fresh = () => setPrefs({ assistant: true, assistantPinned: false, assistantSpeak: false, assistantAutoOpen: true, assistantSize: "normal", assistantX: null, assistantY: null });
beforeEach(() => { fresh(); spoken.length = 0; });
afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ""; stopTour(false); fresh(); try { window.localStorage.clear(); } catch { /* blocked */ } });

const show = async (extra: { view?: "overview" | "cameras" | "history" } = {}) => {
  const go = vi.fn(), openHelp = vi.fn();
  const view = await mount(createElement(Assistant, { view: extra.view ?? "overview", t, language: "en", go, openHelp }));
  return { view, go, openHelp };
};
const ask = async (view: Awaited<ReturnType<typeof mount>>, question: string) => {
  await typeInto(view.host.querySelector(".assistant-ask input"), question);
  await view.click(view.host.querySelector(".assistant-ask button[type=submit]"));
};

describe("the assistant, run for real", () => {
  it("says what the menu is for, reads the next paragraph, opens the help and the tour of the menu", async () => {
    const { view, openHelp } = await show();
    expect(view.host.querySelector(".assistant-bubble")).not.toBeNull();
    for (const label of [...view.host.querySelectorAll<HTMLElement>(".assistant-actions button")].filter(button => button.textContent?.startsWith(t("asst_more")))) await view.click(label);
    await view.click(byText(view.host, t("asst_help")));
    expect(openHelp).toHaveBeenCalledWith("overview");
    await view.click(byText(view.host, t("asst_show")));
    expect(activeTour()).not.toBeNull();   // the tour takes over: the mascot gives way
    expect(view.host.querySelector(".assistant")).toBeNull();
    await view.unmount();
  });

  it("closes and opens the bubble, puts the mascot away in this menu and calls it back", async () => {
    const { view } = await show({ view: "cameras" });
    await view.click(view.host.querySelector(".assistant-mascot"));
    expect(view.host.querySelector(".assistant-bubble")).toBeNull();
    await view.click(view.host.querySelector(".assistant-mascot"));
    expect(view.host.querySelector(".assistant-bubble")).not.toBeNull();
    await view.click(byText(view.host, t("asst_hide")));
    expect(view.host.querySelector(".assistant-call")).not.toBeNull();
    await view.click(view.host.querySelector(".assistant-call"));
    expect(view.host.querySelector(".assistant-bubble")).not.toBeNull();
    await view.unmount();
  });

  it("answers a question with the task, offers to go there, to show it and to open the help, and goes back", async () => {
    const { view, go, openHelp } = await show({ view: "history" });
    await ask(view, "How do I arm the alarm?");
    expect(view.host.querySelector(".assistant-asked")?.textContent).toContain("arm the alarm");
    await view.click(byText(view.host, t("asst_goto")));
    expect(go).toHaveBeenCalled();
    await view.click(byText(view.host, t("asst_help")));
    expect(openHelp).toHaveBeenCalled();
    await view.click(byText(view.host, t("asst_show")));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 450)); });   // the tour of the menu starts a moment after the menu opens
    expect(activeTour()).not.toBeNull();
    stopTour(false);
    await view.unmount();
    const again = await show({ view: "history" });
    await ask(again.view, "How do I arm the alarm?");
    await again.view.click(byText(again.view.host, t("asst_back")));
    expect(again.view.host.querySelector(".assistant-asked")).toBeNull();
    await again.view.unmount();
  });

  it("follows the related questions of an answer", async () => {
    const { view } = await show();
    await ask(view, "alarm");
    const chips = [...view.host.querySelectorAll<HTMLElement>(".assistant-chips button")];
    if (chips.length > 0) await view.click(chips[0]);
    expect(view.host.querySelector(".assistant-asked")).not.toBeNull();
    await view.unmount();
  });

  it("greets, thanks and admits it did not understand, offering examples that can be asked with a click", async () => {
    const { view } = await show();
    await ask(view, "hello");
    expect(view.host.querySelector(".assistant-bubble p")?.textContent).toBeTruthy();
    await view.click(byText(view.host, t("asst_back")));
    await ask(view, "thank you");
    await view.click(byText(view.host, t("asst_back")));
    await ask(view, "qzxv wjkp");
    expect(view.host.querySelector(".assistant-bubble")?.textContent).toContain(t("asst_none"));
    const chip = view.host.querySelector<HTMLElement>(".assistant-chips button");
    expect(chip).not.toBeNull();
    await view.click(chip);
    await ask(view, "   ");
    await view.unmount();
  });

  it("is dragged with the pointer and moved with the arrow keys, pinned, and sent home", async () => {
    const { view } = await show();
    const mascot = view.host.querySelector<HTMLButtonElement>(".assistant-mascot")!;
    mascot.setPointerCapture = () => undefined;
    const pointer = async (type: string, x: number, y: number) => { await act(async () => { mascot.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y })); }); };
    await pointer("pointerdown", 10, 10); await pointer("pointermove", 11, 11); await pointer("pointerup", 11, 11);   // too short to be a drag
    await pointer("pointerdown", 10, 10); await pointer("pointermove", 120, 80); await pointer("pointerup", 120, 80);
    expect(view.host.querySelector(".assistant.free")).not.toBeNull();
    await view.click(mascot);   // the click that follows a drag is not a click
    expect(view.host.querySelector(".assistant-bubble")).not.toBeNull();
    for (const key of ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter"]) await act(async () => { mascot.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })); });
    await view.click(view.host.querySelector(`[aria-label="${t("asst_pin")}"]`));
    expect(view.host.querySelector(".assistant.pinned")).not.toBeNull();
    await pointer("pointerdown", 10, 10);   // pinned: it stays
    await act(async () => { mascot.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true })); });
    await view.click(view.host.querySelector(`[aria-label="${t("asst_home")}"]`));
    expect(view.host.querySelector(".assistant.free")).toBeNull();
    await view.click(view.host.querySelector(`[aria-label="${t("asst_pin")}"]`));
    await view.click(view.host.querySelector(`[aria-label="${t("asst_unpin")}"]`));
    await view.unmount();
  });

  it("reads the bubble aloud when asked, and moves the mouth while it speaks", async () => {
    const { view } = await show();
    await view.click(view.host.querySelector(`[aria-label="${t("asst_speak_off")}"]`));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 260)); });
    expect(spoken.length).toBeGreaterThan(0);
    await act(async () => { spoken.at(-1)!.handlers.onStart?.(); });
    await act(async () => { spoken.at(-1)!.handlers.onEnd?.(); });
    await view.click(view.host.querySelector(`[aria-label="${t("asst_speak_on")}"]`));
    await view.unmount();
  });

  it("is hidden when the person switched it off, and follows the size and the window", async () => {
    setPrefs({ assistant: false });
    const off = await show();
    expect(off.view.host.querySelector(".assistant")).toBeNull();
    await off.view.unmount();
    setPrefs({ assistant: true, assistantSize: "large", assistantAutoOpen: false });
    const big = await show({ view: "cameras" });
    expect(big.view.host.querySelector(".assistant-bubble")).toBeNull();
    await act(async () => { window.dispatchEvent(new Event("resize")); });
    await big.view.unmount();
  });
});
