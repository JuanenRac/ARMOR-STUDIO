import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { IgnoreProposalsCard } from "./IgnoreProposalsCard";
import { proposalRects, proposalsShown } from "./ignoreProposalsView";
import { locales, text } from "./i18n";
import type { IgnoreProposals } from "./api/contract/armor-rest";

const answer = (proposals: unknown): IgnoreProposals => ({ proposals }) as unknown as IgnoreProposals;
const zone = { x: 0.1, y: 0.2, w: 0.3, h: 0.2 };

describe("what the card of the proposed areas to ignore shows", () => {
  it("lists the cameras with something proposed by name and leaves out the rest", () => {
    const shown = proposalsShown(answer([
      { camera_id: "b", camera_name: "Yard", zones: [zone] },
      { camera_id: "a", camera_name: "Gate", zones: [zone, zone] },
      { camera_id: "c", camera_name: "Empty", zones: [] },
      { camera_id: "", camera_name: "No id", zones: [zone] },
    ]));
    expect(shown.map(item => `${item.cameraName}:${item.rects.length}`)).toEqual(["Gate:2", "Yard:1"]);
  });

  it("drops a rectangle that is not inside the picture and survives a missing list", () => {
    const shown = proposalsShown(answer([{ camera_id: "a", camera_name: "Gate", zones: [zone, { x: 0.9, y: 0, w: 0.5, h: 0.1 }, { x: 0, y: 0, w: 0, h: 0.1 }] }]));
    expect(shown[0]?.rects).toEqual([zone]);
    expect(proposalsShown({} as unknown as IgnoreProposals)).toEqual([]);
  });

  it("scales the rectangles to the drawing", () => {
    expect(proposalRects([zone], 160, 90)).toEqual([{ x: 16, y: 18, w: 48, h: 18 }]);
  });
});

describe("the card and the switches in every language", () => {
  it("renders with its title and its refresh button before the first answer", () => {
    const html = renderToStaticMarkup(createElement(IgnoreProposalsCard, { t: (key: string) => key, origin: "http://localhost" }));
    expect(html).toContain("ipc_title");
    expect(html).toContain("ignore-proposals-refresh");
    expect(html).toContain("ignore-proposals-none");
  });

  it("has every phrase in the eight languages, translated and not repeated", () => {
    const ids = ["sec_opt_aispatial", "sec_opt_aispatial_help", "sec_opt_aispatial_warn", "sec_opt_ailearn", "sec_opt_ailearn_help", "sec_opt_ailearn_warn", "ipc_title", "ipc_help", "ipc_none", "ipc_accept", "ipc_reject", "ipc_accepted", "ipc_rejected", "ipc_err_not_found", "ipc_err_status_400", "ipc_err_generic"];
    for (const id of ids) {
      const words = new Set<string>();
      for (const locale of locales) {
        const phrase = text(locale, id);
        expect(phrase.trim().length, `${locale} ${id}`).toBeGreaterThan(1);
        expect(phrase, `${locale} ${id} is not the key`).not.toBe(id);
        words.add(phrase);
      }
      expect(words.size, `${id} is translated, not repeated`).toBe(8);
    }
    for (const locale of locales) expect(text(locale, "ipc_accepted"), locale).toContain("{0}");
  });
});
