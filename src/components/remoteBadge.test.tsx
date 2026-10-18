// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TopBar } from "./chrome";
import { locales, text } from "../i18n";

let root: Root | null = null;
let host: HTMLElement | null = null;

const draw = async (remote: { policy: string } | null, locale: (typeof locales)[number]) => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  const t = (key: string) => text(locale, key);
  await act(async () => {
    root!.render(createElement(TopBar, { view: "overview", revision: 1, mode: "disarmed", demo: false, siteStatus: "idle", fullScreen: () => undefined, isFullScreen: false, openAbout: () => undefined, openHelp: () => undefined, toggleMode: () => undefined, remote, t }));
  });
  return host.querySelector(".remote-badge");
};

describe("the remote connection indicator", () => {
  beforeEach(() => { (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; });
  afterEach(async () => { await act(async () => { root?.unmount(); }); host?.remove(); root = null; host = null; });

  it("is absent from inside the house", async () => {
    expect(await draw(null, "en")).toBeNull();
  });

  it("names the connection and the second-factor policy in every language", async () => {
    for (const locale of locales) {
      const badge = await draw({ policy: "always" }, locale);
      expect(badge?.textContent, locale).toBe(text(locale, "remoteConn"));
      expect(badge?.getAttribute("title"), locale).toContain(text(locale, "remoteConn_always"));
      await act(async () => { root?.unmount(); }); host?.remove(); root = null; host = null;
    }
  });
});
