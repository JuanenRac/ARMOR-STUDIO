/**
 * Whether the contracts a node says its firmware was checked against are the ones the server says it was checked against. Both numbers are versions of the shared contracts
 * (three or four numbers). A node that does not say it (older firmware) or a server that does not (not signed in, or an older server) is "unknown": nothing is warned about
 * what is not known. Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
export type ContractState = "same" | "different" | "unknown";

const VERSION = /^\d+\.\d+\.\d+(\.\d+)?$/;

/** `0.8.0` and `0.8.0.0` are the same version: the fourth number of the odometer is zero when it is not written. */
const normal = (version: string): string => (version.split(".").length === 3 ? `${version}.0` : version);

export function contractState(node: string | undefined | null, server: string | undefined | null): ContractState {
  if (typeof node !== "string" || typeof server !== "string" || !VERSION.test(node) || !VERSION.test(server)) return "unknown";
  return normal(node) === normal(server) ? "same" : "different";
}
