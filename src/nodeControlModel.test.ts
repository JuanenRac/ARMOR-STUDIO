import { describe, expect, it } from "vitest";
import { locales, text } from "./i18n";
import type { NodeControlLine, NodeControlOperation, NodeHealthItem } from "./api";
import {
  actionsFor, buildAllRequest, buildNodeRequest, confirmMatches, confirmTarget, confirmWord, defaultDuration, durationRange, durationSeconds, dynamicKeys, errorKey, leftText, lineFinished,
  operationFinished, REFUSAL_CODES, refusalKey, reachableNodes, secondsLeft, stateChips, stepsOf, tally, timeline, warningKeys,
} from "./nodeControlModel";

const t = (language: Parameters<typeof text>[0]) => (key: string) => text(language, key);
const node = (extra: Partial<NodeHealthItem["report"]> = {}, stale = false): NodeHealthItem => ({
  node_id: "alarm-1", family: "alarm", firmware: "0.3.6", received_at: new Date(1_000_000).toISOString(), stale, status: stale ? "stale" : "ok", restarts_24h: 0, warnings: [],
  report: { kind: "node_health", node_id: "alarm-1", timestamp_ms: 1, family: "alarm", firmware: "0.3.6", uptime_s: 60, reset_reason: "power_on", heap_free: 100_000, heap_min: 90_000, link: "ethernet", link_up: true, broker_reconnects: 1, ...extra },
});
const line = (stage: NodeControlLine["stage"], extra: Partial<NodeControlLine> = {}): NodeControlLine => ({ node_id: "alarm-1", family: "alarm", stage, ...extra });

describe("the typed confirmation of an order", () => {
  it("asks for the name of the node for one node and the word for all of them, only for restart, pause and standby", () => {
    expect(confirmTarget("restart", "node", "radar-1")).toBe("radar-1");
    expect(confirmTarget("pause", "node", "radar-1")).toBe("radar-1");
    expect(confirmTarget("standby", "node", "radar-1")).toBe("radar-1");
    expect(confirmTarget("restart", "all", "")).toBe("RESTART");
    expect(confirmTarget("pause", "all", "")).toBe("PAUSE");
    expect(confirmTarget("standby", "all", "")).toBe("STANDBY");
    for (const operation of ["resume", "identify", "diagnostics", "maintenance_on", "maintenance_off"] as const) { expect(confirmTarget(operation, "node", "x")).toBeNull(); expect(confirmTarget(operation, "all", "")).toBeNull(); }
    expect(confirmWord("resume")).toBeNull();
  });
  it("accepts only exactly what is asked", () => {
    expect(confirmMatches("radar-1", "radar-1")).toBe(true);
    expect(confirmMatches("radar-1", "Radar-1")).toBe(false);
    expect(confirmMatches("radar-1", "radar-1 ")).toBe(false);
    expect(confirmMatches("RESTART", "restart")).toBe(false);
    expect(confirmMatches(null, "")).toBe(true);
  });
});

describe("the length of a pause, a maintenance window and an identification", () => {
  it("reads minutes for a pause and a maintenance and seconds for an identification, inside the ranges of the contract", () => {
    expect(durationSeconds("pause", "1")).toBe(60);
    expect(durationSeconds("pause", "60")).toBe(3600);
    expect(durationSeconds("pause", "61")).toBeNull();
    expect(durationSeconds("pause", "0")).toBeNull();
    expect(durationSeconds("pause", "1.5")).toBeNull();
    expect(durationSeconds("pause", "")).toBeNull();
    expect(durationSeconds("maintenance_on", "480")).toBe(28_800);
    expect(durationSeconds("maintenance_on", "481")).toBeNull();
    expect(durationSeconds("identify", "5")).toBe(5);
    expect(durationSeconds("identify", "300")).toBe(300);
    expect(durationSeconds("identify", "4")).toBeNull();
    expect(durationSeconds("restart", "5")).toBeNull();
  });
  it("starts from the defaults: an hour of pause (it always resumes by itself), an hour of maintenance and thirty seconds of identification", () => {
    expect(defaultDuration("pause")).toBe("60");
    expect(defaultDuration("maintenance_on")).toBe("60");
    expect(defaultDuration("identify")).toBe("30");
    expect(defaultDuration("restart")).toBe("");
    expect(durationRange("pause")).toEqual([1, 60]);
    expect(durationRange("maintenance_on")).toEqual([1, 480]);
    expect(durationRange("identify")).toEqual([5, 300]);
    expect(durationRange("standby")).toBeNull();
  });
});

