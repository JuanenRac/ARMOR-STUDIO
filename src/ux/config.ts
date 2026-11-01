/**
 * The tuned values of the small comforts and checks of the console (sign-in address, password and PIN rules, shortcuts, page title, warning on closing), read from ux.config.json and
 * clamped so that an edited file can never switch a protection off by accident.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import raw from "./ux.config.json";

const whole = (value: unknown, fallback: number, low: number, high: number): number =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(high, Math.max(low, Math.round(value))) : fallback;
const word = (value: unknown, fallback: string, max: number): string => (typeof value === "string" && value.length > 0 && value.length <= max ? value : fallback);

const pinMin = whole(raw.credentials.pinMinDigits, 4, 4, 10);
const floor = whole(raw.credentials.passwordMinimumFloor, 8, 8, 64);

export const UX = {
  signIn: {
    refuseRemoteHttpDefault: raw.signIn.refuseRemoteHttpDefault === true,
    localSuffixes: raw.signIn.localSuffixes.filter(suffix => /^\.[a-z0-9.-]{2,30}$/.test(suffix)),
  },
  credentials: {
    passwordMinimumFloor: floor,
    passwordMinimumFallback: whole(raw.credentials.passwordMinimumFallback, 12, floor, 128),
    pinMinDigits: pinMin,
    pinMaxDigits: whole(raw.credentials.pinMaxDigits, 10, pinMin, 12),
  },
  shortcuts: {
    enabledDefault: raw.shortcuts.enabledDefault !== false,
    help: word(raw.shortcuts.help, "?", 1),
    sidebar: word(raw.shortcuts.sidebar, "b", 1),
  },
  pageTitle: { suffix: word(raw.pageTitle.suffix, "A.R.M.O.R. Studio", 60), separator: word(raw.pageTitle.separator, " · ", 5) },
  unloadGuard: { statuses: raw.unloadGuard.statuses.filter(status => typeof status === "string") as readonly string[] },
} as const;
