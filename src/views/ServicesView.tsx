/**
 * The Services menu: every program of the system and every field node, running or not, grouped by family, with a summary, a search and the state of each one - the same shape as
 * HYDRA-UMC's services menu. Read only.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useMemo, useState } from "react";
import { readServices, type ServiceInfo, type ServiceState } from "../api";
import { usePolled } from "../hooks";
import type { Translate } from "../components/camera";
import { MenuTitle } from "../menuLogos";
import { uptimeText } from "./SystemView";
import "./services.css";

type Tone = "green" | "red" | "amber" | "slate";
/** The colour of a state: green when it works, red when it is stopped, amber when it failed or is starting, grey when it is not installed or not known. */
export const toneOf = (state: ServiceState): Tone => state === "running" || state === "online" ? "green" : state === "stopped" || state === "offline" ? "red" : state === "failed" || state === "starting" ? "amber" : "slate";
export const isActive = (state: ServiceState): boolean => state === "running" || state === "online";
export const familyKey = (family: string): string => `svcFamily_${family.replace(/[^A-Za-z0-9]+/g, "_")}`;

const bytes = (value: number): string => value >= 1e9 ? `${(value / 1e9).toFixed(2)} GB` : value >= 1e6 ? `${(value / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(value / 1e3))} kB`;

function describe(service: ServiceInfo, t: Translate): string {
  const key = service.kind === "field-node" ? `svcDesc_${service.description}` : `svcDesc_${service.id.replace(/-/g, "_")}`;
  const text = t(key);
  return text === key ? service.description : text;
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

  return <section className="services-view">
    <header className="devices-head">
      <MenuTitle kind="services"><p className="eyebrow">{t("servicesTitle")}</p><h2>{t("services")}</h2><p className="muted">{t("servicesHelp")}</p></MenuTitle>
      <button onClick={poll.reload}>↻ {t("svcRefresh")}</button>
    </header>
    {poll.failed && <p className="svc-banner bad">{t("svcLoadError")}</p>}
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
            <span className={`svc-state ${toneOf(service.state)}`}><i className="state-dot" /> {t(`svcState_${service.state}`)}</span>
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
        </article>)}
      </div>
    </div>)}
    {poll.data && grouped.length === 0 && <p className="svc-empty">{t("svcNone")}</p>}
    <footer className="svc-foot"><span>{t("svcReadOnly")}</span>{poll.data && <span>{t("svcUpdated")} {new Date(poll.data.time_ms).toLocaleTimeString()}</span>}</footer>
  </section>;
}
