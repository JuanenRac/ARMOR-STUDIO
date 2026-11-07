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

/** Uses every control in a mounted component once: each field gets a new value, each list every option, each button a click. Used to run the handlers a person would reach. */
export async function pokeAll(host: HTMLElement): Promise<number> {
  let used = 0;
  const setNative = (element: HTMLInputElement | HTMLSelectElement, value: string) => {
    const proto = element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(element, value);
    element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
  };
  for (const input of [...host.querySelectorAll<HTMLInputElement>("input")]) {
    await act(async () => {
      if (input.type === "checkbox" || input.type === "radio") input.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      else if (input.type === "number" || input.type === "range") { setNative(input, String(Number(input.value || 0) + 1)); setNative(input, "0"); setNative(input, "-3"); setNative(input, ""); }
      else if (input.type === "color") setNative(input, "#336699");
      else setNative(input, "x");
    });
    used += 1;
  }
  for (const select of [...host.querySelectorAll<HTMLSelectElement>("select")]) {
    for (const option of [...select.options]) { await act(async () => { setNative(select, option.value); }); used += 1; }
  }
  for (const button of [...host.querySelectorAll<HTMLButtonElement>("button")]) {
    await act(async () => { button.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    used += 1;
  }
  return used;
}
