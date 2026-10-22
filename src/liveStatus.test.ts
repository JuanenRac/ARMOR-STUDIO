import { describe, expect, it } from "vitest";
import { eventsUrl, LIVE_POLL_MS, POLL_MS, retryDelay, stateOf } from "./liveStatus";

describe("the address of the live channel", () => {
  it("is the address of the server with ws for http and wss for https", () => {
    expect(eventsUrl("http://192.168.0.180:18080")).toBe("ws://192.168.0.180:18080/api/v1/events");
    expect(eventsUrl("https://armor.example.org/")).toBe("wss://armor.example.org/api/v1/events");
  });
  it("follows the page when the origin is the page itself (an empty origin)", () => {
    expect(eventsUrl("", "https://studio.example.org/x")).toBe("wss://studio.example.org/api/v1/events");
    expect(eventsUrl("", "http://127.0.0.1:5178/")).toBe("ws://127.0.0.1:5178/api/v1/events");
  });
  it("is nothing for what is not an http address", () => {
    expect(eventsUrl("ftp://host")).toBeNull();
    expect(eventsUrl("javascript:alert(1)")).toBeNull();
  });
});

describe("what the live channel says", () => {
  const state = { mode: "armed", revision: 7, updated_at: "t", nodes: {} };
  it("takes a state message", () => {
    expect(stateOf(JSON.stringify({ type: "state", state }))).toEqual(state);
  });
  it("ignores everything else: other kinds, a state of no mode or no revision, text that is not JSON, binary data and a huge message", () => {
    expect(stateOf(JSON.stringify({ type: "hello", state }))).toBeNull();
    expect(stateOf(JSON.stringify({ type: "state" }))).toBeNull();
    expect(stateOf(JSON.stringify({ type: "state", state: { mode: "open", revision: 1 } }))).toBeNull();
    expect(stateOf(JSON.stringify({ type: "state", state: { mode: "armed", revision: "1" } }))).toBeNull();
    expect(stateOf("not json")).toBeNull();
    expect(stateOf("null")).toBeNull();
    expect(stateOf(new ArrayBuffer(4))).toBeNull();
    expect(stateOf("x".repeat(5 * 1024 * 1024))).toBeNull();
  });
});

describe("the wait before trying the live channel again", () => {
  it("starts at two seconds, doubles and stops at a minute", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 20].map(retryDelay)).toEqual([2000, 4000, 8000, 16000, 32000, 60000, 60000, 60000]);
    expect(retryDelay(0)).toBe(2000);
  });
  it("asks much less often while the channel is open than without it", () => {
    expect(LIVE_POLL_MS).toBeGreaterThanOrEqual(POLL_MS * 5);
  });
});
