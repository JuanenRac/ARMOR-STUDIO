import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ElevationDialog } from "./ElevationHost";
import { envValue, isLowering, SecurityPanel, setEnvLines, VOICE_LIMITS, voiceLimitValue } from "./SecurityPanel";
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
    for (const locale of locales) for (const id of ["sec_opt_netlogin", "sec_opt_netlogin_help", "sec_opt_netlogin_warn", "sec_opt_voiceturn", "sec_opt_voiceturn_help", "sec_opt_voiceturn_warn", "sec_opt_panellive", "sec_opt_panellive_help", "sec_opt_panellive_warn", "sec_opt_nvs", "sec_opt_nvs_help", "sec_opt_nvs_off", "sec_opt_nvs_secrets", "sec_opt_nvs_warn", "sec_opt_lock", "sec_opt_lock_help", "sec_opt_lock_warn", "sec_opt_lock_user", "sec_opt_lock_sensitive", "sec_opt_lock_always"]) {
      const words = text(locale, id);
      expect(words.trim().length, `${locale} ${id}`).toBeGreaterThan(8);
      expect(words, `${locale} ${id} is not the key`).not.toBe(id);
    }
    expect(text("en", "sec_opt_node_pending")).not.toContain("will act on them");
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
});
