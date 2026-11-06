import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProvisioningQr } from "./ProvisioningQr";
import { buildProvisioning, provisioningSvg } from "./provisioningCode";

const t = (key: string) => `[${key}]`;

describe("the pairing code shown in the form that adds a node", () => {
  it("is drawn from the node and the server, as a picture of the same SVG the reader is tested with", () => {
    const html = renderToStaticMarkup(createElement(ProvisioningQr, { t, nodeId: "radar-1", server: "https://armor.local:8443" }));
    const text = buildProvisioning("radar-1", "https://armor.local:8443")!;
    expect(html).toContain("<img");
    expect(html).toContain(encodeURIComponent(provisioningSvg(text)).slice(0, 80));
    expect(html).toContain("[adm_qr_alt]");
    expect(html).toContain("[adm_qr_help]");
    expect(html).not.toContain("adm_qr_invalid");
  });

  it("is not drawn for a node name or a server that would not be accepted, and says so", () => {
    for (const bad of [{ nodeId: "Bad Node", server: "https://armor.local" }, { nodeId: "", server: "https://armor.local" }, { nodeId: "radar-1", server: "" }, { nodeId: "radar-1", server: "javascript:alert(1)" }]) {
      const html = renderToStaticMarkup(createElement(ProvisioningQr, { t, ...bad }));
      expect(html, JSON.stringify(bad)).not.toContain("<img");
      expect(html).toContain("[adm_qr_invalid]");
    }
  });

  it("holds no secret: only the node and the address of the server are in the code", () => {
    const text = buildProvisioning("radar-1", "https://armor.local")!;
    expect(JSON.parse(text.replace(/^armor-provision:/, ""))).toEqual({ v: 1, node_id: "radar-1", server: "https://armor.local" });
  });
});
