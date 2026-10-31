/**
 * Starting points for the alarm drawing (a flat, a shop, a warehouse with its perimeter). Each one is a data file (templates/*.json) checked against templates/template.schema.json; there is
 * no drawing logic here, only the check of a file against its schema and the way a template becomes a design: the texts are keys that the console translates, and the result goes through
 * the same reader as any design that comes back from the server, so it can never hold what a design may not.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import schema from "./templates/template.schema.json";
import flat from "./templates/flat.json";
import shop from "./templates/shop.json";
import warehouse from "./templates/warehouse.json";
import { ALARM_DESIGN_SCHEMA, parseAlarmDoc } from "./sync";
import type { Design } from "./model";

export type AlarmTemplate = {
  schema: string; id: string; version: number; titleKey: string; descriptionKey: string;
  design: {
    elements: Array<{ id: string; kind: string; x: number; y: number; nameKey?: string; locationKey?: string; props?: Record<string, string | number> }>;
    wires: Array<{ id: string; from: { element: string; port: string }; to: { element: string; port: string } }>;
    frames: Array<{ id: string; nameKey: string; x: number; y: number; w: number; h: number; colour: string }>;
  };
};

type Node = Record<string, unknown>;
const isObject = (value: unknown): value is Node => typeof value === "object" && value !== null && !Array.isArray(value);

/** The part of JSON Schema the template schema uses: type, const, enum, pattern, minimum, maximum, minLength, minItems, maxItems, required, properties, additionalProperties, items and local $ref. */
export function validateAgainst(value: unknown, node: Node, root: Node, path = "$"): string[] {
  if (typeof node.$ref === "string") {
    const target = node.$ref.replace(/^#\//, "").split("/").reduce<unknown>((current, key) => (isObject(current) ? current[key] : undefined), root);
    return isObject(target) ? validateAgainst(value, target, root, path) : [`${path}: unknown reference`];
  }
  const errors: string[] = [];
  if ("const" in node && value !== node.const) errors.push(`${path}: must be ${JSON.stringify(node.const)}`);
  if (Array.isArray(node.enum) && !node.enum.includes(value)) errors.push(`${path}: not one of the allowed values`);
  const kind = node.type;
  if (kind === "string") {
    if (typeof value !== "string") return [...errors, `${path}: must be a string`];
    if (typeof node.minLength === "number" && value.length < node.minLength) errors.push(`${path}: too short`);
    if (typeof node.pattern === "string" && !new RegExp(node.pattern).test(value)) errors.push(`${path}: does not match its pattern`);
  } else if (kind === "number" || kind === "integer") {
    if (typeof value !== "number" || !Number.isFinite(value) || (kind === "integer" && !Number.isInteger(value))) return [...errors, `${path}: must be a ${kind}`];
    if (typeof node.minimum === "number" && value < node.minimum) errors.push(`${path}: below the minimum`);
    if (typeof node.maximum === "number" && value > node.maximum) errors.push(`${path}: above the maximum`);
  } else if (kind === "array") {
    if (!Array.isArray(value)) return [...errors, `${path}: must be a list`];
    if (typeof node.minItems === "number" && value.length < node.minItems) errors.push(`${path}: too few items`);
    if (typeof node.maxItems === "number" && value.length > node.maxItems) errors.push(`${path}: too many items`);
    if (isObject(node.items)) value.forEach((item, index) => errors.push(...validateAgainst(item, node.items as Node, root, `${path}[${index}]`)));
  } else if (kind === "object") {
    if (!isObject(value)) return [...errors, `${path}: must be an object`];
    const properties = isObject(node.properties) ? node.properties : {};
    for (const key of Array.isArray(node.required) ? node.required : []) if (!(key in value)) errors.push(`${path}.${String(key)}: missing`);
    for (const [key, child] of Object.entries(value)) {
      if (key in properties && isObject(properties[key])) errors.push(...validateAgainst(child, properties[key] as Node, root, `${path}.${key}`));
      else if (node.additionalProperties === false) errors.push(`${path}.${key}: not allowed`);
    }
  }
  return errors;
}

export const templateErrors = (template: unknown): string[] => validateAgainst(template, schema as Node, schema as Node);

export const TEMPLATES: readonly AlarmTemplate[] = [flat, shop, warehouse] as unknown as AlarmTemplate[];

/** The design a template makes in a language: its keys translated, then read like any stored design. Undefined when the template is not valid. */
export function designFromTemplate(template: AlarmTemplate, t: (key: string) => string): Design | undefined {
  if (templateErrors(template).length > 0) return undefined;
  const elements = template.design.elements.map(({ nameKey, locationKey, props, ...rest }) => ({ ...rest, name: nameKey ? t(nameKey) : "", props: { ...(props ?? {}), ...(locationKey ? { location: t(locationKey) } : {}) } }));
  const frames = template.design.frames.map(({ nameKey, ...rest }) => ({ ...rest, name: t(nameKey) }));
  return parseAlarmDoc({ schema: ALARM_DESIGN_SCHEMA, elements, wires: template.design.wires, frames });
}
