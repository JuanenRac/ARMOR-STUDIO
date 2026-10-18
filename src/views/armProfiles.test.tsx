import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { locales, text } from "../i18n";
import type { AlarmNodeView, ArmProfile, ArmProfiles } from "../api";
import { ArmProfilesEditor } from "./ArmProfilesEditor";
import { PanelCard } from "./AlarmPanelsView";

const profiles: ArmProfile[] = [
  { id: "away", name: "Away", base: "away" }, { id: "stay", name: "Home", base: "stay" },
  { id: "night", name: "Night", base: "stay", entry_delay_s: 45, siren: false, zones: [{ id: "hall", armed: true }] },
  { id: "garden", name: "Garden", base: "away" },
];
const current: ArmProfiles = { revision: 2, updated_at: "2026-01-01T00:00:00.000Z", updated_by: "admin", profiles, max: 8 };

const panel = (extra: Partial<AlarmNodeView["state"]> = {}): AlarmNodeView => ({
  node_id: "alarm-1", received_at: new Date().toISOString(), stale: false,
  state: { kind: "alarm", node_id: "alarm-1", timestamp_ms: 1, phase: "disarmed", mode: "disarmed", siren: false, locked_out: false, commands_enabled: true,
    zones: [{ id: "hall", name: "Hall", kind: "interior", state: "normal", bypassed: false }], open_zones: [], events: [], ...extra },
});
const card = (node: AlarmNodeView, language: Parameters<typeof text>[0] = "en", list: ArmProfile[] | undefined = profiles) =>
  renderToStaticMarkup(createElement(PanelCard, { t: (key: string) => text(language, key), origin: "http://x", node, now: Date.now(), canCommand: true, recent: [], reload: () => undefined, profiles: list }));

describe("the arming modes in the Alarm panels menu", () => {
  it("offers a mode picker and one button to arm in the chosen mode when the panel's firmware knows the modes", () => {
    const html = card(panel({ arm_profiles: true }));
    expect(html).toContain('data-tour="ap-mode-picker"');
    for (const name of ["Away", "Home", "Night", "Garden"]) expect(html).toContain(`>${name}</option>`);
    expect(html).toContain("Arm in this mode");
    expect(html).not.toContain("Arm: away");
    expect(html).not.toContain("Arm: at home");
  });

  it("keeps the two classic buttons for a panel that does not know the modes, and says why the modes are not offered", () => {
    const html = card(panel());
    expect(html).not.toContain("ap-mode-picker");
    expect(html).not.toContain("Arm in this mode");
    expect(html).toContain("apArmAway".length ? text("en", "apArmAway") : "");
    expect(html).toContain("does not know arming modes");
    // no modes known by the server at all: the classic buttons, and no note
    const bare = card(panel({ arm_profiles: true }), "en", []);
    expect(bare).toContain(text("en", "apArmAway"));
    expect(bare).not.toContain("ap-mode-picker");
  });

  it("names the mode a panel is armed with, using the name of the language for the three of the start", () => {
    const armed = card(panel({ phase: "armed", mode: "stay", arm_profiles: true, profile: "night" }), "es");
    expect(armed).toContain("modo Noche");
    const english = card(panel({ phase: "armed", mode: "stay", arm_profiles: true, profile: "garden" }));
    expect(english).toContain("mode Garden");
    const unknown = card(panel({ phase: "armed", mode: "stay", arm_profiles: true, profile: "deleted" }));
    expect(unknown).toContain("mode deleted");
    expect(card(panel({ arm_profiles: true }))).not.toContain("ap-active-mode");
  });

  it("draws the editor for the modes with a summary of each, in every language, and the controls once it is opened", () => {
    for (const language of locales) {
      const html = renderToStaticMarkup(createElement(ArmProfilesEditor, { t: (key: string) => text(language, key), origin: "http://x", current, zones: [["hall", "Hall"]], onSaved: () => undefined, onConflict: () => undefined }));
      expect(html, language).toContain('data-tour="ap-modes"');
      expect(html, language).not.toMatch(/apm_|nh_hide/);
      expect(html, language).toContain(text(language, "apm_name_night"));
      expect(html, language).not.toContain("{0}");
    }
  });

  it("has every phrase of the modes in the eight languages", () => {
    const keys = ["apm_title", "apm_help", "apm_mode", "apm_arm", "apm_current", "apm_unsupported", "apm_editor", "apm_name", "apm_base", "apm_base_away", "apm_base_stay", "apm_exit", "apm_entry", "apm_node_default", "apm_siren", "apm_siren_hint",
      "apm_notify", "apm_notify_urgent", "apm_notify_normal", "apm_zones", "apm_zone_add", "apm_zone_pick", "apm_zone_armed", "apm_zone_armed_default", "apm_zone_armed_yes", "apm_zone_armed_no", "apm_zone_delay", "apm_zone_delay_default",
      "apm_zone_delay_instant", "apm_zone_delay_entry", "apm_add", "apm_remove", "apm_locked", "apm_save", "apm_saved", "apm_conflict", "apm_invalid", "apErr_unknown_profile", "apErr_profiles_unsupported"];
    for (const language of locales) {
      for (const key of keys) expect(text(language, key), `${language}: ${key}`).not.toBe(key);
      if (language !== "en") expect(text(language, "apm_title"), language).not.toBe(text("en", "apm_title"));
      expect(text(language, "apm_current")).toContain("{0}");
    }
  });
});
