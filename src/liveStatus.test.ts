import { describe, expect, it } from "vitest";
import { emitNotice, eventsUrl, LIVE_POLL_MS, NOTICE_TYPES, noticeOf, onNotice, POLL_MS, retryDelay, stateOf } from "./liveStatus";

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

describe("the small notices of the live channel", () => {
  it("takes a notice of a known kind with its id and version, and nothing else", () => {
    for (const type of NOTICE_TYPES) expect(noticeOf(JSON.stringify({ type, id: "alm-00001", version: 12 }))).toEqual({ type, id: "alm-00001", version: 12 });
    expect(noticeOf(JSON.stringify({ type: "alarm", id: "a", version: 1, detail: "not kept" }))).toEqual({ type: "alarm", id: "a", version: 1 });
  });
  it("ignores the state, a kind it does not know, a notice with a missing or wrong field, text that is not JSON and a huge message", () => {
    expect(noticeOf(JSON.stringify({ type: "state", state: {} }))).toBeNull();
    expect(noticeOf(JSON.stringify({ type: "weather", id: "x", version: 1 }))).toBeNull();
    for (const bad of [{ type: "alarm", version: 1 }, { type: "alarm", id: 5, version: 1 }, { type: "alarm", id: "a" }, { type: "alarm", id: "a", version: "1" }, { type: "alarm", id: "a", version: null }, { type: "alarm", id: "x".repeat(65), version: 1 }]) {
      expect(noticeOf(JSON.stringify(bad)), JSON.stringify(bad)).toBeNull();
    }
    expect(noticeOf("not json")).toBeNull();
    expect(noticeOf("null")).toBeNull();
    expect(noticeOf(new ArrayBuffer(4))).toBeNull();
    expect(noticeOf("x".repeat(2000))).toBeNull();
  });
  it("tells every listener, stops telling one that left, and one that fails does not stop the others", () => {
    const heard: string[] = [];
    const stopA = onNotice(notice => heard.push(`a:${notice.id}`));
    const stopB = onNotice(() => { throw new Error("a screen that fails"); });
    const stopC = onNotice(notice => heard.push(`c:${notice.id}`));
    emitNotice({ type: "device", id: "lamp", version: 1 });
    expect(heard).toEqual(["a:lamp", "c:lamp"]);
    stopA();
    emitNotice({ type: "device", id: "door", version: 2 });
    expect(heard).toEqual(["a:lamp", "c:lamp", "c:door"]);
    stopB(); stopC();
    emitNotice({ type: "device", id: "none", version: 3 });
    expect(heard.length).toBe(3);
  });
});
