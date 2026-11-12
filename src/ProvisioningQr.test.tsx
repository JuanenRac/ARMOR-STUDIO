import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { locales, text } from "./i18n";
import { buildProvisioning, parseProvisioning, provisioningSvg } from "./provisioningCode";
import { ProvisionScanner, ProvisioningQr, readQr } from "./ProvisioningQr";

const qr = (locale: (typeof locales)[number], nodeId: string, server: string) => renderToStaticMarkup(createElement(ProvisioningQr, { t: key => text(locale, key), nodeId, server }));
const scanner = (locale: (typeof locales)[number]) => renderToStaticMarkup(createElement(ProvisionScanner, { t: key => text(locale, key), onRead: () => undefined, onClose: () => undefined }));
const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

describe("the pairing code of a node", () => {
  it("is drawn from the node and the server, with its picture and its help in every language", () => {
    for (const locale of locales) {
      const html = qr(locale, "radar-1", "https://armor.local:8443");
      expect(html, locale).toContain('class="provision-qr"');
      expect(html).toContain(`alt="${escape(text(locale, "adm_qr_alt"))}"`);
      expect(html).toContain(escape(text(locale, "adm_qr_help")));
      expect(html).toContain('width="220"');
      expect(html).toContain("data:image/svg+xml;utf8,");
      expect(html).not.toContain(escape(text(locale, "adm_qr_invalid")));
    }
  });

  it("holds exactly the picture of the text that the shared library writes, and no secret", () => {
    const html = qr("en", "radar-1", "https://armor.local:8443/");
    const written = buildProvisioning("radar-1", "https://armor.local:8443/");
    expect(written).not.toBeNull();
    const picture = `data:image/svg+xml;utf8,${encodeURIComponent(provisioningSvg(written as string))}`;
    expect(html).toContain(escape(picture));
    expect(parseProvisioning(written)).toEqual({ node_id: "radar-1", server: "https://armor.local:8443" });
    expect(decodeURIComponent(picture)).not.toMatch(/password|token|secret/i);
  });

  it("is not drawn, and says why, when the node or the server is not valid", () => {
    for (const [nodeId, server] of [["", "https://armor.local"], ["Radar", "https://armor.local"], ["radar-1", ""], ["radar-1", "https://user:pw@armor.local"], ["radar-1", "ftp://armor.local"], ["x".repeat(65), "https://armor.local"]]) {
      for (const locale of locales) {
        const html = qr(locale, nodeId, server);
        expect(html, `${nodeId} ${server} ${locale}`).toContain(escape(text(locale, "adm_qr_invalid")));
        expect(html).not.toContain("<img");
      }
    }
  });
});

describe("the reader of the pairing code", () => {
  it("shows the camera, the choice of a picture and the way out, in every language, with no message before anything is read", () => {
    for (const locale of locales) {
      const html = scanner(locale);
      expect(html, locale).toContain("<video");
      expect(html).toContain('type="file"');
      expect(html).toContain('accept="image/*"');
      expect(html).toContain(escape(text(locale, "adm_qr_from_picture")));
      expect(html).toContain(`>${escape(text(locale, "close"))}</button>`);
      expect(html).not.toContain('role="status"');
    }
  });

  it("finds no code in a picture that has none, whatever its size", () => {
    for (const [width, height] of [[1, 1], [21, 21], [64, 48], [200, 200]]) {
      const white = { data: new Uint8ClampedArray(width * height * 4).fill(255), width, height } as ImageData;
      expect(readQr(white), `${width}x${height} white`).toBeNull();
      const black = { data: new Uint8ClampedArray(width * height * 4).map((_, index) => (index % 4 === 3 ? 255 : 0)), width, height } as ImageData;
      expect(readQr(black), `${width}x${height} black`).toBeNull();
    }
  });

  it("has the phrases of the code and the reader in all eight languages, each translated", () => {
    const ids = ["adm_qr_show", "adm_qr_scan", "adm_qr_alt", "adm_qr_help", "adm_qr_invalid", "adm_qr_not_ours", "adm_qr_no_camera", "adm_qr_none_found", "adm_qr_from_picture"];
    for (const id of ids) {
      for (const locale of locales) expect(text(locale, id), `${locale} ${id}`).not.toBe(id);
      if (!/^adm_qr_(show|scan)$/.test(id)) expect(new Set(locales.map(locale => text(locale, id))).size, id).toBeGreaterThan(5);
    }
  });
});
