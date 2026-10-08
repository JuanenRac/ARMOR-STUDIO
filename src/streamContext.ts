/**
 * How a camera picture asks for a new stream address when its stream stops (see LiveImage). Provided by the App; a tile outside it just does nothing.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { createContext } from "react";

export const StreamRenewContext = createContext<(cameraId: string) => void>(() => undefined);
