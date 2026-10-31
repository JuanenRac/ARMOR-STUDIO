import { describe, expect, it } from "vitest";
import { TEMPLATES, designFromTemplate, templateErrors, validateAgainst } from "./templates";
import { analyse } from "./analysis";
import { kindDef, portOf, type Design } from "./model";
import { canConnect } from "./ops";
import { buildAlarmDoc, parseAlarmDoc } from "./sync";
import { locales, text } from "../i18n";

describe("alarm templates", () => {
  it("has a flat, a shop and a warehouse, each valid against the schema", () => {
    expect(TEMPLATES.map(template => template.id)).toEqual(["flat", "shop", "warehouse"]);
    for (const template of TEMPLATES) expect(templateErrors(template), template.id).toEqual([]);
  });

  it("refuses a file that does not follow the schema", () => {
    const good = TEMPLATES[0];
    expect(templateErrors({ ...good, extra: 1 })).not.toEqual([]);
    expect(templateErrors({ ...good, id: "Bad Id" })).not.toEqual([]);
    expect(templateErrors({ ...good, design: { ...good.design, frames: [{ ...good.design.frames[0], colour: "pink" }] } })).not.toEqual([]);
    expect(templateErrors({ ...good, design: { ...good.design, elements: [] } })).not.toEqual([]);
    expect(templateErrors(null)).not.toEqual([]);
    expect(validateAgainst(5, { type: "string" }, {})).not.toEqual([]);
  });

  it("makes a design that loses nothing when it is read like any stored design", () => {
    for (const template of TEMPLATES) {
      const design = designFromTemplate(template, key => key)!;
      expect(design, template.id).toBeDefined();
      expect(design.elements).toHaveLength(template.design.elements.length);
      expect(design.wires).toHaveLength(template.design.wires.length);
      expect(design.frames).toHaveLength(template.design.frames.length);
      // what the template says survives the reader (a value out of range would have been changed)
      for (const element of template.design.elements) for (const [key, value] of Object.entries(element.props ?? {})) expect(design.elements.find(item => item.id === element.id)!.props[key], `${template.id}/${element.id}/${key}`).toBe(value);
      expect(parseAlarmDoc(buildAlarmDoc(design))).toEqual(design);
    }
  });

  it("joins every port at most once unless the port takes many, and only ports that exist", () => {
    for (const template of TEMPLATES) {
      const design = designFromTemplate(template, key => key)!;
      const used = new Map<string, number>();
      for (const wire of design.wires) for (const end of [wire.from, wire.to]) {
        const element = design.elements.find(item => item.id === end.element)!;
        const port = portOf(element, end.port)!;
        expect(port, `${template.id} ${end.element}.${end.port}`).toBeDefined();
        const key = `${end.element}.${end.port}`;
        used.set(key, (used.get(key) ?? 0) + 1);
        if (!port.multi) expect(used.get(key), `${template.id} ${key}`).toBe(1);
      }
    }
  });

  it("can be drawn link by link with the rules of the designer", () => {
    for (const template of TEMPLATES) {
      const full = designFromTemplate(template, key => key)!;
      let design: Design = { ...full, wires: [] };
      for (const wire of full.wires) {
        expect(canConnect(design, wire.from, wire.to), `${template.id} ${wire.id}`).toBeUndefined();
        design = { ...design, wires: [...design.wires, wire] };
      }
    }
  });

  it("raises no error and leaves no sensor unlinked, with a panel, a siren and a supply", () => {
    for (const template of TEMPLATES) {
      const design = designFromTemplate(template, key => key)!;
      const { issues, totals } = analyse(design);
      expect(issues.filter(issue => issue.level === "error"), template.id).toEqual([]);
      expect(issues.filter(issue => issue.code === "sensor_unlinked" || issue.code === "unlinked"), template.id).toEqual([]);
      expect(totals.centrals).toBeGreaterThanOrEqual(1);
      expect(design.elements.some(element => kindDef(element.kind)?.category === "output")).toBe(true);
    }
  });

  it("puts no two elements in the same place", () => {
    for (const template of TEMPLATES) {
      const places = template.design.elements.map(element => `${element.x}:${element.y}`);
      expect(new Set(places).size, template.id).toBe(places.length);
    }
  });

  it("has every text in the eight languages and the names fit the drawing", () => {
    for (const template of TEMPLATES) {
      const keys = [template.titleKey, template.descriptionKey, ...template.design.elements.flatMap(element => [element.nameKey, element.locationKey]), ...template.design.frames.map(frame => frame.nameKey)].filter((key): key is string => !!key);
      for (const locale of locales) {
        for (const key of keys) expect(text(locale, key), `${locale}:${key}`).not.toBe(key);
        const design = designFromTemplate(template, key => text(locale, key))!;
        for (const element of design.elements) { expect(element.name.length).toBeLessThanOrEqual(60); if (typeof element.props.location === "string") expect(element.props.location.length, `${locale} ${element.id}`).toBeLessThanOrEqual(40); }
        for (const element of template.design.elements) if (element.locationKey) expect(design.elements.find(item => item.id === element.id)!.props.location, `${locale} ${element.id}`).toBe(text(locale, element.locationKey));
      }
    }
  });
});
