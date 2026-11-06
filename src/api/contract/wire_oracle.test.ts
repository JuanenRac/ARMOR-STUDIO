/**
 * The parsers that ARMOR-COMMON generates from its JSON Schemas (armor-parsers.ts, a copy of the generated file) against the seeded cases of the shared contracts: the valid vectors and
 * mutations of them, each with the verdict of the Python validator. The copy must be what ARMOR-COMMON generates now, and the parsers must say what the Python validator says.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkMessage, parseMessage, type MessageName } from "./armor-parsers";

const common = path.join(process.cwd(), "..", "ARMOR-COMMON");
const cases = path.join(common, "conformance", "wire_cases.tsv");
const generated = path.join(common, "generated", "armor-parsers.ts");
const required = process.env.ARMOR_REQUIRE_SIBLINGS === "1";
const have = fs.existsSync(cases) && fs.existsSync(generated);

describe("generated parsers", () => {
  it("has ARMOR-COMMON next to it when the run requires it", () => {
    if (required) expect(have).toBe(true);
  });

  it.skipIf(!have)("is the file ARMOR-COMMON generates now", () => {
    const norm = (text: string): string => text.replace(/\r\n/g, "\n");
    expect(norm(fs.readFileSync(path.join(__dirname, "armor-parsers.ts"), "utf8"))).toBe(norm(fs.readFileSync(generated, "utf8")));
  });

  it.skipIf(!have)("agrees with the Python validator on every seeded case", () => {
    const lines = fs.readFileSync(cases, "utf8").split("\n").filter(line => line !== "");
    expect(lines.length).toBeGreaterThan(500);
    const disagreements: string[] = [];
    lines.forEach((line, index) => {
      const first = line.indexOf("\t");
      const second = line.indexOf("\t", first + 1);
      const schema = line.slice(0, first);
      const valid = line[first + 1] === "1";
      const document: unknown = JSON.parse(line.slice(second + 1));
      if ((checkMessage(schema as MessageName, document) === undefined) !== valid) disagreements.push(`${index + 1} ${schema}`);
    });
    expect(disagreements).toEqual([]);
  });

  it("types a valid message and says where an invalid one is wrong", () => {
    const telemetry = { kind: "telemetry", node_id: "radar-1", timestamp_ms: 1, lux: 3, targets: [] };
    expect(parseMessage("telemetry", telemetry).node_id).toBe("radar-1");
    expect(() => parseMessage("telemetry", { ...telemetry, lux: -1 })).toThrow(/\/lux/);
    expect(() => parseMessage("telemetry", { node_id: "radar-1" })).toThrow(/is required/);
  });
});
