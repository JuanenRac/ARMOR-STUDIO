/**
 * What can be used on a device of the network (from the ports the node found open) and the hook that gives the node a manual order and waits for its result.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, readNetworkOrder, sendNetworkOrder, type NetworkOrderType, type NetworkOrderView } from "./api";
import { RISKY_PORTS, type NetworkDevice } from "./networkModel";

export type ServiceLink = { port: number; proto: string; labelKey: string; /** A link a browser or the system can open. */ href?: string; /** Something to type or paste. */ command?: string; risky: boolean };

const WEB = new Set([80, 81, 8000, 8008, 8080, 8888]);
const SECURE_WEB = new Set([443, 8443, 4443]);

/** The services of a device, one per open port, with the address that opens it or the command that uses it. */
export function servicesOf(device: Pick<NetworkDevice, "ip" | "ports">): ServiceLink[] {
  return (device.ports ?? []).filter(port => port.proto === "tcp").map((port): ServiceLink => {
    const base = { port: port.port, proto: port.proto, risky: RISKY_PORTS.has(port.port) };
    const ip = device.ip;
    if (WEB.has(port.port)) return { ...base, labelKey: "no_svc_web", href: `http://${ip}${port.port === 80 ? "" : `:${port.port}`}/` };
    if (SECURE_WEB.has(port.port)) return { ...base, labelKey: "no_svc_secure_web", href: `https://${ip}${port.port === 443 ? "" : `:${port.port}`}/` };
    switch (port.port) {
      case 22: return { ...base, labelKey: "no_svc_ssh", command: `ssh user@${ip}`, href: `ssh://${ip}` };
      case 23: return { ...base, labelKey: "no_svc_telnet", command: `telnet ${ip}`, href: `telnet://${ip}` };
      case 21: return { ...base, labelKey: "no_svc_ftp", href: `ftp://${ip}` };
      case 3389: return { ...base, labelKey: "no_svc_rdp", command: `mstsc /v:${ip}` };
      case 5900: return { ...base, labelKey: "no_svc_vnc", href: `vnc://${ip}` };
      case 139: case 445: return { ...base, labelKey: "no_svc_smb", command: `\\\\${ip}` };
      case 554: return { ...base, labelKey: "no_svc_rtsp", href: `rtsp://${ip}:554/` };
      case 9100: return { ...base, labelKey: "no_svc_print" };
      default: return { ...base, labelKey: "no_svc_other" };
    }
  }).sort((a, b) => a.port - b.port);
}

export type OrderState = { status: "sending" | "waiting" | "done" | "failed"; order?: NetworkOrderView; error?: string };
const POLL_MS = 1500, GIVE_UP_AFTER = 60;

/**
 * Orders given to the node and what became of them, by a key the caller chooses (the order type and the device, say). The result comes with the node's next
 * message, a few seconds later, so the order is asked about until it is done, expired or a minute has gone.
 */
export function useNetworkOrders(origin: string, onDone?: () => void): { states: Record<string, OrderState>; give: (key: string, order: { type: NetworkOrderType; device_id?: string; port?: number; login?: boolean }) => void } {
  const [states, setStates] = useState<Record<string, OrderState>>({});
  const timers = useRef(new Map<string, number>());
  const alive = useRef(true);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => { alive.current = true; const held = timers.current; return () => { alive.current = false; held.forEach(timer => window.clearTimeout(timer)); held.clear(); }; }, []);
  const set = useCallback((key: string, state: OrderState) => { if (alive.current) setStates(current => ({ ...current, [key]: state })); }, []);

  const poll = useCallback((key: string, id: string, tries: number) => {
    timers.current.set(key, window.setTimeout(async () => {
      try {
        const order = await readNetworkOrder(origin, id);
        if (order.status === "done") { set(key, { status: "done", order }); done.current?.(); return; }
        if (order.status === "expired") { set(key, { status: "failed", order, error: "expired" }); return; }
      } catch { /* a hiccup: the next look tries again */ }
      if (tries >= GIVE_UP_AFTER) set(key, { status: "failed", error: "expired" }); else poll(key, id, tries + 1);
    }, POLL_MS));
  }, [origin, set]);

  const give = useCallback((key: string, order: { type: NetworkOrderType; device_id?: string; port?: number; login?: boolean }) => {
    const earlier = timers.current.get(key);
    if (earlier) window.clearTimeout(earlier);
    set(key, { status: "sending" });
    void sendNetworkOrder(origin, order).then(view => { set(key, { status: "waiting", order: view }); poll(key, view.id, 0); })
      .catch(error => set(key, { status: "failed", error: error instanceof ApiError ? error.code : "generic" }));
  }, [origin, poll, set]);
  return { states, give };
}
