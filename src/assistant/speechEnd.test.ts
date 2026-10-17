// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { speakAssistant, speechSentences, stopAssistantSpeech } from "../alerts/sounds";
import { DEFAULT_ALERTS } from "../alerts/settings";

type Fake = { text: string; onstart?: () => void; onend?: () => void; onerror?: () => void };

/** A speech engine like the one of a browser: utterances are queued, cancel() ends the ones waiting AFTER the call (late events), and nothing ends unless the test says so. */
function installEngine() {
  const queue: Fake[] = [];
  const synth = {
    speaking: false, pending: false,
    speak: vi.fn((u: Fake) => { queue.push(u); synth.speaking = true; }),
    cancel: vi.fn(() => { const dropped = queue.splice(0); synth.speaking = false; synth.pending = false; setTimeout(() => dropped.forEach(u => u.onerror?.()), 0); }),
    getVoices: () => [],
  };
  class Utterance { text: string; lang = ""; pitch = 1; rate = 1; volume = 1; voice: unknown = null; onstart?: () => void; onend?: () => void; onerror?: () => void; constructor(text: string) { this.text = text; } }
  vi.stubGlobal("SpeechSynthesisUtterance", Utterance);
  Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
  return { synth, queue };
}

describe("the voice of the assistant", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { stopAssistantSpeech(); vi.useRealTimers(); vi.unstubAllGlobals(); });

  it("tells that it ended once, after the last sentence, so the mouth stops", () => {
    const { synth, queue } = installEngine();
    const onStart = vi.fn(), onEnd = vi.fn();
    speakAssistant("First sentence. Second sentence. Third one.", DEFAULT_ALERTS, "en", { onStart, onEnd });
    expect(queue).toHaveLength(3);
    queue[0].onstart?.(); expect(onStart).toHaveBeenCalledTimes(1);
    queue[0].onend?.(); queue[1].onend?.(); expect(onEnd).not.toHaveBeenCalled();
    queue[2].onend?.(); expect(onEnd).toHaveBeenCalledTimes(1);
    synth.speaking = false;
  });

  it("a text that replaces another one is not ended by the late events of the first one", async () => {
    const { queue } = installEngine();
    const onEnd = vi.fn();
    speakAssistant("Old text that is being read.", DEFAULT_ALERTS, "en", { onEnd });
    queue[0].onstart?.();
    speakAssistant("New text.", DEFAULT_ALERTS, "en", { onEnd });
    await vi.advanceTimersByTimeAsync(5);                 // the cancelled utterance reports its end now
    expect(onEnd).not.toHaveBeenCalled();                 // the new reading is still going
    queue[0].onstart?.(); queue[0].onend?.();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("ends the mouth even when the browser never says that it finished", async () => {
    const { synth, queue } = installEngine();
    const onEnd = vi.fn();
    speakAssistant("A text.", DEFAULT_ALERTS, "en", { onEnd });
    queue[0].onstart?.();
    synth.speaking = false; synth.pending = false;         // finished, but no event
    await vi.advanceTimersByTimeAsync(900);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("stopping it cuts the voice and nothing it reports afterwards matters", async () => {
    const { synth, queue } = installEngine();
    const onEnd = vi.fn();
    speakAssistant("A text.", DEFAULT_ALERTS, "en", { onEnd });
    const only = queue[0];
    stopAssistantSpeech();
    expect(synth.cancel).toHaveBeenCalled();
    only.onend?.(); await vi.advanceTimersByTimeAsync(900);
    expect(onEnd).not.toHaveBeenCalled();
  });

  it("cuts long text in sentences so the browser does not stop in the middle", () => {
    const long = "word ".repeat(120);
    const parts = speechSentences(`Hello there. ${long}. Bye!`);
    expect(parts[0]).toBe("Hello there.");
    expect(parts.every(part => part.length <= 220)).toBe(true);
    expect(parts.join(" ").replace(/\s+/g, " ")).toContain("Bye!");
  });
});
