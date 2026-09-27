/**
 * A floating tool panel: icons only, a tooltip with the name, what it does and its key, grouped by purpose, and
 * movable - drag it by its grip anywhere inside the canvas; each panel remembers where it was left. The 2D plan and
 * the 3D view each have their own panel with their own tools.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { ICON } from "./icons";
import { clampPanel, type Point } from "./model";

export type ToolboxItem = { id: string; icon: ReactNode; label: string; help: string; keyHint?: string; active?: boolean; disabled?: boolean; danger?: boolean; onClick: () => void };
export type ToolboxProps = {
  storageKey: string; title: string; sections: ReadonlyArray<readonly ToolboxItem[]>; containerRef: React.RefObject<HTMLElement | null>;
  labels: { drag: string; collapse: string; expand: string }; initial?: Point;
};
type Saved = { x: number; y: number; collapsed: boolean };

function readSaved(key: string): Saved | null {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? "null") as Partial<Saved> | null;
    if (value && Number.isFinite(value.x) && Number.isFinite(value.y)) return { x: Number(value.x), y: Number(value.y), collapsed: value.collapsed === true };
  } catch { /* Storage may be blocked or hold something else. */ }
  return null;
}

export function FloatingToolbox({ storageKey, title, sections, containerRef, labels, initial }: ToolboxProps) {
  const panel = useRef<HTMLDivElement>(null);
  const [saved] = useState(() => readSaved(storageKey));
  const [position, setPosition] = useState<Point>({ x: saved?.x ?? initial?.x ?? 32, y: saved?.y ?? initial?.y ?? 32 });
  const [collapsed, setCollapsed] = useState(saved?.collapsed ?? false);
  const [tip, setTip] = useState<{ item: ToolboxItem; top: number } | null>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const last = useRef<Point>(position);

  const bounds = useCallback((): { panel: { width: number; height: number }; container: { width: number; height: number } } | null => {
    const box = panel.current?.getBoundingClientRect(), outer = containerRef.current?.getBoundingClientRect();
    return box && outer ? { panel: { width: box.width, height: box.height }, container: { width: outer.width, height: outer.height } } : null;
  }, [containerRef]);
  const persist = useCallback((next: Point, isCollapsed: boolean) => { try { window.localStorage.setItem(storageKey, JSON.stringify({ ...next, collapsed: isCollapsed })); } catch { /* Not essential. */ } }, [storageKey]);

  useLayoutEffect(() => {
    const fit = () => { const limits = bounds(); if (limits) setPosition(current => { const next = clampPanel(current, limits.panel, limits.container); return next.x === current.x && next.y === current.y ? current : next; }); };
    fit();
    window.addEventListener("resize", fit);
    const observer = new ResizeObserver(fit);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => { window.removeEventListener("resize", fit); observer.disconnect(); };
  }, [bounds, collapsed, containerRef, sections.length]);

  const onGripDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    const outer = containerRef.current?.getBoundingClientRect();
    if (!outer) return;
    event.preventDefault();
    drag.current = { dx: event.clientX - outer.left - position.x, dy: event.clientY - outer.top - position.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onGripMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (!drag.current) return;
    const limits = bounds(), outer = containerRef.current?.getBoundingClientRect();
    if (!limits || !outer) return;
    last.current = clampPanel({ x: event.clientX - outer.left - drag.current.dx, y: event.clientY - outer.top - drag.current.dy }, limits.panel, limits.container);
    setPosition(last.current);
  };
  const onGripUp = (event: ReactPointerEvent<HTMLElement>) => {
    if (!drag.current) return;
    drag.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    persist(last.current, collapsed);
  };
  useEffect(() => { persist(position, collapsed); }, [collapsed]); // eslint-disable-line react-hooks/exhaustive-deps

  const showTip = (item: ToolboxItem, element: HTMLElement) => {
    const box = element.getBoundingClientRect(), host = panel.current?.getBoundingClientRect();
    if (host) setTip({ item, top: box.top - host.top + box.height / 2 });
  };
  const onKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const buttons = Array.from(panel.current?.querySelectorAll<HTMLButtonElement>(".tb-tool:not(:disabled)") ?? []);
    const index = buttons.findIndex(button => button === document.activeElement);
    if (index < 0) return;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") { event.preventDefault(); buttons[(index + 1) % buttons.length].focus(); }
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") { event.preventDefault(); buttons[(index - 1 + buttons.length) % buttons.length].focus(); }
  };

  return <div ref={panel} className={`floating-toolbox ${collapsed ? "collapsed" : ""}`} style={{ left: position.x, top: position.y }} role="toolbar" aria-orientation="vertical" aria-label={title} onKeyDown={onKey}>
    <div className="tb-grip" title={labels.drag} onPointerDown={onGripDown} onPointerMove={onGripMove} onPointerUp={onGripUp} onPointerCancel={onGripUp}>{ICON.grip}</div>
    <div className="tb-scroll">
      {!collapsed && sections.map((group, index) => <div className="tb-group" key={index}>
        {group.map(item => <button key={item.id} className={`tb-tool ${item.active ? "active" : ""} ${item.danger ? "danger" : ""}`} aria-label={item.label} aria-pressed={item.active} disabled={item.disabled}
          onClick={item.onClick} onPointerEnter={event => showTip(item, event.currentTarget)} onPointerLeave={() => setTip(null)} onFocus={event => showTip(item, event.currentTarget)} onBlur={() => setTip(null)}>
          {item.icon}
        </button>)}
      </div>)}
    </div>
    <button className="tb-collapse" aria-label={collapsed ? labels.expand : labels.collapse} title={collapsed ? labels.expand : labels.collapse} onClick={() => setCollapsed(value => !value)}>{collapsed ? ICON.expand : ICON.collapse}</button>
    {tip && !collapsed && <div className="tb-tip" role="tooltip" style={{ top: tip.top }}>
      <strong>{tip.item.label}{tip.item.keyHint && <kbd>{tip.item.keyHint}</kbd>}</strong>
      <span>{tip.item.help}</span>
    </div>}
  </div>;
}
