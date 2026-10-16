/**
 * The assistant: a small animated mascot that floats next to the menu the person is in and says, in a bubble, what that menu is for. It offers to show the menu step by step (the menu's
 * guided tour), to say the next thing about it, or to get out of the way. It follows the person from menu to menu, it is switched on or off in Preferences, and it never covers the
 * work: the bubble can be closed and the mascot itself can be put away until the next menu.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useLayoutEffect, useState } from "react";
import type { View } from "../domain";
import { HELP_SECTIONS } from "../helpText";
import { usePrefs } from "../prefs";
import { startTour, useActiveTour } from "../tour/tourStore";
import { menuTourId } from "../tour/menuTours";
import "./assistant.css";

export function Mascot({ talking }: { talking: boolean }) {
  return <svg className={`mascot ${talking ? "talking" : ""}`} viewBox="0 0 64 72" width="56" height="63" aria-hidden="true" focusable="false">
    <line className="mascot-antenna" x1="32" y1="4" x2="32" y2="14" /><circle className="mascot-bulb" cx="32" cy="4" r="3" />
    <rect className="mascot-head" x="10" y="14" width="44" height="34" rx="12" />
    <rect className="mascot-visor" x="16" y="22" width="32" height="16" rx="8" />
    <circle className="mascot-eye" cx="25" cy="30" r="3.2" /><circle className="mascot-eye" cx="39" cy="30" r="3.2" />
    <path className="mascot-mouth" d="M26 43 Q32 47 38 43" />
    <rect className="mascot-body" x="18" y="50" width="28" height="16" rx="7" />
    <circle className="mascot-core" cx="32" cy="58" r="3" />
  </svg>;
}

export function Assistant({ view, t, openHelp }: { view: View; t: (key: string) => string; openHelp: (view: string) => void }) {
  const prefs = usePrefs();
  const tour = useActiveTour();
  const [away, setAway] = useState<ReadonlySet<string>>(new Set());   // the menus where the person put the mascot away
  const [open, setOpen] = useState(true);
  const [tip, setTip] = useState(0);
  const [spot, setSpot] = useState<{ left: number; top: number } | null>(null);
  const hidden = away.has(view);

  useEffect(() => { setOpen(true); setTip(0); }, [view]);

  // fly to the menu the person is in: next to its entry in the list, or in the corner when the list is folded or out of sight
  useLayoutEffect(() => {
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
  }, [view]);

  if (!prefs.assistant || tour) return null;
  const section = HELP_SECTIONS.find(item => item.id === view);
  const paragraphs = section ? t(`help_b_${view}`).split("\n\n").filter(item => item.trim()) : [];
  const text = paragraphs.length > 0 ? paragraphs[tip % paragraphs.length] : t("asst_hello");
  const short = text.length > 330 ? `${text.slice(0, 327)}…` : text;
  const style = spot ? { left: spot.left, top: spot.top } : undefined;

  if (hidden) return <button type="button" className={`assistant-call ${spot ? "" : "corner"}`} style={style} onClick={() => setAway(current => { const next = new Set(current); next.delete(view); return next; })} title={t("asst_call")} aria-label={t("asst_call")}><Mascot talking={false} /></button>;

  return <div className={`assistant ${spot ? "" : "corner"}`} style={style} role="complementary" aria-label={t("asst_name")}>
    <button type="button" className="assistant-mascot" onClick={() => setOpen(value => !value)} title={open ? t("asst_quiet") : t("asst_call")} aria-expanded={open}><Mascot talking={open} /></button>
    {open && <div className="assistant-bubble" role="status">
      <strong>{section ? t(`help_s_${view}`) : t("asst_name")}</strong>
      <p>{short}</p>
      <div className="assistant-actions">
        {section && <button type="button" className="primary" onClick={() => startTour(menuTourId(view))}>{t("asst_show")}</button>}
        {paragraphs.length > 1 && <button type="button" onClick={() => setTip(value => value + 1)}>{t("asst_more")} ({(tip % paragraphs.length) + 1}/{paragraphs.length})</button>}
        <button type="button" onClick={() => openHelp(view)}>{t("asst_help")}</button>
        <button type="button" onClick={() => setAway(current => new Set(current).add(view))}>{t("asst_hide")}</button>
      </div>
    </div>}
  </div>;
}
