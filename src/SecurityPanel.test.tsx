import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ElevationDialog } from "./ElevationHost";
import { envValue, isLowering, SecurityPanel, setEnvLines } from "./SecurityPanel";
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
    expect(isLowering([true, false], true, false)).toBe(true);
    expect(isLowering([true, false], false, true)).toBe(false);
  });

  it("offers the option that keeps device logins from nodes that did not come over TLS, in every language, with its warning", () => {
    for (const locale of locales) for (const id of ["sec_opt_netlogin", "sec_opt_netlogin_help", "sec_opt_netlogin_warn"]) {
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
});
