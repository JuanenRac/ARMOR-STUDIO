/**
 * Site designer operations: every edit the designer makes, as a pure function from one model to the next.
 * The editor only decides which one to call; keeping them here makes them testable and the undo history simple.
 * The operations live in ops/, by what they edit; this file keeps the one address the rest of the designer imports.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
export * from "./ops/vertices";
export * from "./ops/buildings";
export * from "./ops/placing";
export * from "./ops/reshaping";
export * from "./ops/removal";
export * from "./ops/mast";
export { DEFAULT_ROOF, FLOOR_HEIGHT_M, clamp, nextId, round2 } from "./ops/shared";
export type { SiteModel } from "./ops/shared";
