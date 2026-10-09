import { describe, expect, it } from "vitest";
import { ActionIcon, actionsFor, agentIdOf, familyKey, isActive, toneOf } from "./views/ServicesView";
import { servicesCatalogues } from "./servicesText";
import { LANGUAGE_ORDER } from "./catalogueRows";

describe("the services menu", () => {
  it("colours a state by what it means: green works, red is stopped, amber failed or starting, grey is not there", () => {
    expect(toneOf("running")).toBe("green"); expect(toneOf("online")).toBe("green");
    expect(toneOf("stopped")).toBe("red"); expect(toneOf("offline")).toBe("red");
    expect(toneOf("failed")).toBe("amber"); expect(toneOf("starting")).toBe("amber");
    expect(toneOf("not_installed")).toBe("slate"); expect(toneOf("unknown")).toBe("slate");
    expect(["running", "online"].every(state => isActive(state as never))).toBe(true);
    expect(["stopped", "failed", "unknown", "not_installed", "offline", "starting"].some(state => isActive(state as never))).toBe(false);
  });
  it("finds the translated name of a family", () => {
    expect(familyKey("AI and voice")).toBe("svcFamily_AI_and_voice");
    expect(servicesCatalogues.es[familyKey("Field nodes")]).toBe("Nodos de campo");
  });
  it("has every phrase in the seven languages, and a state label for every state", () => {
    for (const code of LANGUAGE_ORDER) {
      for (const key of Object.keys(servicesCatalogues.en)) expect(servicesCatalogues[code][key], `${code} ${key}`).toBeTruthy();
      for (const state of ["running", "paused", "stopped", "failed", "starting", "not_installed", "online", "offline", "unknown"]) expect(servicesCatalogues[code][`svcState_${state}`]).toBeTruthy();
    }
  });
});

describe("the buttons of a program", () => {
  it("offers what makes sense in each state, and never pauses the console itself", () => {
    expect(actionsFor("running", "mosquitto")).toEqual(["stop", "restart", "pause"]);
    expect(actionsFor("paused", "mosquitto")).toEqual(["resume", "stop", "restart"]);
    expect(actionsFor("stopped", "voice")).toEqual(["start"]);
    expect(actionsFor("failed", "network")).toEqual(["start"]);
    expect(actionsFor("starting", "ai")).toEqual(["stop", "restart"]);
    expect(actionsFor("running", "server")).toEqual(["stop", "restart"]);
    expect(actionsFor("running", "studio")).toEqual(["stop", "restart"]);
    expect(actionsFor("not_installed", "voice")).toEqual([]);
    expect(actionsFor("online", "x")).toEqual([]);
  });
  it("finds the administration agent's id of a catalogue unit", () => {
    const agent = [{ id: "mosquitto", unit: "armor-mosquitto", description: "", installed: true, active: "active", sub: "running", enabled: "enabled", pid: 1, since: "" }];
    expect(agentIdOf("armor-mosquitto.service", agent)).toBe("mosquitto");
    expect(agentIdOf("armor-other.service", agent)).toBeUndefined();
    expect(agentIdOf(undefined, agent)).toBeUndefined();
  });
  it("has the words of every button and every confirmation in the seven languages", () => {
    for (const code of LANGUAGE_ORDER) {
      for (const action of ["start", "stop", "restart", "pause", "resume"]) {
        expect(servicesCatalogues[code][`svcBtn_${action}`], `${code} ${action}`).toBeTruthy();
        expect(servicesCatalogues[code][`svcDone_${action}`], `${code} done ${action}`).toBeTruthy();
      }
      for (const key of ["svcAsk_stop", "svcAsk_stop_console", "svcAsk_restart", "svcAsk_restart_console", "svcAsk_pause"]) expect(servicesCatalogues[code][key], `${code} ${key}`).toBeTruthy();
    }
  });
});

describe("the pictures of the buttons", () => {
  it("has one for every action", () => {
    for (const action of ["start", "stop", "restart", "pause", "resume"] as const) expect(ActionIcon({ action }), action).toBeTruthy();
  });
});
