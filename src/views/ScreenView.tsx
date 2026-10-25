/**
 * The Screen menu: the wall panels (ARMOR-NODE-HMI, the touch screens on the wall). A wall panel has no panel of its own in Studio like the other nodes, so this lists every one that has
 * reported its health and gives each the buttons of a field node: its own page, its parameters through the server, the details of its health, the orders and forgetting.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { forgetNodeHealth } from "../api";
import { askConfirm } from "../askConfirm";
import type { Translate } from "../components/camera";
import { MenuLogo } from "../menuLogos";
import type { NetworkOverview } from "../networkModel";
import { fillAll } from "../nodeHealthModel";
import { NodeCard } from "./NodeHealth";
import { NodeToolsBar, NodeToolsFooter, panelFromNetwork, useNodeTools } from "./NodeTools";
import "./node-health.css";

export function ScreenView({ t, origin, isAdmin, network = null }: { t: Translate; origin: string; isAdmin: boolean; network?: NetworkOverview | null }) {
  const tools = useNodeTools(origin, isAdmin);
  const data = tools.health.data;
  const screens = (data?.nodes ?? []).filter(node => node.family === "hmi");
  const waiting = (data?.waiting ?? []).filter(node => node.family === "hmi");
  const answering = screens.filter(node => !node.stale).length;
  return <section className="screen-view">
    <header className="solar-head" data-tour="scr-head">
      <MenuLogo kind="hmi" size={68} />
      <div className="solar-title"><p className="eyebrow">{t("navHouse")}</p><h2>{t("hmi")}</h2><span className="muted">{t("scr_help")}</span></div>
      {screens.length > 0 && <div className="solar-totals"><div className="solar-tile"><small>{fillAll(t("scr_count"), answering, screens.length)}</small><b>{answering}/{screens.length}</b></div></div>}
    </header>
    {tools.health.failed && !data && <p className="solar-notice bad">{t("nh_unreachable")}</p>}
    {data && screens.length === 0 && <div className="nh-empty"><h4>{t("scr_none")}</h4><p className="muted">{t("scr_none_help")}</p></div>}
    <div className="nh-grid">
      {data && screens.map(node => <div className="scr-node" key={node.node_id} data-tour="scr-node">
        <div data-tour="scr-tools"><NodeToolsBar t={t} tools={tools} id={node.node_id} panel={panelFromNetwork(network, node.node_id)} silent={node.stale} /></div>
        <NodeCard t={t} node={node} levels={data.levels} now={Date.now()} opened={tools.detailsOf === node.node_id} toggle={() => tools.setDetailsOf(tools.detailsOf === node.node_id ? null : node.node_id)}
          origin={origin} isAdmin={isAdmin} forget={async () => { if (await askConfirm(`${t("confirmForgetNode")} ${node.node_id}`, t)) void forgetNodeHealth(origin, node.node_id).then(() => tools.health.reload()); }}
          control={isAdmin ? action => tools.setDialog({ operation: action.operation, scope: "node", node, label: action.label }) : undefined} />
      </div>)}
    </div>
    {waiting.length > 0 && <p className="muted small nh-waiting">{t("scr_waiting")} {waiting.map(item => item.node_id).join(", ")}</p>}
    <NodeToolsFooter t={t} tools={tools} details={false} />
  </section>;
}
