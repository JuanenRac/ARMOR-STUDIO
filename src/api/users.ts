import { userCall } from "./transport";
// ---- Studio users -------------------------------------------------------------------------------------------------------------

export type Role = "admin" | "operator" | "panel" | "viewer";
export type StudioUser = { id: string; username: string; role: Role };
export type ListedUser = StudioUser & { createdAt: string; updatedAt: string; current: boolean; hasPin: boolean; hasDuress: boolean };
export const listUsers = (origin: string) => userCall<{ users: ListedUser[]; minPasswordLength: number }>(origin, "GET", "/api/v1/users");
export const createUser = (origin: string, user: { username: string; password: string; role: Role }) => userCall<StudioUser>(origin, "POST", "/api/v1/users", user);
export const updateUser = (origin: string, id: string, change: { username?: string; password?: string; role?: Role }) => userCall<StudioUser>(origin, "PATCH", `/api/v1/users/${encodeURIComponent(id)}`, change);
export const deleteUser = (origin: string, id: string) => userCall<void>(origin, "DELETE", `/api/v1/users/${encodeURIComponent(id)}`);
export const changeAccount = (origin: string, change: { currentPassword: string; username?: string; newPassword?: string }) => userCall<StudioUser>(origin, "PATCH", "/api/v1/account", change);
/** The PIN that disarms the system: yours (after confirming the password), or anybody's for an administrator. The duress PIN disarms as well, and warns in silence. */
export const setMyPin = (origin: string, change: { currentPassword: string; pin?: string; duress_pin?: string; clear?: boolean }) => userCall<StudioUser>(origin, "PUT", "/api/v1/account/pin", change);
export const setUserPin = (origin: string, id: string, pin: string, duress_pin?: string) => userCall<ListedUser>(origin, "PUT", `/api/v1/users/${encodeURIComponent(id)}/pin`, { pin, ...(duress_pin ? { duress_pin } : {}) });
export const clearUserPin = (origin: string, id: string) => userCall<ListedUser>(origin, "DELETE", `/api/v1/users/${encodeURIComponent(id)}/pin`);
