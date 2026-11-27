/**
 * How battery alarms call for attention (once and discreet, or as any alarm) and which batteries are silenced, kept by the server: the card of the Batteries view, the
 * button that silences one battery or module, and what was left out of today's widest gap with the button that starts the day again.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useState } from "react";
import { readBatteryNotices, resetDayCells, saveBatteryNotices, silenceBattery, type BatteryNotices } from "./api/solar";
import { usePolled } from "./hooks";
import type { DayCells } from "./solarModel";

type Translate = (key: string) => string;
export type Notices = { data: BatteryNotices | null; failed: boolean; setMode: (mode: "once" | "classic") => void; silence: (id: string, silenced: boolean) => void };

export function useBatteryNotices(origin: string): Notices {
  const poll = usePolled(async () => readBatteryNotices(origin), 30_000, origin);
  const [failed, setFailed] = useState(false);
  const act = (work: Promise<unknown>): void => { setFailed(false); void work.then(() => poll.reload(), () => setFailed(true)); };
  return {
    data: poll.data?.settings && Array.isArray(poll.data.silenced) ? poll.data : null,
    failed,
    setMode: mode => act(saveBatteryNotices(origin, { mode })),
    silence: (id, silenced) => act(silenceBattery(origin, id, silenced)),
  };
}

export const isSilenced = (notices: Notices, id: string): boolean => notices.data?.silenced.some(item => item.id === id) === true;

export function SilenceButton({ t, notices, id }: { t: Translate; notices: Notices; id: string }) {
  if (!notices.data) return null;
  const silenced = isSilenced(notices, id);
  return <button type="button" className="bat-silence" aria-pressed={silenced} onClick={event => { event.preventDefault(); notices.silence(id, !silenced); }}>{silenced ? `🔕 ${t("batn_unsilence")}` : t("batn_silence")}</button>;
}

export function BatteryNoticesCard({ t, notices }: { t: Translate; notices: Notices }) {
  const data = notices.data;
  if (!data) return null;
  return <section className="solar-card bat-notices">
    <h3>{t("batn_title")}</h3>
    <label>{t("batn_mode")} <select value={data.settings.mode ?? "once"} onChange={event => notices.setMode(event.target.value as "once" | "classic")}>
      <option value="once">{t("batn_once")}</option>
      <option value="classic">{t("batn_classic")}</option>
    </select></label>
    <p className="muted">{t("batn_help")}</p>
    <h4>{t("batn_silenced_list")}</h4>
    {data.silenced.length === 0 ? <p className="muted">{t("batn_none")}</p> : <ul>
      {data.silenced.map(item => <li key={item.id}><b>{item.id}</b> <small>{new Date(item.since).toLocaleString()} · {item.by}</small> <button type="button" onClick={() => notices.silence(item.id, false)}>{t("batn_unsilence")}</button></li>)}
    </ul>}
    {notices.failed && <p role="alert" className="solar-notice">{t("batn_failed")}</p>}
  </section>;
}

/** Where today's widest gap came from, what was left out of it and the button that starts the day again. */
export function DayCellsNote({ t, origin, node, device, day }: { t: Translate; origin: string; node: string; device: string; day: DayCells }) {
  const [state, setState] = useState<"" | "done" | "failed">("");
  const end = (item: { module: number; cell: number; v: number }): string => `${t("solarModule")} ${item.module} · ${t("solarCellWord")} ${item.cell} · ${item.v.toFixed(3)} V`;
  const left = day.discarded ?? [];
  return <div className="bat-day-note">
    {day.bank && <small>{t("batn_widest")} {new Date(day.bank.at).toLocaleTimeString()}: {end(day.bank.low)} / {end(day.bank.high)}</small>}
    {left.length > 0 && <details><summary>{t("batn_discarded")} ({left.length})</summary><ul>
      {left.map((item, index) => <li key={index}>{new Date(item.at).toLocaleTimeString()} · {t("solarModule")} {item.module}{item.cell === undefined ? "" : ` · ${t("solarCellWord")} ${item.cell}`}{item.v === undefined ? "" : ` · ${item.v.toFixed(3)} V`}{item.delta_v === undefined ? "" : ` · Δ ${Math.round(item.delta_v * 1000)} mV`} · {t(`batn_reason_${item.reason}`)}</li>)}
    </ul></details>}
    <button type="button" onClick={() => { setState(""); void resetDayCells(origin, node, device).then(() => setState("done"), () => setState("failed")); }}>{t("batn_reset")}</button>
    {state && <span role="status">{t(state === "done" ? "batn_reset_done" : "batn_failed")}</span>}
  </div>;
}
