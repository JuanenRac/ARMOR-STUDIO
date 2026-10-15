/**
 * The window of the guided tours: dims the page, lights up the part a step explains with a pulsing outline, and puts a card with a picture, the words and the buttons next to it.
 * It opens the menu a step belongs to by itself, waits for the part to be on the screen, follows it if the window is resized and works from the keyboard (arrows, Enter, Esc).
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { View } from "../domain";
import { getPrefs, setPrefs } from "../prefs";
import { stepTour, stopTour, useActiveTour } from "./tourStore";
import { placeCard, stepKey, tourById } from "./tours";
import { TourArt } from "./TourArt";
import "./tour.css";

type Box = { left: number; top: number; width: number; height: number };
const format = (template: string, args: ReadonlyArray<string | number>): string => template.replace(/\{(\d+)\}/g, (_match, index: string) => String(args[Number(index)] ?? ""));
const READY_MS = 1800;

/** The part of the page a step lights up, once it is on the screen (a menu that has just opened needs a moment). */
function useTarget(selector: string | undefined, key: string): { box: Box | null; searching: boolean } {
  const [state, setState] = useState<{ box: Box | null; searching: boolean }>({ box: null, searching: Boolean(selector) });
  useEffect(() => {
    if (!selector) { setState({ box: null, searching: false }); return undefined; }
    let frame = 0, gaveUp = false, found: Element | null = null;
    const started = Date.now();
    const measure = () => {
      found = document.querySelector(`[data-tour="${selector}"]`);
      if (found) {
        const rect = found.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const box = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
          setState(current => (current.box && current.box.left === box.left && current.box.top === box.top && current.box.width === box.width && current.box.height === box.height && !current.searching ? current : { box, searching: false }));
          return;
        }
      }
      if (Date.now() - started > READY_MS) { gaveUp = true; setState({ box: null, searching: false }); }
    };
    const loop = () => { measure(); if (!gaveUp) frame = window.requestAnimationFrame(loop); };
    setState({ box: null, searching: true });
    loop();
    return () => window.cancelAnimationFrame(frame);
  }, [selector, key]);
  useEffect(() => {
    if (state.box && selector) document.querySelector(`[data-tour="${selector}"]`)?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [state.box === null, selector]);   // eslint-disable-line react-hooks/exhaustive-deps
  return state;
}

export function TourHost({ t, view, setView }: { t: (key: string) => string; view: View; setView: (view: View) => void }) {
  const active = useActiveTour();
  const tour = active ? tourById(active.id) : undefined;
  const step = tour && active ? tour.steps[active.index] : undefined;
  const key = active ? `${active.id}:${active.index}` : "";
  const { box, searching } = useTarget(step?.target, key);
  const card = useRef<HTMLElement>(null);
  const [size, setSize] = useState({ width: 360, height: 280 });
  const [screen, setScreen] = useState({ width: window.innerWidth, height: window.innerHeight });
  const next = useRef<HTMLButtonElement>(null);

  // the menu this step belongs to opens by itself
  useEffect(() => { if (step?.view && step.view !== view) setView(step.view); }, [key]);   // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => { if (card.current) setSize({ width: card.current.offsetWidth, height: card.current.offsetHeight }); }, [key, box, searching]);
  useEffect(() => {
    if (!active) return undefined;
    const resize = () => setScreen({ width: window.innerWidth, height: window.innerHeight });
    const keys = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); stopTour(true); }
      else if (event.key === "ArrowRight" || event.key === "Enter") { if (document.activeElement?.tagName !== "BUTTON" || event.key === "ArrowRight") { event.preventDefault(); stepTour(1); } }
      else if (event.key === "ArrowLeft") { event.preventDefault(); stepTour(-1); }
    };
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", keys, true);
    return () => { window.removeEventListener("resize", resize); window.removeEventListener("keydown", keys, true); };
  }, [active !== null]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (active) next.current?.focus({ preventScroll: true }); }, [key]);   // eslint-disable-line react-hooks/exhaustive-deps

  if (!active || !tour || !step) return null;
  const last = active.index === tour.steps.length - 1;
  const placed = box ? placeCard(box, size, screen, step.placement ?? "right") : { left: 0, top: 0, side: "center" };
  const centred = !box;
  const pad = 6;
  return <div className="tour-layer" role="presentation">
    <div className="tour-shield" />
    {box && <div className="tour-spot" style={{ left: box.left - pad, top: box.top - pad, width: box.width + pad * 2, height: box.height + pad * 2 }} />}
    {!box && <div className="tour-dim" />}
    <section ref={card} className={`tour-card ${centred ? "centred" : `side-${placed.side}`}`} style={centred ? undefined : { left: placed.left, top: placed.top }} role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-body" tabIndex={-1}>
      <button className="tour-close" onClick={() => stopTour(true)} aria-label={t("tourClose")} title={t("tourClose")}>×</button>
      <div className="tour-art-box"><TourArt art={step.art} size={150} /></div>
      <p className="eyebrow">{t(`tour_${tour.id}`)} · {format(t("tourStep"), [active.index + 1, tour.steps.length])}</p>
      <h3 id="tour-title">{t(stepKey(tour.id, active.index, "t"))}</h3>
      <p id="tour-body">{t(stepKey(tour.id, active.index, "b"))}</p>
      {step.target && !box && !searching && <p className="muted tour-missing">{t("tourNotShown")}</p>}
      <div className="tour-dots" aria-hidden="true">{tour.steps.map((_item, index) => <i key={index} className={index === active.index ? "now" : index < active.index ? "past" : ""} />)}</div>
      <div className="tour-buttons">
        <button onClick={() => stepTour(-1)} disabled={active.index === 0}>{t("tourBack")}</button>
        <button ref={next} className="primary" onClick={() => stepTour(1)}>{last ? t("tourFinish") : t("tourNext")}</button>
      </div>
      <div className="tour-foot">
        <button className="link" onClick={() => stopTour(true)}>{t("tourSkip")}</button>
        <label className="tour-never"><input type="checkbox" onChange={event => { if (event.target.checked) { setPrefs({ tutorial: false }); stopTour(true); } }} checked={!getPrefs().tutorial} /> {t("tourNever")}</label>
      </div>
      <small className="muted">{t("tourKeys")}</small>
    </section>
  </div>;
}
