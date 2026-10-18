// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { text } from "./i18n";

const api = vi.hoisted(() => ({ deleteDesignVersion: vi.fn(), deleteDesignVersions: vi.fn(), listDesignVersions: vi.fn(), readDesignVersion: vi.fn() }));
vi.mock("./api", () => api);

import { DesignVersionsDialog } from "./DesignVersionsDialog";

const t = (key: string) => text("en", key);
let root: Root | null = null;
let container: HTMLElement;
const flush = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); };
const version = (id: string, revision: number, counts: Record<string, number> = { buildings: 2, sensors: 3, secret_internal: 9 }, by: string | null = "ana") => ({ id, revision, saved_at: "2026-03-04T10:00:00Z", updated_by: by, counts });

type Options = { draft?: { savedAt: string } | null; restoreDraft?: () => void; kind?: "site" | "electrical" };
async function show(options: Options = {}) {
  const close = vi.fn(), restore = vi.fn();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(createElement(DesignVersionsDialog, { kind: options.kind ?? "site", origin: "http://s", t, close, restore, draft: options.draft, restoreDraft: options.restoreDraft })); });
  await flush();
  return { close, restore };
}
const buttons = (label: string) => [...container.querySelectorAll("button")].filter(item => item.textContent === label || item.textContent?.startsWith(`${label} (`));
const click = async (target: Element) => { await act(async () => { target.dispatchEvent(new MouseEvent("click", { bubbles: true })); }); await flush(); };

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  for (const fn of Object.values(api)) fn.mockReset();
});
afterEach(async () => { await act(async () => { root?.unmount(); }); root = null; container?.remove(); });

