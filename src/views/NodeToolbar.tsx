/**
 * The buttons of a field node in a list (radar, inverters, batteries, electrical): every one is an icon with its name as the tooltip and the label for a reader of the screen. They open the node's
 * own panel (directly and through the server, to change its parameters from anywhere), show the details of its health, give it an order (restart, pause, resume, standby, identify, diagnostics)
 * and forget it.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { ReactNode } from "react";
import type { ControlOperationName, NodeHealthItem } from "../api";
import { nodePanelUrl } from "../api";
import type { Translate } from "../components/camera";
import { actionsFor, type NodeAction } from "../nodeControlModel";
import { panelUrl } from "../panelUrl";
import "./node-toolbar.css";

const ICON = { viewBox: "0 0 24 24", width: 18, height: 18, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: false } as const;

/** The pictures of the buttons, one per thing a node can be asked. */
export const NODE_ICONS: Record<string, ReactNode> = {
  open: <svg {...ICON}><path d="M14 4h6v6" /><path d="M20 4l-9 9" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>,
  configure: <svg {...ICON}><path d="M4 6h10" /><path d="M18 6h2" /><circle cx="16" cy="6" r="2" /><path d="M4 12h2" /><path d="M10 12h10" /><circle cx="8" cy="12" r="2" /><path d="M4 18h12" /><circle cx="18" cy="18" r="2" /></svg>,
  details: <svg {...ICON}><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" /></svg>,
  restart: <svg {...ICON}><path d="M20 11a8 8 0 1 0-2.3 5.7" /><path d="M20 4v7h-7" /></svg>,
  pause: <svg {...ICON}><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>,
  resume: <svg {...ICON}><path d="M7 4l13 8-13 8z" /></svg>,
  standby: <svg {...ICON}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>,
  identify: <svg {...ICON}><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="8" /><path d="M12 1v3" /><path d="M12 20v3" /><path d="M1 12h3" /><path d="M20 12h3" /></svg>,
  diagnostics: <svg {...ICON}><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1" /><path d="M9 11h6" /><path d="M9 15h4" /></svg>,
  settings: <svg {...ICON}><circle cx="12" cy="12" r="3" /><path d="M12 2v3" /><path d="M12 19v3" /><path d="M2 12h3" /><path d="M19 12h3" /><path d="M5 5l2 2" /><path d="M17 17l2 2" /><path d="M19 5l-2 2" /><path d="M7 17l-2 2" /></svg>,
  address: <svg {...ICON}><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17z" /><path d="M13.5 6.5l3 3" /></svg>,
  forget: <svg {...ICON}><path d="M4 7h16" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M6 7l1 13h10l1-13" /><path d="M9 7V4h6v3" /></svg>,
};

/** The orders that are worth a button of their own on the row; maintenance stays in the card of the health of the node. */
const QUICK: readonly ControlOperationName[] = ["restart", "pause", "resume", "standby", "identify", "diagnostics"];

export type ToolbarProps = {
  t: Translate; origin: string; id: string;
  /** Where the node's own panel is, when it is known (a radar node says it itself; for the others the network node found it). */
  panel?: { ip: string; port: number } | null;
  /** The node does not answer (an administrator can forget one that answers too, and it comes back when it speaks again). */
  silent: boolean;
  /** The server knows the address of the panel (an administrator registered it): only then can it open the panel through the server. */
  registered: boolean;
  editAddress: () => void;
  /** Opens the settings of the node that are kept in the node itself (only given when the address of its panel is known). */
  settings?: () => void;
  /** What the server knows of this node's health, when it has reported (the orders depend on its state). */
  health?: NodeHealthItem | null;
  isAdmin: boolean; detailsOpen: boolean; toggleDetails: () => void;
  control: (action: NodeAction) => void; forget: () => void;
};

function IconButton({ label, icon, onClick, href, tone = "", pressed }: { label: string; icon: ReactNode; onClick?: () => void; href?: string; tone?: string; pressed?: boolean }) {
  if (href) return <a className={`nt-btn ${tone}`} href={href} target="_blank" rel="noopener noreferrer" title={label} aria-label={label}>{icon}</a>;
  return <button type="button" className={`nt-btn ${tone}`} title={label} aria-label={label} aria-pressed={pressed} onClick={onClick}>{icon}</button>;
}

export function NodeToolbar({ t, origin, id, panel = null, silent, registered, editAddress, settings, health = null, isAdmin, detailsOpen, toggleDetails, control, forget }: ToolbarProps) {
  const orders = health && !health.stale ? actionsFor(health).filter(action => QUICK.includes(action.operation)) : [];
  return <div className="nt-bar" role="group" aria-label={id}>
    {panel && <IconButton label={t("rn_open_direct")} icon={NODE_ICONS.open} href={panelUrl(panel)} />}
    {isAdmin && (registered
      ? <IconButton label={t("rn_configure")} icon={NODE_ICONS.configure} href={nodePanelUrl(origin, id)} />
      : <IconButton label={t("rn_configure_register")} icon={NODE_ICONS.configure} onClick={editAddress} tone="warn" />)}
    {isAdmin && <IconButton label={t("rn_edit_address")} icon={NODE_ICONS.address} onClick={editAddress} />}
    {isAdmin && settings && <IconButton label={t("ns_open")} icon={NODE_ICONS.settings} onClick={settings} />}
    {health && <IconButton label={detailsOpen ? t("nh_hide") : t("nh_details")} icon={NODE_ICONS.details} onClick={toggleDetails} pressed={detailsOpen} />}
    {isAdmin && orders.map(action => <IconButton key={action.operation} label={t(action.label)} icon={NODE_ICONS[action.operation]} onClick={() => control(action)} tone={action.operation === "restart" || action.operation === "standby" ? "warn" : ""} />)}
    {isAdmin && <IconButton label={t("forgetNode")} icon={NODE_ICONS.forget} onClick={forget} tone={silent ? "danger" : "warn"} />}
  </div>;
}