describe("the request that is sent", () => {
  it("builds the request of one node with the name and the length, and none while they are wrong", () => {
    expect(buildNodeRequest("restart", "radar-1", "radar-1", "")).toEqual({ operation: "restart", confirm: "radar-1" });
    expect(buildNodeRequest("restart", "radar-1", "radar", "")).toBeNull();
    expect(buildNodeRequest("pause", "radar-1", "radar-1", "30")).toEqual({ operation: "pause", confirm: "radar-1", duration_s: 1800 });
    expect(buildNodeRequest("pause", "radar-1", "radar-1", "90")).toBeNull();
    expect(buildNodeRequest("standby", "radar-1", "radar-1", "")).toEqual({ operation: "standby", confirm: "radar-1" });
    expect(buildNodeRequest("resume", "radar-1", "", "")).toEqual({ operation: "resume" });
    expect(buildNodeRequest("identify", "radar-1", "", "20")).toEqual({ operation: "identify", duration_s: 20 });
    expect(buildNodeRequest("maintenance_on", "radar-1", "", "120")).toEqual({ operation: "maintenance_on", duration_s: 7200 });
    expect(buildNodeRequest("maintenance_off", "radar-1", "", "")).toEqual({ operation: "maintenance_off" });
  });
  it("builds the request for all with the word, the mode only for a restart and the length of a pause", () => {
    expect(buildAllRequest("restart", "rolling", "RESTART")).toEqual({ operation: "restart", mode: "rolling", confirm: "RESTART" });
    expect(buildAllRequest("restart", "now", "RESTART")).toEqual({ operation: "restart", mode: "now", confirm: "RESTART" });
    expect(buildAllRequest("restart", "rolling", "restart")).toBeNull();
    expect(buildAllRequest("standby", "rolling", "STANDBY")).toEqual({ operation: "standby", mode: "now", confirm: "STANDBY" });
    expect(buildAllRequest("pause", "rolling", "PAUSE", "10")).toEqual({ operation: "pause", mode: "now", confirm: "PAUSE", duration_s: 600 });
    expect(buildAllRequest("pause", "rolling", "PAUSE", "")).toBeNull();
    expect(buildAllRequest("resume", "rolling", "")).toEqual({ operation: "resume", mode: "now" });
  });
});

describe("the orders a node offers", () => {
  const list = (extra: Partial<NodeHealthItem["report"]>) => actionsFor(node(extra)).map(action => action.operation);
  it("offers pause and standby to a running node and resume (told Power on) to one in standby", () => {
    expect(list({})).toEqual(["pause", "standby", "restart", "identify", "diagnostics", "maintenance_on"]);
    expect(list({ control_state: "paused" })).toEqual(["resume", "standby", "restart", "identify", "diagnostics", "maintenance_on"]);
    expect(list({ control_state: "standby" })).toEqual(["resume", "restart", "identify", "diagnostics", "maintenance_on"]);
    expect(actionsFor(node({ control_state: "standby" }))[0].label).toBe("nc_op_poweron");
    expect(actionsFor(node({ control_state: "paused" }))[0].label).toBe("nc_op_resume");
  });
  it("offers to end the maintenance when it is on, and never anything that erases or resets", () => {
    expect(list({ maintenance: true })).toContain("maintenance_off");
    expect(list({ maintenance: true })).not.toContain("maintenance_on");
    for (const extra of [{}, { control_state: "standby" as const }, { maintenance: true }]) for (const operation of list(extra)) expect(operation).not.toMatch(/reset|erase|factory|sleep|off$/i.test(operation) && operation !== "maintenance_off" ? /./ : /^$/);
  });
  it("reaches only the nodes that reported lately with an order for all", () => {
    expect(reachableNodes([node(), node({}, true)])).toHaveLength(1);
  });
});

