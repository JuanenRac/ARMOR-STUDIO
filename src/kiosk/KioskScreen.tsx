/**
 * The wall-panel mode of the console (kiosk): one large screen for a tablet on the wall, opened with ?kiosk=1 or from the installed app. It shows whether the system is armed, the alarms
 * waiting for a person, the buttons to arm, disarm and acknowledge (as far as the session may), rests with a dim clock after some time without a touch, and says so when the connection is lost.
 * It signs in as any other client does; nothing of it works without a session.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { acknowledgeAlarm, listAlarms } from "../api/alarms";
import { setSystemMode } from "../api/system";
import { resolveCapabilities } from "../capabilities";
import { PinDialog } from "../components/chrome";
import { useServerStatus, usePolled, useSessionUser } from "../hooks";
import { text } from "../i18n";
import { loginLanguage } from "../StudioLogin";
import { alarmWaiting, alarmsToShow, isResting, KIOSK_CONFIG } from "./kioskModel";
import { registerKioskWorker } from "./worker";
import "./kiosk.css";

type WakeLockSentinelLike = { release: () => Promise<void> };
type WakeLockHost = Navigator & { wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> } };

/** The words of an alarm: the shared table when it has the code, else the code itself. */
function alarmWords(language: ReturnType<typeof loginLanguage>, code: string): string {
  const key = `alarm_${code}`;
  const words = text(language, key);
  return words === key ? code : words;
}

export function KioskScreen({ origin, onSignOut }: { origin: string; onSignOut: () => void }) {
  const language = useMemo(() => loginLanguage(), []);
  const t = useCallback((key: string) => text(language, key), [language]);
  const session = useSessionUser(origin);
  const capabilities = useMemo(() => resolveCapabilities(session.user?.role, session.capabilities), [session.user?.role, session.capabilities]);
  const { state, connection, apply } = useServerStatus(origin, { live: true });
  const alarms = usePolled(() => listAlarms(origin), KIOSK_CONFIG.alarm_poll_ms, origin, { always: true, topics: ["alarm"] });
  const [now, setNow] = useState(() => Date.now());
  const [lastTouch, setLastTouch] = useState(() => Date.now());
  const [asking, setAsking] = useState(false);
  const [failed, setFailed] = useState(false);

  const connected = connection === "synced" && !alarms.failed;
  const shown = alarmsToShow(alarms.data?.active);
  const resting = isResting(now, lastTouch, KIOSK_CONFIG.idle_after_s, alarmWaiting(alarms.data?.active));
  const canArm = capabilities.can("arm"), canDisarm = capabilities.can("disarm"), canAcknowledge = capabilities.can("acknowledge");

  useEffect(() => { void registerKioskWorker(); }, []);
  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    const touch = () => { setLastTouch(Date.now()); setNow(Date.now()); };
    window.addEventListener("pointerdown", touch);
    window.addEventListener("keydown", touch);
    return () => { window.clearInterval(tick); window.removeEventListener("pointerdown", touch); window.removeEventListener("keydown", touch); };
  }, []);
  // The screen of a wall panel stays on (the dim clock is ours); a browser that does not offer it is left alone.
  useEffect(() => {
    if (!KIOSK_CONFIG.wake_lock) return;
    const host = navigator as WakeLockHost;
    if (!host.wakeLock) return;
    let lock: WakeLockSentinelLike | null = null, gone = false;
    const take = () => { if (document.visibilityState === "visible") void host.wakeLock?.request("screen").then(sentinel => { if (gone) void sentinel.release(); else lock = sentinel; }, () => undefined); };
    take();
    document.addEventListener("visibilitychange", take);
    return () => { gone = true; document.removeEventListener("visibilitychange", take); void lock?.release(); };
  }, []);

  const [pinFor, setPinFor] = useState(false);
  const change = (mode: "armed" | "disarmed", pin?: string) => {
    setAsking(true); setFailed(false);
    void setSystemMode(origin, mode, pin).then(next => { apply(next); }, () => setFailed(true)).finally(() => setAsking(false));
  };
  const acknowledge = (id: string) => { setFailed(false); void acknowledgeAlarm(origin, id).then(alarms.reload, () => setFailed(true)); };

  const armed = connected ? state.mode === "armed" : null;
  const clock = new Date(now).toLocaleTimeString(language, { hour: "2-digit", minute: "2-digit" });
  const readOnly = session.known && !canArm && !canDisarm && !canAcknowledge;

  return <main className={`kiosk${resting ? " resting" : ""}${armed === null ? " unknown" : armed ? " armed" : " disarmed"}`} aria-label={t("kiosk_title")}>
    {!connected && <p className="kiosk-banner" role="status">{t("kiosk_offline")}</p>}
    {failed && <p className="kiosk-banner failed" role="alert">{t("kiosk_failed")}</p>}
    <p className="kiosk-clock" aria-hidden={!resting}>{clock}</p>
    {resting ? <p className="kiosk-wake">{t("kiosk_wake")}</p> : <>
      <h1 className="kiosk-state">{armed === null ? t("kiosk_unknown") : armed ? t("kiosk_armed") : t("kiosk_disarmed")}</h1>
      {readOnly && <p className="kiosk-note">{t("kiosk_view_only")}</p>}
      <div className="kiosk-actions">
        {armed === false && canArm && <button type="button" className="primary" disabled={asking} onClick={() => change("armed")}>{t("kiosk_arm")}</button>}
        {armed === true && canDisarm && <button type="button" className="danger" disabled={asking} onClick={() => setPinFor(true)}>{t("kiosk_disarm")}</button>}
      </div>
      <section className="kiosk-alarms" aria-label={t("kiosk_alarms")}>
        <h2>{shown.length ? t("kiosk_alarms") : t("kiosk_no_alarms")}</h2>
        <ul>{shown.map(alarm => <li key={alarm.id} className={alarm.acknowledged_at ? "seen" : "new"}>
          <span>{alarmWords(language, alarm.code)}</span>
          {!alarm.acknowledged_at && canAcknowledge && <button type="button" onClick={() => acknowledge(alarm.id)}>{t("kiosk_ack")}</button>}
        </li>)}</ul>
      </section>
      <button type="button" className="kiosk-signout" onClick={onSignOut}>{t("kiosk_signout")}</button>
    </>}
    {pinFor && <PinDialog title={t("disarmSystem")} text={t("confirmDisarm")} confirmLabel={t("disarmSystem")} confirm={pin => { setPinFor(false); change("disarmed", pin); }} cancel={() => setPinFor(false)} t={t} />}
  </main>;
}
