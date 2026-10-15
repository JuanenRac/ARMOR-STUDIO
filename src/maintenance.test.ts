import { describe, expect, it } from "vitest";
import { ApiError } from "./api";
import { QUICK, TIME_LIMITS } from "./ConsolePanel";
import { explainMaintenance, stepLabel, uptimeText } from "./UpdatesPanel";
import { locales, text, type Locale } from "./i18n";
import { MAINTENANCE_KEYS } from "./maintenanceText";

const translate = (language: Locale) => (key: string) => text(language, key);
const CODES = ["busy", "checksum_mismatch", "no_checksum", "no_asset", "unsafe_archive", "bad_archive", "unhealthy_rolled_back", "nothing_to_go_back_to", "apt_update_failed", "apt_upgrade_failed", "maintenance_unavailable"];
const COMPONENTS = ["server", "studio", "network", "ai", "voice", "devops"];

describe("the updates and the console", () => {
  it("has a sentence for every error the helper can give, in the seven languages", () => {
    for (const language of locales) {
      const t = translate(language);
      for (const code of CODES) {
        const sentence = explainMaintenance(t, new ApiError(422, code));
        expect(sentence, `${language} ${code}`).not.toMatch(/^mt_err_/);
        expect(sentence, `${language} ${code}`).not.toBe(t("mt_err_generic"));
      }
      expect(explainMaintenance(t, new ApiError(500, "something_new"))).toBe(t("mt_err_generic"));
    }
  });

  it("names every program, every state and every step", () => {
    const keys = new Set(MAINTENANCE_KEYS);
    for (const id of COMPONENTS) expect(keys.has(`mt_c_${id}`), id).toBe(true);
    for (const state of ["up_to_date", "update_available", "not_installed", "unknown", "ahead"]) expect(keys.has(`mt_s_${state}`), state).toBe(true);
    for (const step of ["download", "verify", "install", "restart", "check", "refresh", "restore"]) expect(keys.has(`mt_step_${step}`), step).toBe(true);
    for (const item of QUICK) expect(keys.has(item.key), item.key).toBe(true);
  });

  it("writes a step as the program and what is being done to it", () => {
    expect(stepLabel(translate("en"), "server.download")).toBe("Server: download");
    expect(stepLabel(translate("es"), "studio.verify")).toBe("Studio (esta consola): comprobar el hash");
    expect(stepLabel(translate("de"), "refresh")).toBe("refresh");
  });

  it("tells how long the machine has been on in the words of a person", () => {
    expect(uptimeText(300)).toBe("5 min");
    expect(uptimeText(3 * 3600 + 120)).toBe("3 h 2 min");
    expect(uptimeText(2 * 86400 + 5 * 3600)).toBe("2 d 5 h");
  });

  it("offers common tasks that are commands and time limits that make sense", () => {
    expect(QUICK.length).toBeGreaterThanOrEqual(5);
    for (const item of QUICK) expect(item.command.length).toBeGreaterThan(5);
    expect([...TIME_LIMITS]).toEqual([30, 120, 600, 3600]);
  });

  it("is named in every language on the tabs and has no key left bare", () => {
    for (const language of locales) {
      const t = translate(language);
      for (const key of ["tabUpdates", "tabConsole", "mt_title", "mc_title", "mc_warn", "mt_update_all", "mc_unlock"]) expect(t(key), `${language} ${key}`).not.toBe(key);
    }
  });
});
