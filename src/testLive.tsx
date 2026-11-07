/**
 * A small way to run a component for real in the tests (jsdom): it is mounted, its effects run, a stand-in for the server answers what it asks, and the test can click and read it.
 * Used only by the tests; it is left out of the coverage of the application.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

export type Mounted = { host: HTMLElement; settle: () => Promise<void>; click: (element: Element | null) => Promise<void>; unmount: () => Promise<void> };

export async function mount(element: ReactElement): Promise<Mounted> {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => { root.render(element); });
  const settle = async () => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); }); };
  await settle();
  return {
    host,
    settle,
    click: async target => { await act(async () => { target?.dispatchEvent(new MouseEvent("click", { bubbles: true })); }); await settle(); },
    unmount: async () => { await act(async () => { root.unmount(); }); host.remove(); },
  };
}

export type Answer = unknown | ((body: unknown) => unknown);
export type Call = { method: string; path: string; body: unknown };

/** Replaces fetch by a server that knows `"GET /path"` -> answer (or a function of the body); anything else is a 404. Returns the list of calls. */
export function fakeServer(routes: Record<string, Answer>): Call[] {
  const calls: Call[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit = {}) => {
    const path = new URL(url, "http://armor.local").pathname;
    const method = init.method ?? "GET";
    const body = init.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, path, body });
    const answer = routes[`${method} ${path}`];
    if (answer === undefined) return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify(typeof answer === "function" ? (answer as (body: unknown) => unknown)(body) : answer), { status: 200, headers: { "Content-Type": "application/json" } });
  }));
  return calls;
}