describe("the warnings that go with an order", () => {
  it("warns about about a minute unwatched for a restart, with a word more for the alarm panel and the radars", () => {
    expect(warningKeys("restart", "node", "solar", "now")).toEqual(["nc_warn_restart"]);
    expect(warningKeys("restart", "node", "alarm", "now")).toEqual(["nc_warn_restart", "nc_warn_alarm_restart"]);
    expect(warningKeys("restart", "node", "radar", "now")).toEqual(["nc_warn_restart", "nc_warn_radar_restart"]);
  });
  it("explains the two modes of a restart of all, and that rolling is the careful one", () => {
    expect(warningKeys("restart", "all", null, "now")).toEqual(["nc_warn_restart_all_now"]);
    expect(warningKeys("restart", "all", null, "rolling")).toEqual(["nc_warn_restart_all_rolling"]);
  });
  it("says the house is not protected when the alarm panel or a radar is paused or in standby, and what standby is", () => {
    expect(warningKeys("pause", "node", "alarm", "now")).toEqual(["nc_warn_unprotected", "nc_warn_alarm_stop"]);
    expect(warningKeys("standby", "node", "radar", "now")).toEqual(["nc_warn_unprotected", "nc_warn_radar_stop", "nc_standby_note"]);
    expect(warningKeys("pause", "node", "solar", "now")).toEqual(["nc_warn_unprotected"]);
    expect(warningKeys("pause", "all", null, "now")).toEqual(["nc_warn_all_stop"]);
    expect(warningKeys("standby", "all", null, "now")).toEqual(["nc_warn_all_stop", "nc_standby_note"]);
    expect(warningKeys("resume", "node", "alarm", "now")).toEqual([]);
    expect(warningKeys("maintenance_on", "node", "alarm", "now")).toEqual(["nc_warn_maintenance"]);
  });
  it("never calls standby a power-off in any language", () => {
    for (const language of locales) expect(text(language, "nc_standby_note").length, language).toBeGreaterThan(40);
    expect(text("en", "nc_standby_note")).toContain("never a power-off");
    expect(text("en", "nc_d_standby")).toContain("still connected");
  });
});

describe("the state chips of a node", () => {
  const now = 1_000_000 + 60_000;
  it("tells a pause with the time left, counted from the report", () => {
    const chips = stateChips(node({ control_state: "paused", control_until_s: 600 }), now, t("en"));
    expect(chips).toHaveLength(1);
    expect(chips[0].id).toBe("paused");
    expect(chips[0].text).toBe("Paused · 9 min left");
  });
  it("tells standby since when and by whom", () => {
    const chips = stateChips(node({ control_state: "standby", control_since_ms: 1_700_000_000_000, control_by: "maria" }), now, t("en"));
    expect(chips[0].id).toBe("standby");
    expect(chips[0].text).toContain("Standby since");
    expect(chips[0].text).toContain("by maria");
    expect(stateChips(node({ control_state: "standby", control_since_ms: 0 }), now, t("en"))[0].text).toBe("Standby");
  });
  it("tells the maintenance, besides the state, and nothing for a running node", () => {
    const chips = stateChips(node({ control_state: "paused", maintenance: true, maintenance_until_s: 3600 }), now, t("en"));
    expect(chips.map(chip => chip.id)).toEqual(["paused", "maintenance"]);
    expect(chips[1].text).toContain("Maintenance until");
    expect(stateChips(node({ control_state: "running" }), now, t("en"))).toEqual([]);
    expect(stateChips(node(), now, t("en"))).toEqual([]);
  });
  it("counts what is left of a window and writes it in short words", () => {
    expect(secondsLeft(600, new Date(1_000_000).toISOString(), 1_000_000 + 100_000)).toBe(500);
    expect(secondsLeft(10, new Date(1_000_000).toISOString(), 1_000_000 + 100_000)).toBe(0);
    expect(leftText(45, t("en"))).toBe("45 s");
    expect(leftText(600, t("en"))).toBe("10 min");
    expect(leftText(7500, t("en"))).toBe("2 h 05 min");
  });
});

describe("the reasons a node refuses and the errors of the server", () => {
  it("has a human sentence for every refusal in every language, and a general one for a code nobody knows", () => {
    for (const code of REFUSAL_CODES) for (const language of locales) { const key = refusalKey(code); expect(text(language, key), `${language} ${code}`).not.toBe(key); }
    expect(refusalKey("something_new")).toBe("nc_refusal_unknown");
    expect(refusalKey(undefined)).toBe("nc_refusal_unknown");
    expect(refusalKey("busy_update")).toBe("nc_refusal_busy_update");
  });
  it("maps the codes of the API, and the status when the code is missing", () => {
    expect(errorKey("elevation_required", 403)).toBe("nc_err_elevation_required");
    expect(errorKey("invalid_request", 400)).toBe("nc_err_invalid_request");
    expect(errorKey("unknown_node", 404)).toBe("nc_err_unknown_node");
    expect(errorKey("generic", 429)).toBe("nc_err_rate_limited");
    expect(errorKey("generic", 503)).toBe("nc_err_mqtt_unavailable");
    expect(errorKey("surprise", 500)).toBe("nc_err_generic");
  });
});

