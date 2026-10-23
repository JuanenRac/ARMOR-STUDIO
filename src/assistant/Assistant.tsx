/**
 * The assistant: a small animated mascot that floats next to the menu the person is in and says, in a bubble, what that menu is for. It offers to show the menu step by step (the menu's
 * guided tour), to say the next thing about it, or to get out of the way. It follows the person from menu to menu, it is switched on or off in Preferences, and it never covers the
 * work: the bubble can be closed and the mascot itself can be put away until the next menu.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { View } from "../domain";
import type { Locale } from "../i18n";
import { HELP_SECTIONS } from "../helpText";
import { setPrefs, usePrefs } from "../prefs";
import { startTour, useActiveTour } from "../tour/tourStore";
import { menuTourId } from "../tour/menuTours";
import { placeBubble, type Side } from "./placement";
import { getAlerts, useAlerts } from "../alerts/settings";
import { speakAssistant, stopAssistantSpeech } from "../alerts/sounds";
import { answer as answerQuestion, suggestions, type Answer } from "./engine";
import type { Topic } from "./knowledge";
import { Mascot } from "./Mascot";
import "./assistant.css";

const SCALE = { small: 0.8, normal: 1, large: 1.35 } as const;
const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value));

export function Assistant({ view, t, language, go, openHelp }: { view: View; t: (key: string) => string; language: Locale; go: (view: View) => void; openHelp: (view: string) => void }) {
  const prefs = usePrefs();
  const tour = useActiveTour();
  const [away, setAway] = useState<ReadonlySet<string>>(new Set());   // the menus where the person put the mascot away
  const [open, setOpen] = useState(true);
  const [tip, setTip] = useState(0);
  const [spot, setSpot] = useState<{ left: number; top: number } | null>(null);
  const [question, setQuestion] = useState("");
  const [reply, setReply] = useState<{ asked: string; answer: Answer } | null>(null);
  const [seed, setSeed] = useState(0);
  const [live, setLive] = useState<{ left: number; top: number } | null>(null);   // while it is being dragged
  const drag = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const dragged = useRef(false);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const alerts = useAlerts();
  const [speaking, setSpeaking] = useState(false);   // the voice is reading right now: the mouth moves
  const [bubbleAt, setBubbleAt] = useState<{ side: Side; dx: number; dy: number; arrow: number } | null>(null);
  const [, setViewportTick] = useState(0);   // the window changed size: the bubble is placed again
  const hidden = away.has(view);
  const free = prefs.assistantX !== null && prefs.assistantY !== null;

  useEffect(() => { setOpen(prefs.assistantAutoOpen); setTip(0); setReply(null); }, [view, prefs.assistantAutoOpen]);

  // fly to the menu the person is in: next to its entry in the list, or in the corner when the list is folded or out of sight (not when the person has put it somewhere or pinned it)
  useLayoutEffect(() => {
    if (free || prefs.assistantPinned) { setSpot(null); return; }
    const place = () => {
      const entry = document.querySelector<HTMLElement>(`[data-tour="nav-${view}"]`);
      const box = entry?.getBoundingClientRect();
      if (box && box.width > 0 && box.right < window.innerWidth * 0.5) setSpot({ left: box.right + 12, top: Math.min(window.innerHeight - 220, Math.max(70, box.top - 14)) });
      else setSpot(null);
    };
    place();
    window.addEventListener("resize", place);
    const timer = window.setTimeout(place, 400);
    return () => { window.removeEventListener("resize", place); window.clearTimeout(timer); };
  }, [view, free, prefs.assistantPinned]);

  useEffect(() => { const again = () => setViewportTick(value => value + 1); window.addEventListener("resize", again); return () => window.removeEventListener("resize", again); }, []);

  const scale = SCALE[prefs.assistantSize];
  const mascotWidth = Math.round(56 * scale), mascotHeight = Math.round(63 * scale);
  const maxLeft = () => Math.max(0, window.innerWidth - Math.round(70 * scale));
  const maxTop = () => Math.max(0, window.innerHeight - Math.round(90 * scale));
  const place = (left: number, top: number) => { setPrefs({ assistantX: clamp(left, 0, maxLeft()) / window.innerWidth, assistantY: clamp(top, 0, maxTop()) / window.innerHeight }); };
  const startDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (prefs.assistantPinned) return;
    const box = (event.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
    drag.current = { x: event.clientX, y: event.clientY, left: box.left, top: box.top, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = event.clientX - d.x, dy = event.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 3) return;
    d.moved = true;
    setLive({ left: clamp(d.left + dx, 0, maxLeft()), top: clamp(d.top + dy, 0, maxTop()) });
  };
  const endDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    dragged.current = true;   // the click that follows a drag is not a click
    place(d.left + event.clientX - d.x, d.top + event.clientY - d.y);
    setLive(null);
  };
  const arrow = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const step = { ArrowLeft: [-24, 0], ArrowRight: [24, 0], ArrowUp: [0, -24], ArrowDown: [0, 24] }[event.key];
    if (!step || prefs.assistantPinned) return;
    event.preventDefault();
    const box = (event.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
    place(box.left + step[0]!, box.top + step[1]!);
  };

  const kept = free ? { left: clamp(prefs.assistantX! * window.innerWidth, 0, maxLeft()), top: clamp(prefs.assistantY! * window.innerHeight, 0, maxTop()) } : null;
  const corner = { left: Math.max(0, window.innerWidth - 18 - mascotWidth), top: Math.max(0, window.innerHeight - 52 - mascotHeight) };   // where it rests when it has no menu to fly to
  const where = live ?? kept ?? spot ?? corner;

  // the bubble opens where it fits: right, left, below, above or on a diagonal of the mascot, never outside the window (it is measured, then placed)
  useLayoutEffect(() => {
    const bubble = bubbleRef.current;
    if (!open || !bubble) { setBubbleAt(null); return; }
    const measure = () => {
      const size = { width: bubble.offsetWidth, height: bubble.offsetHeight };
      const mascot = { left: where.left, top: where.top, width: mascotWidth, height: mascotHeight };
      const placed = placeBubble(mascot, size, { width: window.innerWidth, height: window.innerHeight });
      const along = placed.side === "above" || placed.side === "below" ? mascotWidth / 2 - placed.dx : mascotHeight / 2 - placed.dy;   // the tip of the bubble points at the middle of the mascot
      const length = placed.side === "above" || placed.side === "below" ? size.width : size.height;
      setBubbleAt(current => current && current.side === placed.side && current.dx === placed.dx && current.dy === placed.dy ? current : { ...placed, arrow: clamp(along - 6, 12, Math.max(12, length - 24)) });
    };
    measure();
    const watcher = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    watcher?.observe(bubble);
    return () => watcher?.disconnect();
  });

  // what the bubble says now, to be read aloud when the person asked for it
  const sayNow = (() => {
    if (!prefs.assistant || !open) return "";
    if (reply) {
      const head = reply.answer.kind === "topic" ? (t(`help_s_${reply.answer.topic.view}`) !== `help_s_${reply.answer.topic.view}` ? t(`help_s_${reply.answer.topic.view}`) : "") : reply.answer.kind === "help" ? t(`help_s_${reply.answer.view}`) : "";
      const body = reply.answer.kind === "topic" || reply.answer.kind === "help" ? reply.answer.text : reply.answer.kind === "hello" ? t("asst_hi") : reply.answer.kind === "thanks" ? t("asst_thanks") : t("asst_none");
      return `${head}. ${body}`;
    }
    const own = HELP_SECTIONS.some(item => item.id === view) ? t(`help_b_${view}`).split("\n\n").filter(item => item.trim()) : [];
    return own.length > 0 ? `${t(`help_s_${view}`)}. ${own[tip % own.length]}` : t("asst_hello");
  })();
  const speakOn = prefs.assistantSpeak && !alerts.muted && !hidden && !tour;
  useEffect(() => {
    if (!speakOn || !sayNow) { stopAssistantSpeech(); setSpeaking(false); return; }
    // a short wait before reading: pressing "tell me more" several times in a row reads only the last text, and the browser has time to cut the previous one
    const wait = setTimeout(() => { speakAssistant(sayNow, getAlerts(), language, { onStart: () => setSpeaking(true), onEnd: () => setSpeaking(false) }); }, 180);
    return () => { clearTimeout(wait); stopAssistantSpeech(); setSpeaking(false); };
  }, [speakOn, sayNow, language]);

  if (!prefs.assistant || tour) return null;
  const section = HELP_SECTIONS.find(item => item.id === view);
  const paragraphs = section ? t(`help_b_${view}`).split("\n\n").filter(item => item.trim()) : [];
  const text = paragraphs.length > 0 ? paragraphs[tip % paragraphs.length] : t("asst_hello");
  const short = text.length > 330 ? `${text.slice(0, 327)}…` : text;
  const style = { left: where.left, top: where.top, width: mascotWidth, height: mascotHeight };
  const classes = `${free || live ? "free" : ""} ${live ? "dragging" : ""} ${prefs.assistantPinned ? "pinned" : ""}`;
  const ask = (text: string) => {
    const asked = text.trim();
    if (!asked) return;
    setQuestion("");
    setSeed(value => value + 1);
    setReply({ asked, answer: answerQuestion(asked, language, HELP_SECTIONS.map(item => item.id), t) });
  };
  const showTopic = (topic: Topic) => setReply({ asked: topic.q[Math.max(0, ["en", "es", "de", "fr", "it", "ja", "zh", "pt"].indexOf(language))] ?? topic.q[0], answer: { kind: "topic", topic, text: topic.a[Math.max(0, ["en", "es", "de", "fr", "it", "ja", "zh", "pt"].indexOf(language))] ?? topic.a[0], others: [] } });
  const goTo = (target: View, tour = false) => { go(target); if (tour) window.setTimeout(() => startTour(menuTourId(target)), 400); };
  const targetView = reply && (reply.answer.kind === "topic" ? reply.answer.topic.view : reply.answer.kind === "help" ? reply.answer.view as View : null);
  const helpView = reply?.answer.kind === "help" ? reply.answer.view : null;
  const targetTour = reply?.answer.kind === "topic" ? Boolean(reply.answer.topic.tour) : helpView !== null && HELP_SECTIONS.some(item => item.id === helpView);
  const examples = suggestions(language, 3, seed);

  if (hidden) return <button type="button" className={`assistant-call ${classes}`} style={style} onClick={() => setAway(current => { const next = new Set(current); next.delete(view); return next; })} title={t("asst_call")} aria-label={t("asst_call")}><Mascot talking={false} scale={scale} /></button>;

  return <div className={`assistant ${classes}`} style={style} role="complementary" aria-label={t("asst_name")}>
    <button type="button" className="assistant-mascot" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onKeyDown={arrow}
      onClick={() => { if (dragged.current) { dragged.current = false; return; } setOpen(value => !value); }}
      title={prefs.assistantPinned ? (open ? t("asst_quiet") : t("asst_call")) : `${open ? t("asst_quiet") : t("asst_call")} · ${t("asst_drag_hint")}`} aria-expanded={open}><Mascot talking={open && !prefs.assistantSpeak} speaking={speaking} scale={scale} /></button>
    {open && <div ref={bubbleRef} className={`assistant-bubble side-${bubbleAt?.side ?? "right"}`} role="status" style={bubbleAt ? { left: bubbleAt.dx, top: bubbleAt.dy, "--arrow": `${bubbleAt.arrow}px` } as React.CSSProperties : { visibility: "hidden" }}>
      {reply ? <>
        <small className="assistant-asked">{t("asst_you")}: {reply.asked}</small>
        {reply.answer.kind === "topic" && <strong>{t(`help_s_${reply.answer.topic.view}`) !== `help_s_${reply.answer.topic.view}` ? t(`help_s_${reply.answer.topic.view}`) : t("asst_name")}</strong>}
        {reply.answer.kind === "help" && <strong>{t(`help_s_${reply.answer.view}`)}</strong>}
        <p>{reply.answer.kind === "topic" || reply.answer.kind === "help" ? reply.answer.text : reply.answer.kind === "hello" ? t("asst_hi") : reply.answer.kind === "thanks" ? t("asst_thanks") : t("asst_none")}</p>
        {(reply.answer.kind === "none" || reply.answer.kind === "hello" || reply.answer.kind === "thanks") && <div className="assistant-chips">{examples.map(example => <button key={example} type="button" onClick={() => ask(example)}>{example}</button>)}</div>}
        {reply.answer.kind === "topic" && reply.answer.others.length > 0 && <div className="assistant-chips"><small>{t("asst_see_also")}</small>{reply.answer.others.map(other => <button key={other.id} type="button" onClick={() => showTopic(other)}>{other.q[Math.max(0, ["en", "es", "de", "fr", "it", "ja", "zh", "pt"].indexOf(language))]}</button>)}</div>}
        <div className="assistant-actions">
          {targetView && targetView !== view && <button type="button" className="primary" onClick={() => goTo(targetView)}>{t("asst_goto")}</button>}
          {targetView && targetTour && <button type="button" className={targetView === view ? "primary" : ""} onClick={() => goTo(targetView, true)}>{t("asst_show")}</button>}
          {targetView && <button type="button" onClick={() => openHelp(targetView)}>{t("asst_help")}</button>}
          <button type="button" onClick={() => setReply(null)}>{t("asst_back")}</button>
        </div>
      </> : <>
        <strong>{section ? t(`help_s_${view}`) : t("asst_name")}</strong>
        <p>{short}</p>
        <div className="assistant-actions">
          {section && <button type="button" className="primary" onClick={() => startTour(menuTourId(view))}>{t("asst_show")}</button>}
          {paragraphs.length > 1 && <button type="button" onClick={() => setTip(value => value + 1)}>{t("asst_more")} ({(tip % paragraphs.length) + 1}/{paragraphs.length})</button>}
          <button type="button" onClick={() => openHelp(view)}>{t("asst_help")}</button>
          <button type="button" onClick={() => setAway(current => new Set(current).add(view))}>{t("asst_hide")}</button>
        </div>
        <div className="assistant-chips"><small>{t("asst_try")}</small>{examples.map(example => <button key={example} type="button" onClick={() => ask(example)}>{example}</button>)}</div>
      </>}
      <div className="assistant-corner">
        <button type="button" className={prefs.assistantSpeak ? "on" : ""} aria-pressed={prefs.assistantSpeak} title={prefs.assistantSpeak ? t("asst_speak_on") : t("asst_speak_off")} aria-label={prefs.assistantSpeak ? t("asst_speak_on") : t("asst_speak_off")}
          onClick={() => { if (prefs.assistantSpeak) { stopAssistantSpeech(); setSpeaking(false); } setPrefs({ assistantSpeak: !prefs.assistantSpeak }); }}>{prefs.assistantSpeak ? "🔊" : "🔇"}</button>
        <button type="button" className={prefs.assistantPinned ? "on" : ""} aria-pressed={prefs.assistantPinned} title={prefs.assistantPinned ? t("asst_unpin") : t("asst_pin")} aria-label={prefs.assistantPinned ? t("asst_unpin") : t("asst_pin")}
          onClick={() => { if (!prefs.assistantPinned && !free) { const box = document.querySelector<HTMLElement>(".assistant")?.getBoundingClientRect(); if (box) place(box.left, box.top); } setPrefs({ assistantPinned: !prefs.assistantPinned }); }}>📌</button>
        {(free || prefs.assistantPinned) && <button type="button" title={t("asst_home")} aria-label={t("asst_home")} onClick={() => setPrefs({ assistantX: null, assistantY: null, assistantPinned: false })}>↩</button>}
      </div>
      <form className="assistant-ask" onSubmit={event => { event.preventDefault(); ask(question); }}>
        <input value={question} onChange={event => setQuestion(event.target.value)} placeholder={t("asst_ask_ph")} aria-label={t("asst_ask_ph")} maxLength={200} />
        <button type="submit" className="primary" disabled={!question.trim()}>{t("asst_ask_send")}</button>
      </form>
    </div>}
  </div>;
}
