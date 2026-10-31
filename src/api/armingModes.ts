import type { SystemState } from "../types";
import type { ArmingModesState as ContractState } from "./contract/armor-rest";
import type { ArmingModes as ContractDocument } from "./contract/armor-contracts";
import { userCall } from "./transport";
// ---- the arming modes of the server: away (everything), home and night (what the owner marked for each) -----------------------------------
export type ArmedMode = "away" | "home" | "night";
export type ArmingMode = "disarmed" | ArmedMode;
export type ArmingModesState = ContractState;
export type ArmingModesDocument = ContractDocument;
/** What the server says about the modes. Off (`enabled: false`) the system only arms and disarms. */
export const readArmingModes = (origin: string) => userCall<ArmingModesState>(origin, "GET", "/api/v1/alarm/modes");
/** Replaces the definitions and the timetable as a whole (an administrator); `revision` is the one that was read, and a change made meanwhile is a 409 (code `conflict`). */
export const saveArmingModes = (origin: string, document: ArmingModesDocument, revision: number) =>
  userCall<ArmingModesState>(origin, "PUT", "/api/v1/alarm/modes", { revision, modes: document.modes, ...(document.schedule ? { schedule: document.schedule } : {}) });
/**
 * Arms in a mode (or disarms). A mode that defends nothing is refused with `no_zones_assigned` unless `confirmUnassigned` is true; a change to a mode that defends LESS than the current one
 * is refused with `wrong_pin`, `pin_locked` or `pin_not_set` unless the PIN of the signed-in user comes with it (the same rules as a disarm).
 */
export const setArmingMode = (origin: string, mode: ArmingMode, options: { pin?: string; confirmUnassigned?: boolean } = {}) =>
  userCall<SystemState>(origin, "POST", "/api/v1/mode", { mode, ...(options.pin ? { pin: options.pin } : {}), ...(options.confirmUnassigned ? { confirm_unassigned: true } : {}) });