describe("the steps of an order on a node", () => {
  const states = (steps: ReturnType<typeof timeline>) => steps.map(step => `${step.id}:${step.state}`).join(" ");
  const created = "2000-01-01T00:00:00Z";
  it("goes sent, acknowledged, offline, back for a restart, with the times the server noted", () => {
    expect(stepsOf("restart")).toEqual(["sent", "acknowledged", "offline", "back"]);
    expect(states(timeline(line("pending"), "restart", created))).toBe("sent:current acknowledged:todo offline:todo back:todo");
    expect(states(timeline(line("sent"), "restart", created))).toBe("sent:done acknowledged:current offline:todo back:todo");
    expect(states(timeline(line("acknowledged", { acknowledged_at: "2000-01-01T00:00:02Z" }), "restart", created))).toBe("sent:done acknowledged:done offline:current back:todo");
    const back = timeline(line("back", { acknowledged_at: "2000-01-01T00:00:02Z", offline_at: "2000-01-01T00:00:05Z", back_at: "2000-01-01T00:00:40Z" }), "restart", created);
    expect(states(back)).toBe("sent:done acknowledged:done offline:done back:done");
    expect(back[3].at).toBe("2000-01-01T00:00:40Z");
    expect(back[0].at).toBe(created);
  });
  it("goes sent, applied for the other orders", () => {
    expect(stepsOf("pause")).toEqual(["sent", "applied"]);
    expect(states(timeline(line("armed"), "pause", created))).toBe("sent:current applied:todo");
    expect(states(timeline(line("applied", { applied_at: "2000-01-01T00:00:03Z" }), "standby", created))).toBe("sent:done applied:done");
  });
  it("marks where an order failed: a refusal at the start, no answer after the order went out, a node that did not come back at the end", () => {
    expect(states(timeline(line("refused", { refusal: "busy_update" }), "restart", created))).toBe("sent:failed acknowledged:todo offline:todo back:todo");
    expect(states(timeline(line("no_answer"), "pause", created))).toBe("sent:done applied:failed");
    expect(states(timeline(line("not_back"), "restart", created))).toBe("sent:done acknowledged:done offline:done back:failed");
  });
  it("knows when a node has finished, whatever the order", () => {
    expect(lineFinished(line("back"), "restart")).toBe(true);
    expect(lineFinished(line("offline"), "restart")).toBe(false);
    expect(lineFinished(line("applied"), "restart")).toBe(false);
    expect(lineFinished(line("applied"), "pause")).toBe(true);
    for (const stage of ["refused", "no_answer", "not_back"] as const) expect(lineFinished(line(stage), "restart")).toBe(true);
  });
  const order = (operation: NodeControlOperation["operation"], nodes: NodeControlLine[], state: NodeControlOperation["state"] = "running"): NodeControlOperation =>
    ({ id: "abcd1234", scope: "all", operation, mode: "rolling", actor: "juan", created_at: created, updated_at: created, state, nodes });
  it("counts how many nodes did it, are still under way and failed, and ends when all have finished", () => {
    const mixed = order("restart", [line("back"), line("offline", { node_id: "b" }), line("refused", { node_id: "c" })]);
    expect(tally(mixed)).toEqual({ done: 1, waiting: 1, failed: 1 });
    expect(operationFinished(mixed)).toBe(false);
    expect(operationFinished(order("restart", [line("back"), line("not_back", { node_id: "b" })]))).toBe(true);
    expect(operationFinished(order("restart", [line("offline")], "done"))).toBe(true);
    expect(operationFinished(order("restart", []))).toBe(false);
  });
});

describe("the sentences the screens build by name", () => {
  it("exist in the eight languages", () => {
    for (const language of locales) for (const key of dynamicKeys()) expect(text(language, key), `${language} ${key}`).not.toBe(key);
  });
  it("keep the same {placeholders} in every language", () => {
    const holes = (value: string) => (value.match(/\{\d+\}/g) ?? []).sort().join(",");
    for (const key of Object.keys(ROW_PROBE)) for (const language of locales) expect(holes(text(language, key)), `${language} ${key}`).toBe(holes(text("en", key)));
  });
});
const ROW_PROBE: Record<string, true> = Object.fromEntries(["nc_actions_for", "nc_title_node", "nc_title_all", "nc_reach", "nc_duration_bad", "nc_confirm_name", "nc_confirm_word", "nc_state_paused_left", "nc_state_standby_since",
  "nc_state_maint_until", "nc_by", "nc_progress_line", "nc_progress_done", "nc_back_after", "nc_firmware_change", "nc_until"].map(key => [key, true]));
