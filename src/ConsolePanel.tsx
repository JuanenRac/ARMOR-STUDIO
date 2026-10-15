/**
 * Configuration > Console: commands as root on the machine, for the day something is wrong and there is no other way in. It is shut twice: the maintenance helper has it off unless it
 * was turned on in its environment, and here the administrator gives the password again before the first command (and again after ten minutes without use). One command at a time,
 * with a time limit; the folder is remembered from one command to the next; the output comes in as it is printed; a running command can be stopped. Every command is in the audit trail.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ApiError, cancelConsoleJob, lockConsole, readConsole, readConsoleJob, runConsole, unlockConsole, type ConsoleJob, type ConsoleState } from "./api";
import { CopyButton } from "./components/CopyButton";
import "./maintenance.css";

type Translate = (key: string) => string;
type Props = { t: Translate; origin: string; isAdmin: boolean };
type Entry = { id: string; command: string; cwd: string; output: string; state: "running" | "done" | "timeout"; code: number | null };

const POLL_MS = 450, MAX_SCROLLBACK = 400_000, HISTORY = 60;
export const TIME_LIMITS = [30, 120, 600, 3600] as const;
export const QUICK: ReadonlyArray<{ key: string; command: string }> = [
  { key: "mc_q_services", command: "systemctl --no-pager --type=service --state=failed,activating; systemctl --no-pager status armor-server armor-studio armor-mosquitto armor-network armor-admin armor-maintenance | head -60" },
  { key: "mc_q_log", command: "journalctl -u armor-server -n 80 --no-pager" },
  { key: "mc_q_disk", command: "df -h; du -sh /opt/armor/* 2>/dev/null | sort -h | tail -12" },
  { key: "mc_q_memory", command: "free -h; uptime; ps aux --sort=-%mem | head -8" },
  { key: "mc_q_network", command: "ip -brief address; ip route" },
  { key: "mc_q_restart", command: "systemctl restart armor-server && systemctl is-active armor-server" },
];

/** What is on the screen of the console is kept while the person is in another menu, and comes back: the commands, their output (a command that was still running goes on being followed), the folder and the history. */
const memory: { origin: string; entries: Entry[]; cwd: string; history: string[]; offsets: Record<string, number> } = { origin: "", entries: [], cwd: "/root", history: [], offsets: {} };

const timeText = (seconds: number) => (seconds >= 3600 ? "1 h" : seconds >= 60 ? `${seconds / 60} min` : `${seconds} s`);

