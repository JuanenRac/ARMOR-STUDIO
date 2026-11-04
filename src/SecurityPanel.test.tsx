import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ElevationDialog } from "./ElevationHost";
import { envValue, isLowering, SecurityPanel, TRUSTED_HOURS, trustedHoursValue, setEnvLines, REPORT_LIMITS, reportLimitValue, VOICE_LIMITS, visionServiceUrlValue, voiceLimitValue } from "./SecurityPanel";
import { RemoteAccessSetup } from "./RemoteAccessSetup";
import { SessionUserContext } from "./sessionContext";
import { locales, requiredUiKeys, text } from "./i18n";

describe("the security screen", () => {
  it("edits an environment file in place: a value is changed, an empty one is taken out, a new one is added and nothing else moves", () => {
    const file = "# addresses\nARMOR_HOST=0.0.0.0\nARMOR_REMOTE_POLICY=view\n";
    const changed = setEnvLines(file, { ARMOR_REMOTE_POLICY: "operate", ARMOR_TRUST_PROXY: "1", ARMOR_TOTP_REQUIRED: "" });
    expect(changed).toBe("# addresses\nARMOR_HOST=0.0.0.0\nARMOR_REMOTE_POLICY=operate\nARMOR_TRUST_PROXY=1\n");
    expect(setEnvLines(changed, { ARMOR_REMOTE_POLICY: "" })).toBe("# addresses\nARMOR_HOST=0.0.0.0\nARMOR_TRUST_PROXY=1\n");
    expect(envValue(changed, "ARMOR_TRUST_PROXY")).toBe("1");
    expect(envValue(changed, "ARMOR_NOTHING")).toBe("");
  });

  it("has every phrase of the screen, of the new proof and of the second step of the sign-in in all eight languages", () => {
    const wanted = requiredUiKeys.filter(key => key.startsWith("sec_") || key.startsWith("rem_") || key.startsWith("login_totp_") || key === "tabSecurity");
    expect(wanted.length).toBeGreaterThan(130);
    for (const locale of locales) for (const key of wanted) expect(text(locale, key).trim().length, `${locale} ${key}`).toBeGreaterThan(0);
  });

  it("offers the security options of the server only to an administrator of a server that announces them, and asks before one is lowered", () => {
    const t = (key: string) => text("en", key);
    const session = (role: "admin" | "operator", announced: boolean) => ({ user: { id: "u", username: "x", role }, known: true, reason: "", refresh: () => undefined,
      capabilities: announced ? { version: 1, actions: { security_settings: role === "admin" }, features: ["security_settings"] } : null });
    const draw = (role: "admin" | "operator", announced: boolean) => renderToStaticMarkup(createElement(SessionUserContext.Provider, { value: session(role, announced) }, createElement(SecurityPanel, { t, origin: "http://127.0.0.1:8080", isAdmin: role === "admin" })));
    expect(draw("admin", true)).toContain("security-group-options");
    expect(draw("admin", false)).not.toContain("security-group-options");   // an older server: no such page, whatever the role
    expect(draw("operator", true)).not.toContain("security-group-options");
    expect(renderToStaticMarkup(createElement(SecurityPanel, { t, origin: "http://127.0.0.1:8080", isAdmin: true }))).not.toContain("security-group-options");
    expect(isLowering(["always", "if_set", "never"], "if_set", "never")).toBe(true);
    expect(isLowering(["always", "if_set", "never"], "if_set", "always")).toBe(false);
    expect(isLowering(["double_turn", "pin", "off"], "pin", "off")).toBe(true);
    expect(isLowering(["always", "sensitive", "user"], "always", "user")).toBe(true);
    expect(isLowering(["always", "sensitive", "user"], "user", "sensitive")).toBe(false);
    expect(isLowering([true, false], true, false)).toBe(true);
    expect(isLowering([true, false], false, true)).toBe(false);
  });

  it("offers the option that keeps device logins from nodes that did not come over TLS, in every language, with its warning", () => {
    for (const locale of locales) for (const id of ["sec_opt_metrics", "sec_opt_metrics_help", "sec_opt_metrics_warn", "sec_opt_heartbeat", "sec_opt_heartbeat_help", "sec_opt_heartbeat_warn", "in_dry_run", "ch_help", "ch_summary", "in_dry_result", "versionsDiffLoading", "versionsDiffTitle", "versionsDiffLegend", "versionsDiffSame", "versionsDiffFailed", "versionsDiffMore", "sec_opt_netlogin", "sec_opt_netlogin_help", "sec_opt_netlogin_warn", "sec_opt_country", "sec_opt_country_help", "sec_opt_country_warn", "sec_opt_voiceturn", "sec_opt_voiceturn_help", "sec_opt_voiceturn_warn", "sec_opt_panellive", "sec_opt_panellive_help", "sec_opt_panellive_warn", "sec_opt_nvs", "sec_opt_nvs_help", "sec_opt_nvs_off", "sec_opt_nvs_secrets", "sec_opt_nvs_warn", "sec_opt_lock", "sec_opt_lock_help", "sec_opt_lock_warn", "sec_opt_lock_user", "sec_opt_lock_sensitive", "sec_opt_lock_always"]) {
      const words = text(locale, id);
      expect(words.trim().length, `${locale} ${id}`).toBeGreaterThan(8);
      expect(words, `${locale} ${id} is not the key`).not.toBe(id);
    }
    expect(text("en", "sec_opt_node_pending")).not.toContain("will act on them");
  });

  it("offers the summary of a day and the heat map in every language, with their warnings, and turning either on is a loss", () => {
    for (const id of ["sec_opt_dailysummary", "sec_opt_heatmap"]) for (const suffix of ["", "_help", "_warn"]) {
      const words = new Set<string>();
      for (const locale of locales) {
        const phrase = text(locale, id + suffix);
        expect(phrase.trim().length, `${locale} ${id}${suffix}`).toBeGreaterThan(4);
        expect(phrase, `${locale} ${id}${suffix} is not the key`).not.toBe(id + suffix);
        words.add(phrase);
      }
      expect(words.size, `${id}${suffix} is translated, not repeated`).toBe(8);
    }
    expect(text("pt", "sec_opt_heatmap_help")).toContain("câmara");
    expect(text("pt", "sec_opt_dailysummary_help")).toContain("palavras-passe");
    // off first, on last: the last value is the one that carries the warning and asks first
    expect(isLowering([false, true], false, true)).toBe(true);
    expect(isLowering([false, true], true, false)).toBe(false);
    // a server that does not announce them (an older one) shows no such option; the types know both
    const t = (key: string) => text("en", key);
    expect(renderToStaticMarkup(createElement(SecurityPanel, { t, origin: "http://127.0.0.1:8080", isAdmin: false }))).not.toContain("security-option-heatmap");
  });

  it("draws the cards of the account, and the dialog that asks for the password again", () => {
    const t = (key: string) => text("en", key);
    const panel = renderToStaticMarkup(createElement(SecurityPanel, { t, origin: "http://127.0.0.1:8080", isAdmin: false }));
    for (const id of ["security-2fa", "security-sessions", "security-remote"]) expect(panel).toContain(id);
    expect(panel).not.toContain("security-settings");
    expect(panel).not.toContain("remote-node-panels");
    const admin = renderToStaticMarkup(createElement(SecurityPanel, { t, origin: "http://127.0.0.1:8080", isAdmin: true }));
    expect(admin).toContain("remote-node-panels");
    expect(admin).toContain("Access from outside the house");
    const dialog = renderToStaticMarkup(createElement(ElevationDialog, { t, origin: "http://127.0.0.1:8080", done: () => undefined }));
    expect(dialog).toContain("Confirm that it is you");
    expect(dialog).toContain('type="password"');
  });
  it("holds the sizes of a spoken turn to the ceilings of the server before it asks, and has every phrase of the fields in all eight languages", () => {
    expect(voiceLimitValue("voice.turn_max_bytes", "480000")).toBe(480000);
    expect(voiceLimitValue("voice.turn_max_bytes", " 3200 ")).toBe(3200);
    expect(voiceLimitValue("voice.turn_max_bytes", "1920000")).toBe(1920000);
    for (const bad of ["3199", "1920001", "", "abc", "12.5", "-5", "1e5", "0003200000000"]) expect(voiceLimitValue("voice.turn_max_bytes", bad), bad).toBeUndefined();
    expect(voiceLimitValue("voice.reply_audio_max_bytes", "1000000")).toBe(1000000);
    expect(voiceLimitValue("voice.reply_audio_max_bytes", "1000001")).toBeUndefined();
    expect(VOICE_LIMITS["voice.turn_max_bytes"].max).toBe(1_920_000);
    for (const locale of locales) for (const id of ["sec_voice_title", "sec_voice_help", "sec_voice_turn", "sec_voice_reply", "sec_voice_range", "sec_voice_seconds", "sec_voice_save", "sec_voice_invalid", "sec_voice_warn", "sec_voice_confirm"]) {
      const words = text(locale, id);
      expect(words.trim().length, `${locale} ${id}`).toBeGreaterThan(3);
      expect(words, `${locale} ${id} is not the key`).not.toBe(id);
    }
    for (const locale of locales) { expect(text(locale, "sec_voice_range")).toContain("{min}"); expect(text(locale, "sec_voice_range")).toContain("{max}"); expect(text(locale, "sec_voice_seconds")).toContain("{seconds}"); }
  });

  it("holds the limits of the reports to the ranges of the server before it asks, and has every phrase of the fields in all eight languages", () => {
    expect(reportLimitValue("reports.timeout_s", "20")).toBe(20);
    expect(reportLimitValue("reports.timeout_s", " 5 ")).toBe(5);
    expect(reportLimitValue("reports.timeout_s", "120")).toBe(120);
    for (const bad of ["4", "121", "", "abc", "12.5", "-5", "1e2", "00000020"]) expect(reportLimitValue("reports.timeout_s", bad), bad).toBeUndefined();
    expect([reportLimitValue("reports.queue_max", "1"), reportLimitValue("reports.queue_max", "10"), reportLimitValue("reports.queue_max", "0"), reportLimitValue("reports.queue_max", "11")]).toEqual([1, 10, undefined, undefined]);
    expect([reportLimitValue("reports.requests_per_minute", "300"), reportLimitValue("reports.requests_per_minute", "301"), reportLimitValue("reports.requests_per_minute", "0")]).toEqual([300, undefined, undefined]);
    expect(Object.values(REPORT_LIMITS).map(limit => [limit.min, limit.max])).toEqual([[5, 120], [1, 10], [1, 300], [1, 90], [10, 3600], [5, 3600], [0, 600]]);
    for (const locale of locales) for (const id of ["sec_rep_title", "sec_rep_help", "sec_rep_timeout", "sec_rep_queue", "sec_rep_rate", "sec_rep_logdays", "sec_rep_readingevery", "sec_rep_powerevery", "sec_rep_falsealarm", "sec_rep_range", "sec_rep_save", "sec_rep_invalid"]) {
      const words = text(locale, id);
      expect(words.trim().length, `${locale} ${id}`).toBeGreaterThan(3);
      expect(words, `${locale} ${id} is not the key`).not.toBe(id);
    }
    for (const locale of locales) { expect(text(locale, "sec_rep_range")).toContain("{min}"); expect(text(locale, "sec_rep_range")).toContain("{max}"); }
    expect(text("pt", "sec_rep_save")).toBe("Guardar os limites");
    expect([reportLimitValue("summary.false_alarm_s", "0"), reportLimitValue("summary.false_alarm_s", "601"), reportLimitValue("summary.log_days", "0"), reportLimitValue("summary.log_days", "90"), reportLimitValue("summary.reading_every_s", "9"), reportLimitValue("summary.power_every_s", "5")]).toEqual([0, undefined, undefined, 90, undefined, 5]);
    // a server that does not announce them (an older one) shows no such fields
    const t = (key: string) => text("en", key);
    expect(renderToStaticMarkup(createElement(SecurityPanel, { t, origin: "http://127.0.0.1:8080", isAdmin: false }))).not.toContain("security-report-limits");
  });

  it("checks the address of the live vision service like the server does, and has every phrase of it in all eight languages", () => {
    expect(visionServiceUrlValue("")).toBe("");
    expect(visionServiceUrlValue("  ")).toBe("");
    for (const good of ["http://127.0.0.1:8765", " http://localhost:9000 ", "https://127.0.0.1", "http://[::1]:8765", "http://vision.local:8765/"]) expect(visionServiceUrlValue(good), good).toBe(good.trim());
    for (const bad of ["ftp://127.0.0.1", "http://user:pass@127.0.0.1", "http://127.0.0.1/heatmap", "http://127.0.0.1?x=1", "http://127.0.0.1#x", "127.0.0.1:8765", "http://", "http://" + "a".repeat(100), "http://127.0.0.1 :8765"]) expect(visionServiceUrlValue(bad), bad).toBeUndefined();
    for (const locale of locales) for (const id of ["sec_opt_visionremote", "sec_opt_visionremote_help", "sec_opt_visionremote_warn", "sec_vis_title", "sec_vis_help", "sec_vis_url", "sec_vis_save", "sec_vis_invalid"]) {
      const words = text(locale, id);
      expect(words.trim().length, `${locale} ${id}`).toBeGreaterThan(3);
      expect(words, `${locale} ${id} is not the key`).not.toBe(id);
    }
    expect(text("pt", "sec_vis_save")).toBe("Guardar o endereço");
    const t = (key: string) => text("en", key);
    expect(renderToStaticMarkup(createElement(SecurityPanel, { t, origin: "http://127.0.0.1:8080", isAdmin: false }))).not.toContain("security-vision-service");
  });

  it("offers the text that pairs a phone with the HTTPS of the house, in every language", () => {
    for (const locale of locales) {
      const html = renderToStaticMarkup(createElement(RemoteAccessSetup, { t: (key: string) => text(locale, key), origin: "https://casa.duckdns.org" }));
      expect(html, locale).toContain(text(locale, "rem_pair_title").replace(/'/g, "&#x27;"));
      expect(html, locale).toContain("casa.duckdns.org");   // the name of the house is the one the field starts with
      for (const id of ["rem_pair_help", "rem_pair_host", "rem_pair_show", "rem_pair_copy", "rem_pair_none", "rem_pair_error", "rem_pair_until"]) {
        expect(text(locale, id).trim().length, `${locale} ${id}`).toBeGreaterThan(1);
        expect(text(locale, id), `${locale} ${id} is not the key`).not.toBe(id);
      }
    }
  });

  it("offers the trusted phones in every language, asks before they are turned on, and holds the hours of their session to the range of the server", () => {
    for (const id of ["sec_opt_trusted", "sec_opt_trusted_help", "sec_opt_trusted_warn", "sec_tp_title", "sec_tp_help", "sec_tp_off", "sec_tp_none", "sec_tp_added", "sec_tp_used", "sec_tp_end", "sec_tp_ended", "sec_tp_hours", "sec_tp_hours_help"]) {
      for (const locale of locales) {
        expect(text(locale, id).trim().length, `${locale} ${id}`).toBeGreaterThan(1);
        expect(text(locale, id), `${locale} ${id} is not the key`).not.toBe(id);
      }
    }
    expect(text("pt", "sec_tp_title")).toContain("Telemóveis");
    expect(isLowering([false, true], false, true)).toBe(true);    // turning it on asks first
    expect(isLowering([false, true], true, false)).toBe(false);
    expect(TRUSTED_HOURS).toEqual({ min: 1, max: 720 });
    expect(trustedHoursValue("72")).toBe(72);
    expect(trustedHoursValue(" 1 ")).toBe(1);
    expect(trustedHoursValue("720")).toBe(720);
    for (const bad of ["", "0", "721", "-5", "7.5", "abc", "99999"]) expect(trustedHoursValue(bad), bad).toBeUndefined();
  });
});
