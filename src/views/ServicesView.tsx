/**
 * The Services menu: every program of the system and every field node, running or not, grouped by family, with a summary, a search and the state of each one - the same shape as
 * HYDRA-UMC's services menu. An administrator can also start, stop, restart, pause and resume each program of this machine from its card.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { adminServiceAction, adminServices, ApiError, readServices, type AdminService, type ServiceInfo, type ServiceState } from "../api";
import { ConfirmDialog } from "../components/chrome";
import { SessionUserContext } from "../sessionContext";
import { usePolled } from "../hooks";
import type { Translate } from "../components/camera";
import { MenuTitle } from "../menuLogos";
import { uptimeText } from "./SystemView";
import "./services.css";

type Tone = "green" | "red" | "amber" | "slate";
/** The colour of a state: green when it works, red when it is stopped, amber when it failed or is starting, grey when it is not installed or not known. */
export const toneOf = (state: ServiceState): Tone => state === "running" || state === "online" ? "green" : state === "stopped" || state === "offline" ? "red" : state === "failed" || state === "starting" || state === "paused" ? "amber" : "slate";
export const isActive = (state: ServiceState): boolean => state === "running" || state === "online";
export const familyKey = (family: string): string => `svcFamily_${family.replace(/[^A-Za-z0-9]+/g, "_")}`;

export type ServiceAction = "start" | "stop" | "restart" | "pause" | "resume";
/** Which buttons a program of this machine offers in each state. The server and Studio are never paused: a paused console could not be used to resume itself. */
export function actionsFor(state: ServiceState, agentId: string): ServiceAction[] {
  const canPause = agentId !== "server" && agentId !== "studio";
  switch (state) {
    case "running": return canPause ? ["stop", "restart", "pause"] : ["stop", "restart"];
    case "paused": return ["resume", "stop", "restart"];
    case "starting": return ["stop", "restart"];
    case "stopped": case "failed": return ["start"];
    default: return [];
  }
}
/** The picture of each action: a power symbol to start, a square to stop, a circular arrow to restart, two bars to pause and a triangle to resume. */
export function ActionIcon({ action }: { action: ServiceAction }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", "aria-hidden": true, focusable: false } as const;
  switch (action) {
    case "start": return <svg {...common} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v8" /><path d="M6.6 6.8a8 8 0 1 0 10.8 0" /></svg>;
    case "stop": return <svg {...common} fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2.2" /></svg>;
    case "restart": return <svg {...common} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12a8 8 0 1 1-2.7-6" /><path d="M20 4v5.2h-5.2" /></svg>;
    case "pause": return <svg {...common} fill="currentColor"><rect x="6.2" y="5" width="4" height="14" rx="1.4" /><rect x="13.8" y="5" width="4" height="14" rx="1.4" /></svg>;
    case "resume": return <svg {...common} fill="currentColor"><path d="M8 5.2v13.6a.8.8 0 0 0 1.2.7l10.6-6.8a.8.8 0 0 0 0-1.4L9.2 4.5A.8.8 0 0 0 8 5.2z" /></svg>;
  }
}

/** The units of the agent are `armor-server`, the catalogue's are `armor-server.service`. */
export const agentIdOf = (unit: string | undefined, agent: readonly AdminService[]): string | undefined => agent.find(item => unit !== undefined && `${item.unit}.service` === unit)?.id;

const bytes = (value: number): string => value >= 1e9 ? `${(value / 1e9).toFixed(2)} GB` : value >= 1e6 ? `${(value / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(value / 1e3))} kB`;

function describe(service: ServiceInfo, t: Translate): string {
  const key = service.kind === "field-node" ? `svcDesc_${service.description}` : `svcDesc_${service.id.replace(/-/g, "_")}`;
  const text = t(key);
  return text === key ? service.description : text;
}

/** The box under the state of a service that says which version it is (nothing when the server could not tell). */
export function VersionBadge({ t, version }: { t: Translate; version?: string | null }) {
  return version ? <span className="svc-version" title={t("svcVersion")}><small>{t("svcVersion")}</small><b>{version}</b></span> : null;
}

