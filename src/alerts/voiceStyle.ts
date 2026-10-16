/**
 * The styles of the spoken voice: how fast and how high it speaks and the lines it adds before and after what it says. "Action hero" is quick, bright and sure of itself, with a touch of
 * sarcasm; "dark lord" is slow, deep and imposing; "theatrical" whispers coldly and then breaks into dramatic peaks, never the same way twice. The lines are our own, in the eight languages of the interface; no real person's voice or catchphrase is imitated. The browser's voice
 * is still the one the person picked, the style only changes its pace and pitch.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { VoiceStyle } from "./settings";

/** What a style does to the pace and the pitch of the voice (they multiply the age's). */
export const STYLE_VOICE: Record<VoiceStyle, { pitch: number; rate: number }> = { plain: { pitch: 1, rate: 1 }, hero: { pitch: 1.12, rate: 1.22 }, dark: { pitch: 0.55, rate: 0.82 }, chaos: { pitch: 1, rate: 1 } };

type Lines = readonly [readonly string[], readonly string[]];
const LINES: Record<Exclude<VoiceStyle, "plain">, Record<string, Lines>> = {
  hero: {
    en: [["Heads up, genius.", "Plot twist:"], ["Relax, I've got this.", "You're welcome."]],
    es: [["Atento, genio.", "Giro de guion:"], ["Tranquilo, lo tengo controlado.", "De nada."]],
    de: [["Aufgepasst, Genie.", "Plot-Twist:"], ["Entspann dich, ich hab das im Griff.", "Gern geschehen."]],
    fr: [["Attention, génie.", "Rebondissement :"], ["Détends-toi, je gère.", "De rien."]],
    it: [["Attento, genio.", "Colpo di scena:"], ["Rilassati, ci penso io.", "Di niente."]],
    ja: [["注目、天才さん。", "どんでん返しだ："], ["安心しろ、任せておけ。", "どういたしまして。"]],
    zh: [["注意了，天才。", "剧情反转："], ["放松，交给我。", "不客气。"]],
    pt: [["Atenção, génio.", "Reviravolta:"], ["Calma, eu trato disto.", "De nada."]],
  },
  dark: {
    en: [["Attention. The shadows report:", "Listen carefully."], ["Your move is awaited.", "Do not keep me waiting."]],
    es: [["Atención. Las sombras informan:", "Escucha con atención."], ["Se espera tu movimiento.", "No me hagas esperar."]],
    de: [["Achtung. Die Schatten melden:", "Hör genau zu."], ["Dein Zug wird erwartet.", "Lass mich nicht warten."]],
    fr: [["Attention. Les ombres rapportent :", "Écoute bien."], ["On attend ton geste.", "Ne me fais pas attendre."]],
    it: [["Attenzione. Le ombre riferiscono:", "Ascolta bene."], ["Si attende la tua mossa.", "Non farmi aspettare."]],
    ja: [["注意せよ。影が告げる：", "よく聞け。"], ["お前の一手を待っている。", "待たせるな。"]],
    zh: [["注意。暗影来报：", "仔细听着。"], ["等你的行动。", "别让我久等。"]],
    pt: [["Atenção. As sombras informam:", "Ouve com atenção."], ["A tua jogada é esperada.", "Não me faças esperar."]],
  },
  chaos: {
    en: [["Shh... listen.", "Ah, a little chaos..."], ["Funny, isn't it? Order is only a rumor.", "And now... you decide who laughs."]],
    es: [["Shh... escucha.", "Ah, un poco de caos..."], ["Qué gracioso, ¿verdad? El orden es solo un rumor.", "Y ahora... decide tú quién se ríe."]],
    de: [["Psst... hör zu.", "Ah, ein bisschen Chaos..."], ["Komisch, nicht? Ordnung ist nur ein Gerücht.", "Und nun... entscheide, wer lacht."]],
    fr: [["Chut... écoute.", "Ah, un peu de chaos..."], ["Drôle, non ? L'ordre n'est qu'une rumeur.", "Et maintenant... décide qui rira."]],
    it: [["Sss... ascolta.", "Ah, un po' di caos..."], ["Buffo, no? L'ordine è solo una voce.", "E ora... decidi tu chi ride."]],
    ja: [["しーっ...聞け。", "ああ、少しの混沌だ..."], ["おかしいだろう？秩序なんて噂にすぎない。", "さあ...誰が笑うかは君が決めろ。"]],
    zh: [["嘘......听着。", "啊，一点点混乱......"], ["有趣吧？秩序不过是个传闻。", "现在......由你决定谁来笑。"]],
    pt: [["Chiu... ouve.", "Ah, um pouco de caos..."], ["Engraçado, não é? A ordem é só um boato.", "E agora... decide tu quem se ri."]],
  },
};

let turn = 0;

/** The message with the style's lines around it (they take turns, so the same alarm is not always announced in the same words). The language is the speech language: "es-ES" -> "es". */
export function styledMessage(message: string, style: VoiceStyle, language: string, step: number = turn++): string {
  if (style === "plain") return message;
  const lines = LINES[style === "chaos" ? "chaos" : style][language.toLowerCase().split(/[-_]/)[0]!] ?? LINES[style].en!;
  const before = lines[0][step % lines[0].length]!, after = lines[1][Math.floor(step / lines[0].length) % lines[1].length]!;
  const separator = /^[\u3000-\u9fff]/.test(message) ? "" : " ";
  return `${before}${separator}${message}${/[.!?。！？]$/.test(message) ? "" : "."}${separator}${after}`;
}

/** One stretch of speech: what is said and how (pitch, pace and volume are multiplied by the age's and the person's). */
export type Part = { text: string; pitch: number; rate: number; volume: number };

/** What to say, in order. The theatrical style alternates a cold whisper (low, slow, quiet) with dramatic peaks (high, fast, loud), and which is which changes every time. */
export function speechParts(message: string, style: VoiceStyle, language: string, step: number = turn++): Part[] {
  if (style !== "chaos") return [{ text: styledMessage(message, style, language, step), ...STYLE_VOICE[style], volume: 1 }];
  const lines = LINES.chaos[language.toLowerCase().split(/[-_]/)[0]!] ?? LINES.chaos.en!;
  const calm = { pitch: 0.82, rate: 0.82, volume: 0.55 }, peak = { pitch: 1.4, rate: 1.35, volume: 1 };
  const dramatic = step % 2 === 1;
  return [
    { text: lines[0][step % lines[0].length]!, ...calm },
    { text: message, ...(dramatic ? peak : { pitch: 0.9, rate: 0.9, volume: 0.75 }) },
    { text: lines[1][Math.floor(step / lines[0].length) % lines[1].length]!, ...(dramatic ? calm : peak) },
  ];
}
