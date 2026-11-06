import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MACHINE_UPDATE_REASONS, MachineUpdateCard, machineUpdateActivity, machineUpdateReasonKey } from "./MachineUpdateCard";
import { locales, text } from "./i18n";
import type { AuditEntry } from "./api";

describe("the card of the programs of the machine, from the phone", () => {
  it("keeps only the lines of this feature from the audit trail, newest first as the server sends them, and at most eight", () => {
    const entry = (action: string, n: number): AuditEntry => ({ at: `t${n}`, action, outcome: "allowed", actor: "ana", target: "ARMOR-SERVER" });
    const trail = [entry("machine_update.apply", 1), entry("login", 2), entry("machine_update.preview", 3), entry("alarm.ack", 4)];
    expect(machineUpdateActivity(trail).map(line => line.at)).toEqual(["t1", "t3"]);
    const many = Array.from({ length: 20 }, (_, index) => entry("machine_update.preview", index));
    expect(machineUpdateActivity(many)).toHaveLength(8);
    expect(machineUpdateActivity(many, 3).map(line => line.at)).toEqual(["t0", "t1", "t2"]);
    expect(machineUpdateActivity([])).toEqual([]);
  });

  it("maps each reason of the server to its own text and anything else to the general one", () => {
    for (const reason of MACHINE_UPDATE_REASONS) expect(machineUpdateReasonKey(reason)).toBe(`mu_reason_${reason}`);
    expect(machineUpdateReasonKey("something_new")).toBe("mu_reason_generic");
    expect(machineUpdateReasonKey(undefined)).toBe("mu_reason_generic");
  });

  it("shows nothing while the switch is being read (the card never offers a control, it only explains)", () => {
    expect(renderToStaticMarkup(createElement(MachineUpdateCard, { t: key => text("en", key), origin: "http://127.0.0.1:8080" }))).toBe("");
  });

  it("has every phrase in the eight languages, the Portuguese of Portugal among them, and names the two switches", () => {
    const ids = ["mu_title", "mu_help", "mu_state_on", "mu_state_off", "mu_how_title", "mu_how", "mu_projects", "mu_no_projects", "mu_signed", "mu_unsigned", "mu_activity", "mu_activity_none",
      "mu_act_preview", "mu_act_apply", "mu_out_allowed", "mu_out_denied", "mu_out_failed", "mu_unreadable", "mu_refresh", "mu_reason_generic", ...MACHINE_UPDATE_REASONS.map(reason => `mu_reason_${reason}`)];
    expect(locales.length).toBe(8);
    for (const locale of locales) for (const id of ids) {
      const words = text(locale, id);
      expect(words, `${locale} ${id}`).not.toBe(id);
      expect(words.trim(), `${locale} ${id}`).not.toBe("");
    }
    for (const locale of locales) {
      expect(text(locale, "mu_how")).toContain("ARMOR_CM5_UPDATE=1");
      expect(text(locale, "mu_how")).toContain("ARMOR_MAINT_UPDATER=1");
    }
    expect(text("pt", "mu_title")).toContain("telemóvel");
  });
});