export function ServicesView({ t, origin }: { t: Translate; origin: string }) {
  const poll = usePolled(() => readServices(origin), 5000, origin);
  const [search, setSearch] = useState("");
  const [family, setFamily] = useState<string | null>(null);
  const [show, setShow] = useState<"all" | "active" | "inactive">("all");
  const services = poll.data?.services ?? [];

  const summary = useMemo(() => ({
    total: services.length,
    active: services.filter(service => isActive(service.state)).length,
    inactive: services.filter(service => service.state === "stopped" || service.state === "offline").length,
    failed: services.filter(service => service.state === "failed").length,
    other: services.filter(service => service.state === "not_installed" || service.state === "unknown" || service.state === "starting").length,
  }), [services]);
  const families = useMemo(() => [...new Set(services.map(service => service.family))], [services]);
  const grouped = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const shown = services.filter(service => (!family || service.family === family) && (show === "all" || (show === "active" ? isActive(service.state) : !isActive(service.state)))
      && (!needle || `${service.name} ${service.unit ?? ""} ${describe(service, t)}`.toLowerCase().includes(needle)));
    const map = new Map<string, ServiceInfo[]>();
    for (const service of shown) map.set(service.family, [...(map.get(service.family) ?? []), service]);
    return [...map.entries()];
  }, [services, search, family, show, t]);
  const now = Date.now();
  const isAdmin = useContext(SessionUserContext)?.user?.role === "admin";
  const [agent, setAgent] = useState<AdminService[] | null>(null);
  const [message, setMessage] = useState<{ text: string; bad: boolean }>({ text: "", bad: false });
  const [pending, setPending] = useState<{ service: ServiceInfo; id: string; action: ServiceAction } | null>(null);
  const [busy, setBusy] = useState(false);
  const loadAgent = useCallback(async () => { if (!isAdmin) { setAgent(null); return; } try { setAgent((await adminServices(origin)).services); } catch { setAgent(null); } }, [isAdmin, origin]);
  useEffect(() => { void loadAgent(); }, [loadAgent]);
  const run = async (service: ServiceInfo, id: string, action: ServiceAction) => {
    setPending(null); setBusy(true); setMessage({ text: t("adm_working"), bad: false });
    try { await adminServiceAction(origin, id, action); setMessage({ text: `${service.name}: ${t("svcDone_" + action)}`, bad: false }); }
    // Stopping or restarting the server or Studio cuts the answer: that is not a failure, the list is read again in a moment.
    catch (error) { setMessage((id === "server" || id === "studio") && !(error instanceof ApiError) ? { text: t("adm_server_restarting"), bad: false } : { text: `${service.name}: ${t("svcActionFailed")} (${error instanceof ApiError ? error.code : "network"})`, bad: true }); }
    window.setTimeout(() => { poll.reload(); void loadAgent(); setBusy(false); }, 2500);
  };
  const ask = (service: ServiceInfo, id: string, action: ServiceAction) => (action === "start" || action === "resume") ? void run(service, id, action) : setPending({ service, id, action });

  return <section className="services-view">
    <header className="devices-head">
      <MenuTitle kind="services"><p className="eyebrow">{t("servicesTitle")}</p><h2>{t("services")}</h2><p className="muted">{t("servicesHelp")}</p></MenuTitle>
      <button onClick={poll.reload}>↻ {t("svcRefresh")}</button>
    </header>
    {poll.failed && <p className="svc-banner bad">{t("svcLoadError")}</p>}
    {message.text && <p className={`svc-banner ${message.bad ? "bad" : "warn"}`} role="status">{message.text}</p>}
    {isAdmin && agent === null && poll.data?.systemd && <p className="svc-banner warn">{t("svcNoAgent")}</p>}
    {poll.data && !poll.data.systemd && <p className="svc-banner warn">{t("svcNoSystemd")}</p>}

    <div className="svc-stats">
      <div><small>{t("svcTotal")}</small><strong>{summary.total}</strong></div>
      <div className="green"><small>{t("svcActive")}</small><strong>{summary.active}</strong></div>
      <div className="red"><small>{t("svcInactive")}</small><strong>{summary.inactive}</strong></div>
      <div className="amber"><small>{t("svcFailed")}</small><strong>{summary.failed}</strong></div>
      <div className="slate"><small>{t("svcOther")}</small><strong>{summary.other}</strong></div>
      <div><small>{t("svcFamilies")}</small><strong>{families.length}</strong></div>
    </div>

    <div className="svc-filters">
      <input value={search} onChange={event => setSearch(event.target.value)} placeholder={t("svcSearch")} aria-label={t("svcSearch")} />
      <div className="svc-chips" role="group">
        {(["all", "active", "inactive"] as const).map(kind => <button key={kind} className={show === kind ? "active" : ""} onClick={() => setShow(kind)}>{kind === "all" ? t("svcShowAll") : kind === "active" ? t("svcActive") : t("svcInactive")}</button>)}
      </div>
      <div className="svc-chips" role="group">
        <button className={family === null ? "active" : ""} onClick={() => setFamily(null)}>{t("svcAllFamilies")}</button>
        {families.map(item => <button key={item} className={family === item ? "active" : ""} onClick={() => setFamily(item)}>{t(familyKey(item)) === familyKey(item) ? item : t(familyKey(item))}</button>)}
      </div>
    </div>

    {grouped.map(([name, items]) => <div key={name} className="svc-family">
      <h3>{t(familyKey(name)) === familyKey(name) ? name : t(familyKey(name))} <span>({items.length})</span></h3>
      <div className="svc-grid">
        {items.map(service => <article key={service.id} className={`svc-card ${toneOf(service.state)}`}>
          <header>
            <div><strong>{service.name}</strong><small>{describe(service, t)}</small></div>
            <div className="svc-badges">
              <span className={`svc-state ${toneOf(service.state)}`}><i className="state-dot" /> {t(`svcState_${service.state}`)}</span>
              <VersionBadge t={t} version={service.version} />
            </div>
          </header>
          <div className="svc-meta">
            {service.unit && <span title={t("svcUnit")}>{service.unit}</span>}
            {service.port ? <span>{t("svcPort")} {service.port}</span> : null}
            {service.pid ? <span>{t("svcPid")} {service.pid}</span> : null}
            {service.memory_bytes ? <span>{t("svcMemory")} {bytes(service.memory_bytes)}</span> : null}
            {service.restarts ? <span className="warn">{t("svcRestarts")} {service.restarts}</span> : null}
            {service.enabled === true && <span>{t("svcAtBoot")}</span>}
            {service.enabled === false && <span>{t("svcNotAtBoot")}</span>}
            {service.kind === "systemd" && service.since_ms ? <span>{t("svcSince")} {uptimeText(Math.max(0, (now - service.since_ms) / 1000), t)}</span> : null}
            {service.kind === "field-node" && service.since_ms ? <span>{t("svcLastSeen")} {new Date(service.since_ms).toLocaleTimeString()}</span> : null}
          </div>
          {(() => {
            const id = agent ? agentIdOf(service.unit, agent) : undefined;
            if (!id || service.kind !== "systemd") return null;
            return <div className="svc-actions">{actionsFor(service.state, id).map(action => <button key={action} disabled={busy} className={`svc-act ${action}`} title={t("svcBtn_" + action)} aria-label={`${t("svcBtn_" + action)} ${service.name}`} onClick={() => ask(service, id, action)}><ActionIcon action={action} /></button>)}</div>;
          })()}
        </article>)}
      </div>
    </div>)}
    {poll.data && grouped.length === 0 && <p className="svc-empty">{t("svcNone")}</p>}
    {pending && <ConfirmDialog t={t} danger={pending.action === "stop"} title={`${pending.service.name} - ${t("svcBtn_" + pending.action)}`} text={t(`svcAsk_${pending.action}${pending.id === "server" || pending.id === "studio" ? "_console" : ""}`)}
      confirmLabel={t("svcBtn_" + pending.action)} cancel={() => setPending(null)} confirm={() => void run(pending.service, pending.id, pending.action)} />}
    <footer className="svc-foot"><span>{t("svcReadOnly")}</span>{poll.data && <span>{t("svcUpdated")} {new Date(poll.data.time_ms).toLocaleTimeString()}</span>}</footer>
  </section>;
}
