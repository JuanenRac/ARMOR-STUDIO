/**
 * The sections of the Help, in order, as the screens need them: only which sections there are (what each says is in the language tables).
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { HELP_SECTION_IDS } from "./locales/keys";

export const HELP_SECTIONS: readonly { readonly id: string }[] = HELP_SECTION_IDS.map(id => ({ id }));
