/**
 * The figures the solar menus judge by, in one place. The levels an operator can change (spread of the cells, temperatures, health) come from the server's energy alarm settings; the
 * ones here are what the server has no setting for.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
export const SOLAR_THRESHOLDS = {
  /** A lithium iron phosphate cell (the Pylontech ones) below or above this is a fault. Other chemistries are not judged by it. */
  lfpCellLowV: 2.8,
  lfpCellHighV: 3.65,
  /** A figure outside these is not something a working battery can have: it is worth reading again. */
  plausibleCellV: [1.5, 4.5] as const,
  plausibleTempC: [-30, 90] as const,
  /** Used until the server's energy alarm settings arrive (its own defaults). */
  levels: { cell_spread_mv: 100, battery_temp_high_c: 55, battery_temp_low_c: 0, health_low_percent: 60, soc_low: 20 },
  /** How many new readings "Verify" waits for, and for how long. */
  verifySamples: 5,
  verifyTimeoutMs: 180_000,
  /** What the browser keeps of each battery and cell while Studio is open: one point at most in this time, and this many points. */
  recordEveryMs: 10_000,
  recordKeep: 8640,
} as const;

export type SolarLevels = { cell_spread_mv: number; battery_temp_high_c: number; battery_temp_low_c: number; health_low_percent: number; soc_low: number };
