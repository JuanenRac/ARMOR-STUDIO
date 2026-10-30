/**
 * What every list of field nodes shares to offer the buttons of a node (radar, inverters, batteries, electrical): the health the server has of each node, the details that are open, the dialog of
 * an order and the view that follows it. One hook per view, a toolbar per node, and a footer for the dialog, the order under way and the health card of the node whose details are open.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useState } from "react";
import { forgetNodeHealth, listNodePanels, readNodeHealth, type NodeControlOperation, type NodeHealthItem, type NodePanel } from "../api";
import { askConfirm } from "../askConfirm";
import type { Translate } from "../components/camera";
import { usePolled } from "../hooks";
import type { NetworkOverview } from "../networkModel";
import { ControlDialog, OperationView, type DialogRequest } from "./NodeControl";
import { NodeCard } from "./NodeHealth";
import { NodeAddressDialog } from "./NodeAddressDialog";
import { NodeSettingsDialog } from "./NodeSettingsDialog";
import { NodeToolbar } from "./NodeToolbar";

export type NodeTools = ReturnType<typeof useNodeTools>;

export function useNodeTools(origin: string, isAdmin: boolean) {
  const health = usePolled(() => readNodeHealth(origin), 10_000, origin);
  const [detailsOf, setDetailsOf] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogRequest | null>(null);
  const [order, setOrder] = useState<NodeControlOperation | null>(null);
  // the panels an administrator registered: the server reaches a node's panel only at those, and they win over the address the node told (which can be an old one)
  const panels = usePolled(() => (isAdmin ? listNodePanels(origin).then(reply => reply.panels) : Promise.resolve([] as NodePanel[])), 30_000, `${origin}/${isAdmin}`);
  const [editing, setEditing] = useState<{ id: string; ip: string; port: number } | null>(null);
  const [settingsOf, setSettingsOf] = useState<{ id: string; ip: string } | null>(null);
  const registeredOf = (id: string): NodePanel | null => panels.data?.find(item => item.id === id.toLowerCase()) ?? null;
  const healthOf = (id: string): NodeHealthItem | null => health.data?.nodes.find(item => item.node_id === id) ?? null;
  return { origin, isAdmin, health, detailsOf, setDetailsOf, dialog, setDialog, order, setOrder, healthOf, panels, editing, setEditing, settingsOf, setSettingsOf, registeredOf };
}

/** Where the own panel of a node is, from what the network node found (a node answers to "armor-" and its id, or to its id): null when it has not found it. */
export function panelFromNetwork(network: NetworkOverview | null | undefined, id: string): { ip: string; port: number } | null {
  const wanted = new Set([id.toLowerCase(), `armor-${id.toLowerCase()}`]);
  for (const watcher of network?.nodes ?? []) {
    for (const device of watcher.devices) {
      const host = device.hostname?.toLowerCase().replace(/\.local\.?$/, "");
      if (host && wanted.has(host) && device.ip) return { ip: device.ip, port: 80 };
    }
  }
  return null;
}

/** The buttons of one node. `forget` is what forgetting does when it is not the usual (the health of the node is forgotten, after asking). */
export function NodeToolsBar({ t, tools, id, panel = null, silent, forget }: { t: Translate; tools: NodeTools; id: string; panel?: { ip: string; port: number } | null; silent: boolean; forget?: () => void }) {
  const item = tools.healthOf(id);
  const registered = tools.registeredOf(id);
  const effective = registered ? { ip: registered.address, port: registered.port } : panel;   // the registered address wins over the one the node told
  const usual = async () => { if (await askConfirm(`${t("confirmForgetNode")} ${id}`, t)) void forgetNodeHealth(tools.origin, id).then(() => tools.health.reload()); };
  return <NodeToolbar t={t} origin={tools.origin} id={id} panel={effective} silent={silent} registered={registered !== null} editAddress={() => tools.setEditing({ id, ip: effective?.ip ?? "", port: effective?.port ?? 80 })} settings={effective ? () => tools.setSettingsOf({ id, ip: effective.ip }) : undefined} health={item} isAdmin={tools.isAdmin} detailsOpen={tools.detailsOf === id}
    toggleDetails={() => tools.setDetailsOf(tools.detailsOf === id ? null : id)}
    control={action => { if (item) tools.setDialog({ operation: action.operation, scope: "node", node: item, label: action.label }); }} forget={forget ?? (() => void usual())} />;
}

/** The dialog of an order, the order under way and the health card of the node whose details are open. */
export function NodeToolsFooter({ t, tools, details = true }: { t: Translate; tools: NodeTools; /** False when the list shows the health card of each node itself. */ details?: boolean }) {
  const open = details && tools.detailsOf ? tools.healthOf(tools.detailsOf) : null;
  return <>
    {open && tools.health.data && <div className="nt-detail"><NodeCard t={t} node={open} levels={tools.health.data.levels} now={Date.now()} opened toggle={() => tools.setDetailsOf(null)} origin={tools.origin} isAdmin={tools.isAdmin}
      forget={() => void forgetNodeHealth(tools.origin, open.node_id).then(() => { tools.setDetailsOf(null); tools.health.reload(); })}
      control={tools.isAdmin ? action => tools.setDialog({ operation: action.operation, scope: "node", node: open, label: action.label }) : undefined} /></div>}
    {tools.isAdmin && tools.editing && <NodeAddressDialog t={t} origin={tools.origin} id={tools.editing.id} address={tools.editing.ip} port={tools.editing.port} close={() => tools.setEditing(null)} saved={() => { tools.setEditing(null); tools.panels.reload(); }} />}
    {tools.isAdmin && tools.settingsOf && <NodeSettingsDialog t={t} origin={tools.origin} id={tools.settingsOf.id} address={tools.settingsOf.ip} close={() => tools.setSettingsOf(null)} />}
    {tools.isAdmin && tools.order && <OperationView t={t} operation={tools.order} dismiss={() => tools.setOrder(null)} />}
    {tools.isAdmin && tools.dialog && <ControlDialog t={t} origin={tools.origin} request={tools.dialog} close={() => tools.setDialog(null)}
      started={operation => { tools.setDialog(null); tools.setOrder(operation); tools.health.reload(); }} />}
  </>;
}