describe("the kept versions of a design", () => {
  it("lists them with who saved them and what they hold, and only the counts that mean something for a site", async () => {
    api.listDesignVersions.mockResolvedValue({ versions: [version("v2", 12), version("v1", 11, { buildings: 1 }, null)] });
    await show();
    expect(api.listDesignVersions).toHaveBeenCalledWith("http://s", "site");
    const items = [...container.querySelectorAll(".versions-list li")];
    expect(items).toHaveLength(2);
    expect(items[0]!.textContent).toContain("#12");
    expect(items[0]!.textContent).toContain(`${t("versionsBy")} ana`);
    expect(items[0]!.textContent).toContain("2 ");
    expect(items[0]!.textContent).not.toContain("secret_internal");
    expect(items[1]!.textContent).not.toContain(t("versionsBy"));
  });

  it("says it is loading, then that there is nothing, then offers the unsaved copy of this browser when there is one", async () => {
    let release!: (value: unknown) => void;
    api.listDesignVersions.mockImplementation(() => new Promise(resolve => { release = resolve; }));
    await show();
    expect(container.textContent).toContain(t("versionsLoading"));
    await act(async () => { release({ versions: [] }); });
    await flush();
    expect(container.textContent).toContain(t("versionsEmpty"));
    await act(async () => { root?.unmount(); }); root = null; container.remove();

    api.listDesignVersions.mockResolvedValue({ versions: [] });
    const restoreDraft = vi.fn();
    await show({ draft: { savedAt: "2026-03-04T09:00:00Z" }, restoreDraft });
    expect(container.textContent).toContain(t("versionsDraft"));
    expect(container.textContent).not.toContain(t("versionsEmpty"));
    await click(buttons(t("versionsRestore"))[0]!);
    expect(restoreDraft).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain(t("versionsRestored"));
  });

  it("an unreadable list is reported, not left loading for ever", async () => {
    api.listDesignVersions.mockRejectedValue(new Error("403"));
    await show();
    expect(container.querySelector("[role=alert]")?.textContent).toBe(t("versionsFailed"));
    expect(container.textContent).not.toContain(t("versionsLoading"));
  });

  it("taking a version back hands its design to the editor; a version that cannot be read is an error and changes nothing", async () => {
    api.listDesignVersions.mockResolvedValue({ versions: [version("v1", 1), version("v2", 2)] });
    api.readDesignVersion.mockResolvedValueOnce({ buildings: [] }).mockResolvedValueOnce(null).mockRejectedValueOnce(new Error("gone"));
    const { restore } = await show();
    const restoreButtons = buttons(t("versionsRestore"));
    await click(restoreButtons[0]!);
    expect(api.readDesignVersion).toHaveBeenCalledWith("http://s", "site", "v1");
    expect(restore).toHaveBeenCalledWith({ buildings: [] });
    expect(container.textContent).toContain(t("versionsRestored"));
    await click(restoreButtons[1]!);
    await click(restoreButtons[1]!);
    expect(restore).toHaveBeenCalledTimes(1);
    expect(container.querySelector("[role=alert]")).not.toBeNull();
  });

  it("forgetting one version needs a second click on the same button, and a click elsewhere cancels the first", async () => {
    api.listDesignVersions.mockResolvedValue({ versions: [version("v1", 1), version("v2", 2)] });
    api.deleteDesignVersion.mockResolvedValue(undefined);
    await show();
    const danger = () => [...container.querySelectorAll(".versions-list button.danger")] as HTMLButtonElement[];
    await click(danger()[0]!);
    expect(api.deleteDesignVersion).not.toHaveBeenCalled();
    expect(danger()[0]!.textContent).toBe(t("versionsDeleteSure"));
    await click(danger()[1]!);                                    // another button: the first sure is dropped, this one is now waiting
    expect(api.deleteDesignVersion).not.toHaveBeenCalled();
    expect(danger()[0]!.textContent).toBe(t("versionsDelete"));
    await click(danger()[1]!);
    expect(api.deleteDesignVersion).toHaveBeenCalledWith("http://s", "site", "v2");
    expect(container.querySelectorAll(".versions-list li")).toHaveLength(1);
    expect(container.textContent).toContain(t("versionsDeleted"));
  });

  it("'all' is offered only with two or more versions, shows the count, and asks twice", async () => {
    api.listDesignVersions.mockResolvedValue({ versions: [version("v1", 1)] });
    await show();
    expect(container.querySelector(".versions-footer")).toBeNull();
    await act(async () => { root?.unmount(); }); root = null; container.remove();

    api.listDesignVersions.mockResolvedValue({ versions: [version("v1", 1), version("v2", 2), version("v3", 3)] });
    api.deleteDesignVersions.mockResolvedValue(3);
    await show({ kind: "electrical" });
    expect(api.listDesignVersions).toHaveBeenLastCalledWith("http://s", "electrical");
    const all = () => container.querySelector(".versions-footer button") as HTMLButtonElement;
    expect(all().textContent).toBe(`${t("versionsDeleteAll")} (3)`);
    await click(all());
    expect(api.deleteDesignVersions).not.toHaveBeenCalled();
    await click(all());
    expect(api.deleteDesignVersions).toHaveBeenCalledWith("http://s", "electrical");
    expect(container.querySelectorAll(".versions-list li .versions-actions")).toHaveLength(0);
  });

  it("a failed deletion is reported and the version stays in the list", async () => {
    api.listDesignVersions.mockResolvedValue({ versions: [version("v1", 1)] });
    api.deleteDesignVersion.mockRejectedValue(new Error("403"));
    await show();
    const danger = container.querySelector(".versions-list button.danger")!;
    await click(danger);
    await click(container.querySelector(".versions-list button.danger")!);
    expect(container.querySelector("[role=alert]")).not.toBeNull();
    expect(container.querySelectorAll(".versions-list li")).toHaveLength(1);
  });

  it("closes with the close button, with Escape, and with a click outside, but not with a click inside", async () => {
    api.listDesignVersions.mockResolvedValue({ versions: [] });
    const { close } = await show();
    await click(container.querySelector(".modal-close")!);
    expect(close).toHaveBeenCalledTimes(1);
    await act(async () => { container.querySelector(".modal-backdrop")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    expect(close).toHaveBeenCalledTimes(2);
    await act(async () => { container.querySelector(".modal-backdrop")!.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })); });
    expect(close).toHaveBeenCalledTimes(3);
    await act(async () => { container.querySelector("section")!.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })); });
    expect(close).toHaveBeenCalledTimes(3);
  });
});
