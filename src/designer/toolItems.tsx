/**
 * The tool panel content shared by the 2D plan and the 3D view: every tool in the same groups and order, with the ones the current
 * view cannot use greyed out (and saying where they work). The panel is arranged by `arrangeToolbox`: select, move and turn first, then undo, redo, delete and the view's
 * own controls, then the objects.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { ICON, toolIcon } from "./icons";
import { BRANCHES, TOOL_GROUPS, toolKeyOf, toolLabelKey, type Tool, type ToolMode } from "./model";
import type { ToolboxItem } from "./Toolbox";

export type TurnAxis = "yaw" | "pitch" | "roll";
export type SharedActions = {
  undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean;
  turn: (axis: TurnAxis, degrees: number) => void; canTurn: (axis: TurnAxis) => boolean;
  remove: () => void; canRemove: boolean;
};
export const TURN_STEP = 15;

/** The tools of the panel: `selection` is what picks and moves (the first group), `objects` are the things that can be placed, in groups of what belongs together. */
export type ToolBranch = { id: string; title: string; sections: ToolboxItem[][] };
export function toolSections(t: (key: string) => string, mode: ToolMode, tool: Tool, onTool: (tool: Tool) => void): { selection: ToolboxItem[][]; objects: ToolboxItem[][]; branches: ToolBranch[] } {
  const inBranch = (spec: { tool: Tool }) => BRANCHES.some(branch => branch.tools.includes(spec.tool));
  const groups = TOOL_GROUPS.map(group => group.map(spec => {
    const usable = spec.views.includes(mode), other = mode === "2d" ? "3d" : "2d";
    return {
      id: spec.tool, icon: toolIcon(spec.tool), label: t(spec.labelKey), keyHint: toolKeyOf(spec.tool), active: tool === spec.tool, disabled: !usable,
      help: usable ? t(`${spec.labelKey}Help`) : `${t(`${spec.labelKey}Help`)} — ${t(other === "2d" ? "worksIn2d" : "worksIn3d")}`,
      onClick: () => onTool(spec.tool),
    } satisfies ToolboxItem;
  }));
  const specGroups = TOOL_GROUPS;
  const keep = (index: number) => !specGroups[index]!.every(inBranch);
  const branches = BRANCHES.map(branch => ({
    id: branch.id, title: t(branch.titleKey),
    sections: groups.filter((_, index) => index > 0 && specGroups[index]!.every(spec => branch.tools.includes(spec.tool))),
  })).filter(branch => branch.sections.length > 0);
  return { selection: groups.slice(0, 1), objects: groups.slice(1).filter((_, index) => keep(index + 1)), branches };
}

/**
 * The order of the panel, the same in both views: first what selects, moves and turns, then the other commands (undo, redo, delete, and the view's own),
 * then the objects. `shared` is what `actionSections` makes: the editing commands, then the turning ones.
 */
export function arrangeToolbox(tools: { selection: ToolboxItem[][]; objects: ToolboxItem[][]; branches?: ToolBranch[] }, shared: ToolboxItem[][], view: ToolboxItem[][] = []): ToolboxItem[][] {
  const [editing, turning] = shared;
  return [...tools.selection, ...(turning ? [turning] : []), ...(editing ? [editing] : []), ...view, ...tools.objects];
}

export function actionSections(t: (key: string) => string, actions: SharedActions): ToolboxItem[][] {
  const turn = (id: string, axis: TurnAxis, sign: 1 | -1, icon: React.ReactNode, key: string, keyHint: string): ToolboxItem => ({
    id, icon, label: t(key), help: t(`${key}Help`), keyHint, disabled: !actions.canTurn(axis), onClick: () => actions.turn(axis, sign * TURN_STEP),
  });
  return [
    [
      { id: "undo", icon: ICON.undo, label: t("undo"), help: t("undoHelp"), keyHint: "Ctrl+Z", disabled: !actions.canUndo, onClick: actions.undo },
      { id: "redo", icon: ICON.redo, label: t("redo"), help: t("redoHelp"), keyHint: "Ctrl+Y", disabled: !actions.canRedo, onClick: actions.redo },
      { id: "remove", icon: ICON.trash, label: t("deleteObject"), help: t("deleteObjectHelp"), keyHint: "Del", disabled: !actions.canRemove, danger: true, onClick: actions.remove },
    ],
    [
      turn("yawLeft", "yaw", 1, ICON.yawLeft, "turnLeft", "["), turn("yawRight", "yaw", -1, ICON.yawRight, "turnRight", "]"),
      turn("pitchUp", "pitch", -1, ICON.pitchUp, "tiltForward", ","), turn("pitchDown", "pitch", 1, ICON.pitchDown, "tiltBack", "."),
      turn("rollLeft", "roll", 1, ICON.rollLeft, "tiltLeft", ";"), turn("rollRight", "roll", -1, ICON.rollRight, "tiltRight", "'"),
    ],
  ];
}
