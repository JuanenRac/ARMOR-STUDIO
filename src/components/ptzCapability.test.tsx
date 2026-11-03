// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { CameraPtz } from "./camera";
import { SessionUserContext } from "../sessionContext";
import type { SessionUser } from "../hooks";

const t = (key: string) => key;
const session = (role: "admin" | "operator", actions: Record<string, boolean> | null): SessionUser => ({
  user: { id: "u1", username: "ana", role, created_at: "", pin_set: false } as unknown as SessionUser["user"],
  capabilities: actions ? { version: 1, actions, features: [] } : null,
} as unknown as SessionUser);

async function pad(value: SessionUser | null) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const element = createElement(CameraPtz, { enabled: true, invoke: async () => undefined, t });
  await act(async () => { root.render(value === null ? element : createElement(SessionUserContext.Provider, { value }, element)); });
  const buttons = [...container.querySelectorAll("button")];
  await act(async () => root.unmount());
  container.remove();
  return buttons;
}

describe("moving a camera is its own permission", () => {
  it("leaves the pad on where no session is known (a demo page), as before", async () => {
    const buttons = await pad(null);
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons.every(button => !button.disabled)).toBe(true);
  });
  it("leaves the pad on for a server that announces the permission", async () => {
    const buttons = await pad(session("operator", { camera_control: true }));
    expect(buttons.every(button => !button.disabled)).toBe(true);
  });
  it("turns every button of the pad off when the server announces the action as not allowed", async () => {
    const buttons = await pad(session("operator", { camera_control: false, operate: true }));
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons.every(button => button.disabled)).toBe(true);
  });
  it("lets the role decide when an older server announces nothing", async () => {
    const buttons = await pad(session("operator", null));
    expect(buttons.every(button => !button.disabled)).toBe(true);
  });
});

describe("what the pad says when a move fails", () => {
  const press = async (failure: unknown) => {
    const { text } = await import("../i18n");
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => { root.render(createElement(CameraPtz, { enabled: true, invoke: async () => { throw failure; }, t: (key: string) => text("en", key) })); });
    const stop = container.querySelector<HTMLButtonElement>('button[aria-label="Stop"], button[title="Stop"]') ?? [...container.querySelectorAll("button")].find(button => button.textContent === "■")!;
    await act(async () => { stop.click(); });
    const said = container.querySelector(".ptz-problem")?.textContent ?? "";
    await act(async () => root.unmount());
    container.remove();
    return said;
  };
  it("tells a refusal without words of its own in the language of the person", async () => {
    const { text } = await import("../i18n");
    const { ApiError } = await import("../api/transport");
    expect(await press(new ApiError(429, "generic"))).toBe(text("en", "srv_err_status_429"));
    expect(await press(new TypeError("Failed to fetch"))).toBe(text("en", "srv_err_unreachable"));
  });
  it("keeps the sentence the server gave", async () => {
    expect(await press(new Error("The camera did not answer"))).toBe("The camera did not answer");
  });
});
