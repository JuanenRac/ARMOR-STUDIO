import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import template from "../nginx/default.conf.template?raw";
import headers from "../nginx/security_headers.conf?raw";

/** The blocks `location ... { ... }` of the template, by their opening line. */
function locations(source: string): Map<string, string> {
  const found = new Map<string, string>();
  const opening = /^\s*location\s+([^{]+?)\s*\{/gm;
  for (let match = opening.exec(source); match; match = opening.exec(source)) {
    let depth = 1, end = opening.lastIndex;
    while (depth > 0 && end < source.length) { const char = source[end++]; if (char === "{") depth++; else if (char === "}") depth--; }
    found.set(match[1], source.slice(opening.lastIndex, end - 1));
  }
  return found;
}

describe("the nginx of the container", () => {
  const source = (template as string).replace(/\r\n/g, "\n");
  const blocks = locations(source);

  it("sends the security headers from one included file", () => {
    for (const name of ["Content-Security-Policy", "X-Content-Type-Options", "Referrer-Policy", "Cross-Origin-Opener-Policy", "Permissions-Policy"]) expect(headers as string).toContain(`add_header ${name} `);
  });
  it("includes them in every location that sets a header of its own (nginx drops the inherited ones otherwise)", () => {
    expect(blocks.size).toBeGreaterThan(3);
    for (const [name, body] of blocks) {
      if (/add_header\s/.test(body)) expect(body, `location ${name}`).toContain("include /etc/nginx/snippets/security_headers.conf;");
    }
  });
  it("does not set a header at the level of the server (it would be lost by the locations that set theirs)", () => {
    let outside = (template as string).replace(/\r\n/g, "\n");
    for (const body of blocks.values()) outside = outside.replace(body, "");
    expect(outside).not.toMatch(/add_header\s/);
  });
  it("trusts the protocol that a proxy in front announces by default and ignores it with ARMOR_STUDIO_OUTER_TLS_PROXY=0", () => {
    // The map is read the way nginx reads it: the first regular expression that matches wins, otherwise the default.
    const rows = [...source.matchAll(/^\s+(default|"~[^"]*")\s+(\S+);/gm)].map((row) => [row[1], row[2]]);
    const forwarded = (outer: string, header: string): string => {
      const key = `${outer}:${header}`;
      for (const [pattern, value] of rows) {
        if (pattern !== "default" && new RegExp(pattern.slice(2, -1)).test(key)) return value;
      }
      return rows.find(([pattern]) => pattern === "default")![1];
    };
    expect(forwarded("1", "https")).toBe("$http_x_forwarded_proto");
    expect(forwarded("1", "")).toBe("$scheme");
    expect(forwarded("0", "https")).toBe("$scheme");
    expect(forwarded("0", "")).toBe("$scheme");
    expect(forwarded("", "https"), "an empty value keeps the default").toBe("$http_x_forwarded_proto");
    expect(readFileSync(new URL("../Dockerfile", import.meta.url), "utf8")).toContain("ARMOR_STUDIO_OUTER_TLS_PROXY=1");
  });
  it("tells the real address of the client and the port of the host to the server", () => {
    const api = blocks.get("/api/") ?? "";
    expect(api).toContain("proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;");
    expect(api).toContain("proxy_set_header X-Forwarded-Proto $forwarded_proto;");
    expect(source).toMatch(/map "\$\{ARMOR_STUDIO_OUTER_TLS_PROXY\}:\$http_x_forwarded_proto" \$forwarded_proto \{\s+default \$http_x_forwarded_proto;\s+"~\^0:" +\$scheme;\s+"~:\$" +\$scheme;/);
    expect(api).toContain("proxy_set_header Host $http_host;");
    expect(api).toContain("$connection_upgrade");
  });
});