export function ConsolePanel({ t, origin, isAdmin }: Props) {
  const [state, setState] = useState<ConsoleState | null>(null);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [entries, setEntries] = useState<Entry[]>(() => (memory.origin === origin ? memory.entries : []));
  const [line, setLine] = useState("");
  const [cwd, setCwd] = useState(() => (memory.origin === origin ? memory.cwd : "/root"));
  const [limit, setLimit] = useState<number>(120);
  const history = useRef<string[]>(memory.origin === origin ? memory.history : []);
  const cursor = useRef(-1);
  const screen = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const offsets = useRef<Record<string, number>>(memory.origin === origin ? memory.offsets : {});
  const running = entries.some(entry => entry.state === "running");
  const unlocked = Boolean(state && state.unlocked_until > Date.now());

  useEffect(() => { memory.origin = origin; memory.entries = entries; memory.cwd = cwd; memory.history = history.current; memory.offsets = offsets.current; });

  const refresh = async () => { try { setState(await readConsole(origin)); } catch { setState({ available: false, enabled: false, unlocked_until: 0 }); } };
  useEffect(() => { if (isAdmin) void refresh(); }, [origin, isAdmin]);   // eslint-disable-line react-hooks/exhaustive-deps

  // The output of a running command comes in as it is printed.
  const runningId = entries.find(entry => entry.state === "running")?.id;
  useEffect(() => {
    if (!runningId) return;
    let cancelled = false;
    const timer = window.setInterval(() => {
      readConsoleJob(origin, runningId, offsets.current[runningId] ?? 0).then(job => {
        if (cancelled) return;
        offsets.current[runningId] = job.offset;
        setEntries(current => current.map(entry => entry.id !== runningId ? entry : { ...entry, output: (entry.output + job.output).slice(-MAX_SCROLLBACK), state: job.state, code: job.code, cwd: job.cwd }));
        if (job.state !== "running") { setCwd(job.cwd); void refresh(); window.setTimeout(() => input.current?.focus(), 0); }
      }).catch(error => {
        if (cancelled) return;
        if (error instanceof ApiError && error.code === "console_locked") { setMessage(t("mc_lock_title")); void refresh(); }
      });
    }, POLL_MS);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [runningId, origin]);   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { screen.current?.scrollTo?.({ top: screen.current.scrollHeight }); }, [entries]);

  if (!isAdmin) return <article className="stack-card"><h3>{t("mc_title")}</h3><p className="muted">{t("cs_admin_only")}</p></article>;
  if (state === null) return <article className="stack-card"><h3>{t("mc_title")}</h3></article>;
  if (!state.available) return <article className="stack-card"><h3>{t("mc_title")}</h3><p className="notice">{t("mc_unavailable")}</p><p className="muted">{t("mt_hint")}</p></article>;
  if (!state.enabled) return <article className="stack-card"><h3>{t("mc_title")}</h3><p className="notice">{t("mc_off")}</p><p className="muted">{t("mc_off_hint")}</p></article>;

  const unlock = async (event: FormEvent) => {
    event.preventDefault();
    try { await unlockConsole(origin, password); setPassword(""); setMessage(""); await refresh(); window.setTimeout(() => input.current?.focus(), 50); }
    catch (error) {
      setPassword("");
      setMessage(error instanceof ApiError && error.status === 429 ? t("mc_too_many") : t("mc_wrong"));
    }
  };
  const close = async () => { try { await lockConsole(origin); } finally { await refresh(); } };
  const run = async (command: string) => {
    const text = command.trim();
    if (!text || running) return;
    history.current = [text, ...history.current.filter(item => item !== text)].slice(0, HISTORY);
    cursor.current = -1;
    setLine("");
    try {
      const job: ConsoleJob = await runConsole(origin, text, cwd, limit);
      offsets.current[job.id] = job.offset;
      setEntries(current => [...current, { id: job.id, command: text, cwd, output: job.output, state: job.state, code: job.code }].slice(-80));
    } catch (error) {
      if (error instanceof ApiError && error.code === "console_locked") { setMessage(t("mc_lock_title")); await refresh(); return; }
      setEntries(current => [...current, { id: `e${Date.now()}`, command: text, cwd, output: `${error instanceof ApiError ? error.code : "error"}\n`, state: "done", code: 1 }]);
    }
  };
  const keys = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowUp" && history.current.length) { event.preventDefault(); cursor.current = Math.min(history.current.length - 1, cursor.current + 1); setLine(history.current[cursor.current]); }
    else if (event.key === "ArrowDown") { event.preventDefault(); cursor.current = Math.max(-1, cursor.current - 1); setLine(cursor.current < 0 ? "" : history.current[cursor.current]); }
  };
  const stop = () => { if (runningId) void cancelConsoleJob(origin, runningId).catch(() => undefined); };

  if (!unlocked) return <article className="stack-card mc-lock">
    <h3>{t("mc_title")}</h3>
    <p className="muted">{t("mc_help")}</p>
    <form onSubmit={event => void unlock(event)}>
      <h4>{t("mc_lock_title")}</h4>
      <p className="muted">{t("mc_lock_help")}</p>
      <label>{t("mc_password")}<input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} autoFocus /></label>
      <button className="primary" type="submit" disabled={password === ""}>{t("mc_unlock")}</button>
    </form>
    {message && <p className="notice" role="alert">{message}</p>}
  </article>;

  return <article className="stack-card mc-console">
    <div className="mt-head"><div><h3>{t("mc_title")}</h3><p className="notice">{t("mc_warn")}</p></div><button onClick={() => void close()}>{t("mc_close")}</button></div>
    <div className="mc-quick" role="group" aria-label={t("mc_quick")}>
      <span className="muted">{t("mc_quick")}:</span>
      {QUICK.map(item => <button key={item.key} disabled={running} onClick={() => { setLine(item.command); input.current?.focus(); }} title={item.command}>{t(item.key)}</button>)}
    </div>
    <div className="log-box"><CopyButton t={t} text={() => entries.map(entry => `${entry.cwd}# ${entry.command}\n${entry.output}${entry.state === "timeout" ? `\n[${t("mc_timeout")}]` : entry.code !== null && entry.code !== 0 ? `\n[${t("mc_exit")} ${entry.code}]` : ""}`).join("\n\n")} />
    <div className="mc-screen" ref={screen} onClick={() => input.current?.focus()}>
      {entries.map(entry => <div key={entry.id} className="mc-entry">
        <div className="mc-prompt"><span className="mc-cwd">root@armor:{entry.cwd}</span># {entry.command}</div>
        {entry.output && <pre className="mc-output">{entry.output}</pre>}
        {entry.state === "running" && <div className="mc-state">{t("mc_running")}</div>}
        {entry.state === "timeout" && <div className="mc-state bad">{t("mc_timeout")}</div>}
        {entry.state === "done" && entry.code !== null && entry.code !== 0 && <div className="mc-state bad">{t("mc_exit")} {entry.code}</div>}
      </div>)}
    </div></div>
    <form className="mc-input" onSubmit={event => { event.preventDefault(); void run(line); }}>
      <span className="mc-cwd">{cwd}#</span>
      <input ref={input} value={line} onChange={event => setLine(event.target.value)} onKeyDown={keys} placeholder={t("mc_placeholder")} disabled={running} spellCheck={false} autoComplete="off" aria-label={t("mc_placeholder")} />
      <label className="mc-limit">{t("mc_time_limit")}<select value={limit} onChange={event => setLimit(Number(event.target.value))}>{TIME_LIMITS.map(seconds => <option key={seconds} value={seconds}>{timeText(seconds)}</option>)}</select></label>
      {running ? <button type="button" className="danger" onClick={stop}>{t("mc_stop")}</button> : <button type="submit" className="primary" disabled={line.trim() === ""}>{t("mc_run")}</button>}
      <button type="button" onClick={() => setEntries([])} disabled={entries.length === 0}>{t("mc_clear")}</button>
    </form>
    {message && <p className="notice">{message}</p>}
  </article>;
}
