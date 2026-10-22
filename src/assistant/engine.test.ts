import { describe, expect, it } from "vitest";
import { text } from "../i18n";
import { HELP_SECTIONS } from "../helpText";
import { answer, normalize, ORDER, rankTopics, searchHelp, suggestions } from "./engine";
import { TOPICS } from "./knowledge";

const sections = HELP_SECTIONS.map(item => item.id);
const tOf = (language: (typeof ORDER)[number]) => (key: string) => text(language, key);

describe("the assistant's dictionary", () => {
  it("has every task complete in the eight languages", () => {
    expect(new Set(TOPICS.map(topic => topic.id)).size).toBe(TOPICS.length);
    for (const topic of TOPICS) {
      for (const list of [topic.kw, topic.q, topic.a]) {
        expect(list, topic.id).toHaveLength(8);
        for (const [index, item] of list.entries()) expect(item.trim().length, `${topic.id} ${ORDER[index]}`).toBeGreaterThan(3);
      }
      for (const [index, item] of topic.a.entries()) expect(item.length, `${topic.id} ${ORDER[index]}`).toBeGreaterThan(60);
      expect(sections.includes(topic.view) || ["configuration", "history", "record", "radar", "weather"].includes(topic.view), topic.id).toBe(true);
    }
  });

  it("finds each task by its keywords alone, in every language (without the help of the exact sample question)", () => {
    const wrong: string[] = [];
    for (const topic of TOPICS) {
      for (const [index, language] of ORDER.entries()) {
        const ranked = rankTopics(topic.q[index]!, false);
        if (ranked[0]?.topic.id !== topic.id) wrong.push(`${topic.id} ${language}: "${topic.q[index]}" -> ${ranked.slice(0, 3).map(item => `${item.topic.id}:${item.score}`).join(", ") || "nothing"}`);
      }
    }
    expect(wrong).toEqual([]);
  }, 30_000);   // ranks every task in every language: a slow machine needs more than the usual five seconds

  it("understands questions phrased in other words than the samples", () => {
    const cases: Array<[string, string]> = [
      ["switch on the alarm before I leave", "arm"], ["install the latest version", "updates"], ["show me the recordings of yesterday", "record"], ["the siren is on", "ack_alarm"],
      ["activar la alarma antes de salir", "arm"], ["hay una nueva versión disponible", "updates"], ["cuánta energía gasto", "electrical"], ["descargar el vídeo de la cámara", "record"],
      ["Alarmanlage aktivieren", "arm"], ["neue Version installieren", "updates"], ["Zugang verloren", "forgot_password"],
      ["mettre l'alarme avant de partir", "arm"], ["mot de passe oublié", "forgot_password"], ["attivare l'allarme", "arm"], ["ultima versione disponibile", "updates"],
      ["アラームを入れたい", "arm"], ["新しいバージョンに更新", "updates"], ["开启报警", "arm"], ["查看电费", "electrical"], ["ativar o alarme", "arm"], ["há uma nova versão", "updates"],
    ];
    const wrong = cases.filter(([question, id]) => rankTopics(question)[0]?.topic.id !== id).map(([question, id]) => `${question} -> ${rankTopics(question)[0]?.topic.id} (wanted ${id})`);
    expect(wrong).toEqual([]);
  });

  it("understands capitals, accents and punctuation as the same question", () => {
    expect(normalize("¿CÓMO ARMO la alarma?")).toBe("como armo la alarma");
    expect(rankTopics("¿CÓMO ARMO la alarma?")[0]?.topic.id).toBe("arm");
    expect(rankTopics("como   armo la   alarma!!")[0]?.topic.id).toBe("arm");
  });

  it("answers in the language of the interface whatever the language of the question", () => {
    const es = answer("How do I arm the alarm?", "es", sections, tOf("es"));
    expect(es.kind).toBe("topic");
    if (es.kind === "topic") { expect(es.topic.id).toBe("arm"); expect(es.text).toContain("Armar el sistema"); }
    const ja = answer("Wie schalte ich die Alarmanlage scharf?", "ja", sections, tOf("ja"));
    expect(ja.kind === "topic" && ja.text.includes("警戒")).toBe(true);
  });

  it("understands Japanese and Chinese, which have no spaces between words", () => {
    expect(rankTopics("アラームが鳴りました。止めるには？")[0]?.topic.id).toBe("ack_alarm");
    expect(rankTopics("怎么更新服务器")[0]?.topic.id).toBe("updates");
    expect(rankTopics("カメラを追加したい")[0]?.topic.id).toBe("add_camera");
  });

  it("tells the new things: Bluetooth PIN, Zigbee zones and the network node", () => {
    expect(rankTopics("what pin does bluetooth ask for")[0]?.topic.id).toBe("ble_pin");
    expect(rankTopics("link a zigbee sensor to a zone")[0]?.topic.id).toBe("zigbee_zones");
    expect(rankTopics("node does not answer")[0]?.topic.id).toBe("node_offline");
  });

  it("falls back to the Help when no task fits, and says so when nothing does", () => {
    const t = tOf("en");
    const paragraph = t("help_b_electrical").split("\n\n").find(item => item.length > 80) ?? "";
    const hit = searchHelp(paragraph.split(" ").slice(0, 9).join(" "), sections, t);
    expect(hit?.view).toBe("electrical");
    expect(answer("qwertyuiop asdfghjkl", "en", sections, t).kind).toBe("none");
    expect(answer("", "en", sections, t).kind).toBe("none");
  });

  it("greets and thanks", () => {
    expect(answer("hola", "es", sections, tOf("es")).kind).toBe("hello");
    expect(answer("gracias", "es", sections, tOf("es")).kind).toBe("thanks");
    expect(answer("こんにちは", "ja", sections, tOf("ja")).kind).toBe("hello");
  });

  it("offers a few different sample questions in each language", () => {
    for (const [index, language] of ORDER.entries()) {
      const first = suggestions(language, 3, 0), second = suggestions(language, 3, 1);
      expect(first).toHaveLength(3);
      expect(first.every(item => TOPICS.some(topic => topic.q[index] === item))).toBe(true);
      expect(second).not.toEqual(first);
    }
  });
});
