import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EnrolmentCard } from "./EnrolmentCard";
import { ENROL_PREFIX, MAX_PROFILES, buildEnrolment, cleanOrigin, enrolmentSvg, parseEnrolment, parseProfiles, withProfile } from "./enrolmentCode";
import { locales, text } from "./i18n";

const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
const CODE = "Q2hpbGRyZW5PZkFyY2hpdGVjdHM";
const FP = "79ca85e16340bbc46012defe4cfdff30287c1f0fa5f8dc26b395d15e498e8a7a";
const ORIGIN = "https://armor.example.org:18080";

describe("the text of the QR that sets up an app", () => {
  it("is written with the keys in alphabetical order and read back exactly", () => {
    const written = buildEnrolment(ORIGIN, CODE, FP);
    expect(written).toBe(`armor-enrol:{"ca":"${FP}","code":"${CODE}","origin":"${ORIGIN}","v":1}`);
    expect(parseEnrolment(written)).toEqual({ origin: ORIGIN, code: CODE, ca: FP });
  });

  it("says an empty fingerprint when the server names no authority, and reads it back as empty", () => {
    const written = buildEnrolment(ORIGIN, CODE, null);
    expect(written).toContain('"ca":""');
    expect(parseEnrolment(written)?.ca).toBe("");
  });

  it("holds no password, token or session: only the address, the fingerprint and the code", () => {
    const written = buildEnrolment(ORIGIN, CODE, FP) as string;
    expect(Object.keys(JSON.parse(written.slice(ENROL_PREFIX.length + 1))).sort()).toEqual(["ca", "code", "origin", "v"]);
    expect(written).not.toMatch(/pass|token|secret|session|cookie/i);
  });

  it("refuses an address that is not plain https, a code of the wrong shape and a fingerprint of the wrong length", () => {
    expect(buildEnrolment("http://armor.local", CODE, FP)).toBeNull();
    expect(buildEnrolment("https://user:pw@armor.local", CODE, FP)).toBeNull();
    expect(buildEnrolment("https://armor.local/path", CODE, FP)).toBeNull();
    expect(buildEnrolment("https://armor.local?x=1", CODE, FP)).toBeNull();
    expect(buildEnrolment(ORIGIN, "short", FP)).toBeNull();
    expect(buildEnrolment(ORIGIN, "has spaces in it, not valid", FP)).toBeNull();
    expect(buildEnrolment(ORIGIN, CODE, "abcd")).toBeNull();
    expect(cleanOrigin("https://armor.example.org:18080/")).toBe(ORIGIN);
  });

  it("refuses to read anything that is not exactly what it writes", () => {
    const body = (extra: Record<string, unknown>) => `${ENROL_PREFIX}:${JSON.stringify({ ca: FP, code: CODE, origin: ORIGIN, v: 1, ...extra })}`;
    expect(parseEnrolment(body({}))).not.toBeNull();
    expect(parseEnrolment(body({ password: "x" }))).toBeNull();
    expect(parseEnrolment(body({ v: 2 }))).toBeNull();
    expect(parseEnrolment(body({ origin: "http://armor.local" }))).toBeNull();
    expect(parseEnrolment(body({ ca: "zz" }))).toBeNull();
    expect(parseEnrolment(`armor-provision:{"node_id":"a","server":"${ORIGIN}","v":1}`)).toBeNull();
    expect(parseEnrolment("not a code")).toBeNull();
    expect(parseEnrolment(`${ENROL_PREFIX}:[1]`)).toBeNull();
    expect(parseEnrolment(`${ENROL_PREFIX}:{broken`)).toBeNull();
    expect(parseEnrolment(undefined)).toBeNull();
    expect(parseEnrolment(`${ENROL_PREFIX}:${"x".repeat(400)}`)).toBeNull();
  });

  it("is drawn as an SVG picture", () => {
    expect(enrolmentSvg(buildEnrolment(ORIGIN, CODE, FP) as string)).toContain("<svg");
  });
});

describe("the installations kept in the browser", () => {
  it("keeps a name and an https address, replaces by name and refuses the eleventh", () => {
    let list = withProfile([], "House", ORIGIN) ?? [];
    expect(list).toEqual([{ name: "House", origin: ORIGIN }]);
    list = withProfile(list, "House", "https://other.example.org") ?? [];
    expect(list).toEqual([{ name: "House", origin: "https://other.example.org" }]);
    for (let index = 0; index < MAX_PROFILES - 1; index += 1) list = withProfile(list, `Place ${index}`, ORIGIN) ?? list;
    expect(list).toHaveLength(MAX_PROFILES);
    expect(withProfile(list, "One more", ORIGIN)).toBeNull();
  });

  it("refuses an empty name and an address that is not https", () => {
    expect(withProfile([], "  ", ORIGIN)).toBeNull();
    expect(withProfile([], "House", "http://armor.local")).toBeNull();
    expect(withProfile([], "House", "armor.local")).toBeNull();
  });

  it("drops from what the browser kept whatever is not a name and an https address", () => {
    const raw = JSON.stringify([{ name: "House", origin: ORIGIN }, { name: "", origin: ORIGIN }, { name: "Bad", origin: "http://x" }, { origin: ORIGIN }, 5, null]);
    expect(parseProfiles(raw)).toEqual([{ name: "House", origin: ORIGIN }]);
    expect(parseProfiles("{nope")).toEqual([]);
    expect(parseProfiles(null)).toEqual([]);
    expect(parseProfiles('{"a":1}')).toEqual([]);
  });
});

describe("the card of the QR", () => {
  const card = (locale: (typeof locales)[number]) => renderToStaticMarkup(createElement(EnrolmentCard, { t: key => text(locale, key), origin: "http://localhost:18080" }));

  it("is shown in every language, with its help and its form, and no picture until a code is made", () => {
    for (const locale of locales) {
      const html = card(locale);
      expect(html, locale).toContain('data-testid="security-enrolment"');
      expect(html).toContain(escape(text(locale, "enr_title")));
      expect(html).not.toContain('data-testid="enrolment-qr"');
      expect(html).not.toContain("data:image/svg+xml");
    }
  });

  it("has its own words in every language, translated and not left in English", () => {
    const keys = ["enr_title", "enr_help", "enr_make", "enr_remove", "enr_alt", "enr_valid", "enr_fingerprint", "enr_no_fingerprint", "enr_expired", "enr_name", "enr_address", "enr_save", "enr_bad_profile", "enr_err_not_found", "enr_err_invalid_origin", "enr_err_generic", "sec_opt_enrolment", "sec_opt_presence"];
    for (const key of keys) {
      const words = new Set<string>();
      for (const locale of locales) { const word = text(locale, key); expect(word, `${locale} ${key}`).not.toBe(key); words.add(word); }
      expect(words.size, key).toBeGreaterThan(5);
    }
  });
});
