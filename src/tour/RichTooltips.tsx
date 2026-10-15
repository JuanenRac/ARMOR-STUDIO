/**
 * The hover hints of the whole console, drawn by the page instead of the browser: after the pointer rests on a control (or the keyboard reaches it) a small card appears next to it
 * with the explanation and, in the rich mode, a drawing that moves. The text is the `title` the control already has (hoverHints.ts writes it from the catalogue), which is taken off while the
 * card is shown so the browser does not show a second one, and put back afterwards. The preferences choose off, text or rich, and the delay.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { VIEWS, usePrefs } from "../prefs";
import type { View } from "../domain";
import { ART_OF_VIEW, TourArt, type ArtId } from "./TourArt";
import { placeCard } from "./tours";
import "./tour.css";

const SELECTOR = "[title], [data-tip]";

/** What the control is called, for the title of the hint: its own label, else its words, short. */
export function tipLabel(element: Element): string {
  const aria = element.getAttribute("aria-label");
  if (aria) return aria.trim().slice(0, 48);
  const own = (element.textContent ?? "").replace(/\s+/g, " ").trim();
  return own.length > 0 && own.length <= 48 ? own : "";
}

/** The drawing that goes with a control: a menu entry has the one of its menu, the rest a general one by what they are. */
export function tipArt(element: Element): ArtId {
  const tour = element.closest("[data-tour]")?.getAttribute("data-tour") ?? "";
  if (tour.startsWith("nav-")) { const view = tour.slice(4) as View; if ((VIEWS as readonly string[]).includes(view)) return ART_OF_VIEW[view]; }
  if (tour.startsWith("tab-")) return "settings";
  if (element.matches("input, select, textarea")) return "settings";
  if (element.closest(".topbar")) return "tips";
  return "tips";
}

type Shown = { element: Element; text: string; label: string; art: ArtId };

export function RichTooltips({ t }: { t: (key: string) => string }) {
  const prefs = usePrefs();
  const [shown, setShown] = useState<Shown | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const mode = prefs.tooltips, delay = prefs.tooltipDelay;

  useEffect(() => {
    const held = new Map<Element, string>();      // the titles taken off while the pointer is on the control
    let timer = 0, current: Element | null = null;
    const giveBack = () => { held.forEach((title, element) => { if (!element.hasAttribute("title")) element.setAttribute("title", title); element.removeAttribute("data-tip"); }); held.clear(); };
    const hide = () => { window.clearTimeout(timer); timer = 0; current = null; setShown(null); setPos(null); giveBack(); };
    const textOf = (element: Element): string => element.getAttribute("title") ?? element.getAttribute("data-tip") ?? "";
    const take = (element: Element) => {
      const title = element.getAttribute("title");
      if (title !== null) { held.set(element, title); element.setAttribute("data-tip", title); element.removeAttribute("title"); }
    };
    const open = (element: Element, now: boolean) => {
      const text = textOf(element);
      if (!text) return;
      take(element);                               // the browser's own tip must not appear next to ours
      if (mode === "off") return;
      current = element;
      const show = () => { if (current === element && element.isConnected) setShown({ element, text: held.get(element) ?? text, label: tipLabel(element), art: tipArt(element) }); };
      if (now) show(); else timer = window.setTimeout(show, delay);
    };
    const over = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const target = event.target instanceof Element ? event.target.closest(SELECTOR) : null;
      if (!target || target === current) return;
      if (current) hide();
      open(target, false);
    };
    const out = (event: PointerEvent) => {
      if (!current) return;
      const next = event.relatedTarget instanceof Element ? event.relatedTarget : null;
      if (next && current.contains(next)) return;
      hide();
    };
    const focus = (event: FocusEvent) => {
      const target = event.target instanceof Element ? event.target.closest(SELECTOR) : null;
      if (!target) return;
      if (current) hide();
      open(target, true);
    };
    const keys = (event: KeyboardEvent) => { if (event.key === "Escape" && current) hide(); };
    document.addEventListener("pointerover", over, true);
    document.addEventListener("pointerout", out, true);
    document.addEventListener("pointerdown", hide, true);
    document.addEventListener("focusin", focus, true);
    document.addEventListener("focusout", hide, true);
    document.addEventListener("keydown", keys, true);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("blur", hide);
    return () => {
      document.removeEventListener("pointerover", over, true); document.removeEventListener("pointerout", out, true); document.removeEventListener("pointerdown", hide, true);
      document.removeEventListener("focusin", focus, true); document.removeEventListener("focusout", hide, true); document.removeEventListener("keydown", keys, true);
      window.removeEventListener("scroll", hide, true); window.removeEventListener("blur", hide);
      hide();
    };
  }, [mode, delay]);

  // put the card next to its control, inside the screen, once its size is known
  useLayoutEffect(() => {
    if (!shown || !card.current) return;
    const rect = shown.element.getBoundingClientRect();
    const where = placeCard({ left: rect.left, top: rect.top, width: rect.width, height: rect.height }, { width: card.current.offsetWidth, height: card.current.offsetHeight }, { width: window.innerWidth, height: window.innerHeight }, "bottom", 10);
    setPos({ left: where.left, top: where.top });
  }, [shown]);

  if (!shown || mode === "off") return null;
  const rich = mode === "rich";
  return <div ref={card} role="tooltip" className={`rich-tip ${rich ? "rich" : "text"} ${pos ? "" : "hidden"}`} style={pos ?? { left: 0, top: 0 }}>
    {rich && <div className="tip-art"><TourArt art={shown.art} size={104} /></div>}
    {rich && <span className="tip-title">{t("tt_tip")}</span>}
    {rich && shown.label && <strong>{shown.label}</strong>}
    <span>{shown.text}</span>
  </div>;
}
