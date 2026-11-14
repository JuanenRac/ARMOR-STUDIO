/**
 * The calls of the backup card, the load shedding card and the energy balance card (all behind security options that are off by default).
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { BackupResult, BackupSettingsRequest, BackupState, EnergyBalance, EnergyBalanceSettings, LoadShedding, LoadSheddingSettings } from "./contract/armor-rest";
import { userCall } from "./transport";

export type { BackupResult, BackupSettingsRequest, BackupState, EnergyBalance, EnergyBalanceSettings, LoadShedding, LoadSheddingSettings };

export const readBackup = (origin: string) => userCall<BackupState>(origin, "GET", "/api/v1/admin/backup");
export const saveBackup = (origin: string, settings: BackupSettingsRequest) => userCall<BackupState>(origin, "PUT", "/api/v1/admin/backup", settings);
export const runBackup = (origin: string) => userCall<BackupResult>(origin, "POST", "/api/v1/admin/backup/run", {});
export const verifyBackup = (origin: string, name?: string) => userCall<BackupResult>(origin, "POST", "/api/v1/admin/backup/verify", name ? { name } : {});

export const readLoadShedding = (origin: string) => userCall<LoadShedding>(origin, "GET", "/api/v1/electrical/load-shedding");
export const saveLoadShedding = (origin: string, settings: LoadSheddingSettings) => userCall<LoadShedding>(origin, "PUT", "/api/v1/electrical/load-shedding", settings);

/** Answers a 404 `balance_off` while the option is off. */
export const readEnergyBalance = (origin: string) => userCall<EnergyBalance>(origin, "GET", "/api/v1/electrical/balance");
export const saveEnergyBalance = (origin: string, settings: EnergyBalanceSettings) => userCall<EnergyBalance>(origin, "PUT", "/api/v1/electrical/balance", settings);

/** The token of one node and, while the option commands.require_sig is on, the key it checks the signature of the critical commands with. An administrator only. */
export type NodeKeyAnswer = { node_id: string; token: string; strict: boolean; command_key?: string };
export const readNodeKey = (origin: string, nodeId: string) => userCall<NodeKeyAnswer>(origin, "GET", `/api/v1/admin/nodes/${encodeURIComponent(nodeId)}/token`);
