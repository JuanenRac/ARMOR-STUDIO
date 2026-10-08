/**
 * Studio data hooks: everything that talks to ARMOR-SERVER on a timer.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { createCameraStreamUrl, listCameraStatus, listCameraViews, listConfiguredCameras, readInfo, readStatus, sessionUserState, type Reachability, type ServerInfo, type StudioUser } from "./api";
import { mergeServerCameras } from "./cameras";
import { DEMO_STATE, type Camera } from "./domain";
import type { SystemState } from "./types";

export type Connection = "synced" | "demo";

/** Poll the server status every three seconds; fall back to labelled demo data when it cannot be reached. */
/** Whether the page is fullscreen, and a button action that goes in when it is not and out when it is. */
export function useFullscreen(onFailure: () => void): { active: boolean; toggle: () => void } {
  const [active, setActive] = useState(() => Boolean(document.fullscreenElement));
  useEffect(() => {
    const update = () => setActive(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);
  const toggle = () => {
    if (document.fullscreenElement) void document.exitFullscreen?.().catch(onFailure);
    else void document.documentElement.requestFullscreen?.().catch(onFailure);
  };
  return { active, toggle };
}

export function useServerStatus(origin: string): { state: SystemState; connection: Connection; latencyMs: number | null; apply: (state: SystemState) => void } {
  const [state, setState] = useState<SystemState>(DEMO_STATE);
  const [connection, setConnection] = useState<Connection>("demo");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false, failures = 0;
    // One answer that is late or lost is not a lost server (a browser shares a few connections between the camera pictures and these calls): the console says it is offline after three in a row.
    const refresh = async () => {
      const started = performance.now();
      try { const next = await readStatus(origin); failures = 0; if (!cancelled) { setState(next); setConnection("synced"); setLatencyMs(Math.round(performance.now() - started)); } }
      catch { failures += 1; if (!cancelled && failures >= 3) { setConnection("demo"); setLatencyMs(null); } }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 3000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [origin]);
  return { state, connection, latencyMs, apply: setState };
}

/**
 * One short-lived stream address per live camera. An address is asked once for each camera and kept while the camera stays live: the list of cameras is read again
 * every minute, and asking again each time gave every picture a new address, so all the streams were dropped and started over (slow, and the pictures blinked).
 * A camera whose address cannot be had does not take the others with it.
 */
export function useStreamUrls(origin: string, cameras: readonly Camera[]): { urls: Record<string, string>; renew: (id: string) => void } {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const liveIds = cameras.filter(camera => camera.enabled && camera.liveVideoAvailable).map(camera => camera.id).sort().join(",");
  useEffect(() => {
    let cancelled = false;
    const live = liveIds ? liveIds.split(",") : [];
    setUrls(current => Object.fromEntries(Object.entries(current).filter(([id]) => live.includes(id))));
    for (const id of live) {
      void createCameraStreamUrl(origin, id)
        .then(url => { if (!cancelled) setUrls(current => current[id] ? current : { ...current, [id]: url }); })
        .catch(() => { /* this camera shows no picture until the set of live cameras changes */ });
    }
    return () => { cancelled = true; };
  }, [origin, liveIds]);
  // A new address for one camera whose picture stopped (the old one may have expired); the picture switches over when the new stream shows its first frame.
  const renew = useCallback((id: string) => {
    void createCameraStreamUrl(origin, id).then(url => setUrls(current => ({ ...current, [id]: url }))).catch(() => undefined);
  }, [origin]);
  return { urls, renew };
}

/**
 * Keep the camera list in step with the server: the read-only view first, then
 * the operator list once the session allows it (retried every minute).
 * Returns whether the operator list could be read.
 */
export function useServerCameras(origin: string, setCameras: Dispatch<SetStateAction<Camera[]>>): boolean {
  const [operatorUnlocked, setOperatorUnlocked] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void listCameraViews(origin)
      .then(reported => { if (!cancelled) setCameras(current => mergeServerCameras(current, reported)); })
      .catch(() => { /* The server may not be running while Studio starts. */ });
    const restore = async () => {
      try {
        const configured = await listConfiguredCameras(origin);
        if (cancelled) return;
        setOperatorUnlocked(true);
        setCameras(current => mergeServerCameras(current, configured));
      } catch { if (!cancelled) setOperatorUnlocked(false); }
    };
    void restore();
    const retry = window.setInterval(() => void restore(), 60_000);
    return () => { cancelled = true; window.clearInterval(retry); };
  }, [origin, setCameras]);
  return operatorUnlocked;
}

