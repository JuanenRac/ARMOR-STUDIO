// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { PanelSyncNote, panelLine } from "./PanelSyncNote";
import { locales, text, type Locale } from "../i18n";
import type { PanelSync } from "../api/contract/armor-rest";

let root: Root | null = null;
let host: HTMLElement | null = null;
const base: PanelSync = { mode: "home", profile: "stay", status: "pending", by: "ana", started_at: "2026-03-04T10:00:00Z", nodes: [{ node_id: "alarm-1", status: "pending", command_id: "00000000000000aa" }] };
const draw = async (sync: PanelSync, language: Locale = "en") => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => { root!.render(createElement(PanelSyncNote, { t: (key: string) => text(language, key), sync })); });
  return host.querySelector("[data-testid=panel-sync-note]") as HTMLElement;
};
afterEach(async () => {
  if (root) await act(async () => { root!.unmount(); });
  host?.remove();
  root = null; host = null;
});

describe("what the alarm panels did about the arming mode", () => {
  it("says waiting while an answer is missing, and lists the panels", async () => {
    const note = await draw(base);
    expect(note.dataset.status).toBe("pending");
    expect(note.getAttribute("role")).toBe("status");
    expect(note.textContent).toContain("Waiting for the panels to confirm the profile stay.");
    expect(note.textContent).toContain("alarm-1: waiting");
  });

  it("says confirmed only when the server reports it, with no list of panels", async () => {
    const note = await draw({ ...base, status: "confirmed", settled_at: "2026-03-04T10:00:02Z", nodes: [{ node_id: "alarm-1", status: "confirmed" }] });
    expect(note.textContent).toContain("The panels confirmed the profile stay.");
    expect(note.querySelector("li")).toBeNull();
    expect(note.className).not.toContain("bad");
  });

  it("warns, as an alert, when a panel refused, was silent or could not be asked, with the reason of each", async () => {
    const note = await draw({ ...base, status: "failed", nodes: [{ node_id: "alarm-1", status: "refused", reason: "zones_open" }, { node_id: "alarm-2", status: "timeout", reason: "timeout" }, { node_id: "alarm-3", status: "unavailable", reason: "node_commands_off" }] });
    expect(note.getAttribute("role")).toBe("alert");
    expect(note.className).toContain("bad");
    expect(note.textContent).toContain("did not confirm the profile stay");
    expect([...note.querySelectorAll("li")].map(item => item.textContent)).toEqual(["alarm-1: refused (zones_open)", "alarm-2: no answer", "alarm-3: could not be asked (node_commands_off)"]);
  });

  it("says none when no panel is known", async () => {
    const note = await draw({ ...base, status: "none", nodes: [] });
    expect(note.textContent).toContain("No alarm panel is known");
  });

  it("has every phrase in the eight languages, Portuguese of Portugal, with the same placeholders", () => {
    const keys = ["sec_opt_panelsync", "sec_opt_panelsync_help", "sec_opt_panelsync_warn", "ps_title", "ps_pending", "ps_confirmed", "ps_failed", "ps_none", "ps_node", "ps_st_pending", "ps_st_confirmed", "ps_st_refused", "ps_st_timeout", "ps_st_unavailable"];
    for (const language of locales) for (const key of keys) {
      const value = text(language, key);
      expect(value, `${language}:${key}`).not.toBe(key);
      if (language !== "en" && !/^(ps_node)$/.test(key)) expect(value, `${language}:${key} is English`).not.toBe(text("en", key));
      expect(value.match(/\{\d\}/g)?.sort() ?? [], `${language}:${key}`).toEqual(text("en", key).match(/\{\d\}/g)?.sort() ?? []);
    }
    expect(text("pt", "sec_opt_panelsync_help")).not.toMatch(/\b(arquivo|tela|celular|salvar)\b/i);
    expect(panelLine((key: string) => text("pt", key), { node_id: "p1", status: "timeout", reason: "timeout" })).toBe("p1: sem resposta");
  });
});
