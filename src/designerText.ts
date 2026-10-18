/**
 * Interface text of the site designer, one row per phrase: English, Spanish, German, French, Italian, Japanese, Chinese.
 * Keeping the seven translations on one row means a phrase cannot be added in one language and forgotten in another.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { cataloguesFromRows, type Row, type RowCatalogues } from "./catalogueRows";
import { rows_1 } from "./designerRows/rows1";
import { rows_2 } from "./designerRows/rows2";
import { rows_3 } from "./designerRows/rows3";
import { rows_4 } from "./designerRows/rows4";

const ROWS: Record<string, Row> = { ...rows_1, ...rows_2, ...rows_3, ...rows_4 };

export type DesignerCatalogues = RowCatalogues;
export const designerCatalogues: DesignerCatalogues = cataloguesFromRows(ROWS);
