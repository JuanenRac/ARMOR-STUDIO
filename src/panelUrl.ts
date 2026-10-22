/**
 * The address of a node's own web panel (port 80 is left out). Only the numbers the server validated as an IPv4 address and a port reach here.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
export const panelUrl = (panel: { ip: string; port: number }): string => `http://${panel.ip}${panel.port === 80 ? "" : `:${panel.port}`}/`;