/** How reachable each camera is, as seen by the server's watchdog (refreshed every ten seconds). */
export function useCameraReachability(origin: string): Record<string, Reachability> {
  const [status, setStatus] = useState<Record<string, Reachability>>({});
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try { const list = await listCameraStatus(origin); if (!cancelled) setStatus(Object.fromEntries(list.map(item => [item.id, item.status]))); }
      catch { if (!cancelled) setStatus({}); }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 10_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [origin]);
  return status;
}

/** The server's version, uptime and capabilities, refreshed every fifteen seconds (null while it cannot be read). */
export function useServerInfo(origin: string): ServerInfo | null {
  const [info, setInfo] = useState<ServerInfo | null>(null);
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try { const next = await readInfo(origin); if (!cancelled) setInfo(next); }
      catch { if (!cancelled) setInfo(null); }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [origin]);
  return info;
}

/** The current time, ticking once a second. */
export function useClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(timer); }, []);
  return now;
}

/** Something read from the server again and again while it is shown; `reload` asks for it right now (after a change). */
export function usePolled<T>(load: () => Promise<T>, everyMs: number, key: unknown): { data: T | null; reload: () => void; failed: boolean } {
  const [data, setData] = useState<T | null>(null);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let cancelled = false, busy = false;
    const pull = async () => {
      if (busy) return;
      busy = true;
      try { const next = await load(); if (!cancelled) { setData(next); setFailed(false); } } catch { if (!cancelled) setFailed(true); }
      busy = false;
    };
    void pull();
    const timer = window.setInterval(() => void pull(), everyMs);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [key, everyMs, tick]);   // eslint-disable-line react-hooks/exhaustive-deps
  return { data, reload: () => setTick(value => value + 1), failed };
}

/**
 * Who is signed in, kept up to date: asked again every minute, when the window comes back into view and a few seconds after an answer that
 * could not be had. Only the server saying "nobody" clears the user: a failed or slow answer keeps the last one, so a hiccup of the network
 * never takes the administrator role away (the Users tab used to say "only an administrator" until the page was reloaded).
 */
export type SessionUser = { user: StudioUser | null; known: boolean; /** Why the last attempt to ask could not be answered (empty when it could). */ reason: string; refresh: () => void };
export function useSessionUser(origin: string): SessionUser {
  const [answer, setAnswer] = useState<{ user: StudioUser | null; known: boolean; reason: string }>({ user: null, known: false, reason: "" });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let cancelled = false, retry: number | undefined;
    const ask = () => void sessionUserState(origin).then(result => {
      if (cancelled) return;
      if (result.state === "user") setAnswer({ user: result.user, known: true, reason: "" });
      else if (result.state === "anonymous") setAnswer({ user: null, known: true, reason: "" });
      else { setAnswer(current => ({ ...current, reason: result.reason })); retry = window.setTimeout(ask, 4_000); }
    });
    ask();
    const every = window.setInterval(ask, 60_000);
    const onVisible = () => { if (document.visibilityState === "visible") ask(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { cancelled = true; window.clearInterval(every); if (retry) window.clearTimeout(retry); document.removeEventListener("visibilitychange", onVisible); };
  }, [origin, tick]);
  return { ...answer, refresh: () => setTick(value => value + 1) };
}
