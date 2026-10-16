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
import { answer as answerQuestion, suggestions, type Answer } from "./engine";
import type { Topic } from "./knowledge";
import "./assistant.css";

const SCALE = { small: 0.8, normal: 1, large: 1.35 } as const;
const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value));

export function Mascot({ talking, scale = 1 }: { talking: boolean; scale?: number }) {
  return <svg className={`mascot ${talking ? "talking" : ""}`} viewBox="0 0 64 72" width={Math.round(56 * scale)} height={Math.round(63 * scale)} aria-hidden="true" focusable="false">
    <line className="mascot-antenna" x1="32" y1="4" x2="32" y2="14" /><circle className="mascot-bulb" cx="32" cy="4" r="3" />
    <rect className="mascot-head" x="10" y="14" width="44" height="34" rx="12" />
    <rect className="mascot-visor" x="16" y="22" width="32" height="16" rx="8" />
    <circle className="mascot-eye" cx="25" cy="30" r="3.2" /><circle className="mascot-eye" cx="39" cy="30" r="3.2" />
    <path className="mascot-mouth" d="M26 43 Q32 47 38 43" />
    <rect className="mascot-body" x="18" y="50" width="28" height="16" rx="7" />
    <circle className="mascot-core" cx="32" cy="58" r="3" />
  </svg>;
}

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

  const scale = SCALE[prefs.assistantSize];
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
    if (!d.moved && Math.hypot(dx, dy) < 5) return;
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

  if (!prefs.assistant || tour) return null;
  const section = HELP_SECTIONS.find(item => item.id === view);
  const paragraphs = section ? t(`help_b_${view}`).split("\n\n").filter(item => item.trim()) : [];
  const text = paragraphs.length > 0 ? paragraphs[tip % paragraphs.length] : t("asst_hello");
  const short = text.length > 330 ? `${text.slice(0, 327)}…` : text;
  const kept = free ? { left: clamp(prefs.assistantX! * window.innerWidth, 0, maxLeft()), top: clamp(prefs.assistantY! * window.innerHeight, 0, maxTop()) } : null;
  const where = live ?? kept ?? spot;
  const style = where ? { left: where.left, top: where.top } : undefined;
  const flip = where ? where.left > window.innerWidth * 0.55 : false;   // on the right half the bubble opens to the left of the mascot
  const classes = `${where ? "" : "corner"} ${free || live ? "free" : ""} ${live ? "dragging" : ""} ${flip ? "flip" : ""} ${prefs.assistantPinned ? "pinned" : ""}`;
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
      title={prefs.assistantPinned ? (open ? t("asst_quiet") : t("asst_call")) : `${open ? t("asst_quiet") : t("asst_call")} · ${t("asst_drag_hint")}`} aria-expanded={open}><Mascot talking={open} scale={scale} /></button>
    {open && <div className="assistant-bubble" role="status">
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
      <div className="assistant-tools">
        <button type="button" onClick={() => { if (!prefs.assistantPinned && !free) { const box = document.querySelector<HTMLElement>(".assistant")?.getBoundingClientRect(); if (box) place(box.left, box.top); } setPrefs({ assistantPinned: !prefs.assistantPinned }); }}>{prefs.assistantPinned ? t("asst_unpin") : t("asst_pin")}</button>
        {(free || prefs.assistantPinned) && <button type="button" onClick={() => setPrefs({ assistantX: null, assistantY: null, assistantPinned: false })}>{t("asst_home")}</button>}
      </div>
      <form className="assistant-ask" onSubmit={event => { event.preventDefault(); ask(question); }}>
        <input value={question} onChange={event => setQuestion(event.target.value)} placeholder={t("asst_ask_ph")} aria-label={t("asst_ask_ph")} maxLength={200} />
        <button type="submit" className="primary" disabled={!question.trim()}>{t("asst_ask_send")}</button>
      </form>
    </div>}
  </div>;
}
