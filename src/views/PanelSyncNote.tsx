/**
 * What the alarm panels did about the arming mode in force (the setting alarm.mode_panel_sync): waiting for them, confirmed by all of them, or not confirmed with the reason of each
 * panel that did not. The mode of the server applies whatever the panels do, so a failure is a warning to check the panels, never a reason to show the system as unarmed; and "confirmed"
 * is said only when the server reports every panel as having answered accepted.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { PanelSync } from "../api/contract/armor-rest";
import type { Translate } from "../components/camera";

type Props = { t: Translate; sync: PanelSync };

/** The words of the state of a panel with the reason the server gives, when there is one (a code a person can look up in the audit trail). */
export function panelLine(t: Translate, node: PanelSync["nodes"][number]): string {
  const state = t(`ps_st_${node.status}`);
  return t("ps_node").replace("{0}", node.node_id).replace("{1}", node.reason && node.reason !== node.status ? `${state} (${node.reason})` : state);
}

export function PanelSyncNote({ t, sync }: Props) {
  const failed = sync.status === "failed";
  const key = `ps_${sync.status}`;
  const showNodes = (failed || sync.status === "pending") && sync.nodes.length > 0;
  return <div className={`notice ${failed ? "bad" : ""} panel-sync-note`} role={failed ? "alert" : "status"} data-testid="panel-sync-note" data-status={sync.status}>
    <b>{t("ps_title")}</b> {t(key).replace("{0}", sync.profile)}
    {showNodes && <ul>{sync.nodes.map(node => <li key={node.node_id}>{panelLine(t, node)}</li>)}</ul>}
  </div>;
}
