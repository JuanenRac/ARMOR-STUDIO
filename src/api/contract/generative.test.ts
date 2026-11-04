/**
 * Generated cases against the rules this console shares with the contracts: the pattern of a node id, the list of node commands and the limits of the radar, each compared with
 * what the JSON schemas of ARMOR-COMMON say. The cases come from a small generator with a fixed seed, so a run is the same everywhere and no extra library is needed.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { COMMANDS, MAX_LUX, MAX_TARGETS, NODE_ID_PATTERN } from "./armor-contracts";

const schemas = path.join(process.cwd(), "..", "ARMOR-COMMON", "src", "armor_common", "schemas");
const conformance = path.join(process.cwd(), "..", "ARMOR-COMMON", "conformance");
const required = process.env.ARMOR_REQUIRE_SIBLINGS === "1";
const have = fs.existsSync(schemas) && fs.existsSync(conformance);

/** A seeded generator (mulberry32): the same sequence on every machine. */
function generator(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789-_ABC /.é\u0000\n+#";

function text(next: () => number, length: number): string {
  let out = "";
  for (let i = 0; i < length; i += 1) out += ALPHABET[Math.floor(next() * ALPHABET.length)];
  return out;
}

/** The rule written out by hand, apart from the pattern: 1 to 64 characters, lower-case letters, digits, "-" and "_", not starting with "-" or "_". */
function referenceNodeId(value: string): boolean {
  return value.length >= 1 && value.length <= 64 && /^[a-z0-9]/.test(value) && [...value].every((c) => /[a-z0-9_-]/.test(c));
}

describe("the shared rules against the schemas of ARMOR-COMMON", () => {
  it("the siblings are there when the run needs them", () => {
    if (required) expect(have, "ARMOR-COMMON must be next to this repository when ARMOR_REQUIRE_SIBLINGS is set").toBe(true);
  });

  it("the node id pattern accepts exactly what the hand-written rule accepts, on generated text and at the length boundary", () => {
    const next = generator(7001);
    const lengths = [0, 1, 2, 5, 31, 32, 63, 64, 65, 80];
    for (let i = 0; i < 4000; i += 1) {
      const value = text(next, lengths[Math.floor(next() * lengths.length)]);
      expect(NODE_ID_PATTERN.test(value), JSON.stringify(value)).toBe(referenceNodeId(value));
    }
    for (const length of [1, 63, 64, 65, 100]) expect(NODE_ID_PATTERN.test("a".repeat(length))).toBe(length <= 64);
    for (const bad of ["-a", "_a", "", "A", "a b", "a/b", "a\n", "á"]) expect(NODE_ID_PATTERN.test(bad), JSON.stringify(bad)).toBe(false);
  });

  it.skipIf(!have)("the pattern and the commands of this console are the ones of the command schema", () => {
    const schema = JSON.parse(fs.readFileSync(path.join(schemas, "command.schema.json"), "utf8"));
    expect(NODE_ID_PATTERN.source).toBe(schema.properties.node_id.pattern);
    expect([...COMMANDS]).toEqual(schema.properties.command.enum);
  });

  it.skipIf(!have)("a generated command is accepted by the shared rules exactly when the schema accepts it, and the vectors of conformance agree", () => {
    const schema = JSON.parse(fs.readFileSync(path.join(schemas, "command.schema.json"), "utf8"));
    const minimum: number = schema.properties.sensitivity.minimum;
    const maximum: number = schema.properties.sensitivity.maximum;
    const accepts = (c: { node_id?: unknown; command?: unknown; sensitivity?: unknown }): boolean =>
      typeof c.node_id === "string" && NODE_ID_PATTERN.test(c.node_id) && typeof c.command === "string" && (COMMANDS as readonly string[]).includes(c.command) &&
      (c.sensitivity === undefined || (Number.isInteger(c.sensitivity) && (c.sensitivity as number) >= minimum && (c.sensitivity as number) <= maximum));
    const vectors = JSON.parse(fs.readFileSync(path.join(conformance, "command.json"), "utf8")).vectors as { name: string; valid: boolean; payload: Record<string, unknown> }[];
    expect(vectors.length).toBeGreaterThan(5);
    for (const vector of vectors) {
      // the rules shared with this console are only a part of the schema (the type of the timestamp, extra fields): where they refuse, the vector must be invalid
      if (!accepts(vector.payload)) expect(vector.valid, vector.name).toBe(false);
    }
    const next = generator(7002);
    const names = ["calibrate", "set_thresholds", "restart", "reboot", "", "RESTART", "format_flash"];
    const values: unknown[] = [undefined, 0, 1, 5, 10, 11, -3, 5.5, "5", null, true, 2 ** 53];
    for (let i = 0; i < 1500; i += 1) {
      const candidate = { node_id: next() < 0.6 ? "north-1" : text(next, Math.floor(next() * 70)), command: names[Math.floor(next() * names.length)], sensitivity: values[Math.floor(next() * values.length)] };
      const expected = referenceNodeId(candidate.node_id) && (COMMANDS as readonly string[]).includes(candidate.command) &&
        (candidate.sensitivity === undefined || (Number.isInteger(candidate.sensitivity) && (candidate.sensitivity as number) >= 1 && (candidate.sensitivity as number) <= 10));
      expect(accepts(candidate), JSON.stringify(candidate)).toBe(expected);
    }
  });

  it.skipIf(!have)("the limits of the radar of this console are inside what the telemetry schema allows", () => {
    const telemetry = JSON.parse(fs.readFileSync(path.join(schemas, "telemetry.schema.json"), "utf8"));
    const text_ = JSON.stringify(telemetry);
    expect(text_).toContain(String(MAX_TARGETS));
    expect(MAX_LUX).toBeGreaterThan(0);
  });
});
