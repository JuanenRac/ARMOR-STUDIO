/**
 * The calls of the console to the server, by area. Everything is re-exported from here, so the rest of the console keeps importing "./api".
 */
export * from "./api/cameras";
export * from "./api/session";
export * from "./api/system";
export * from "./api/history";
export * from "./api/users";
export * from "./api/admin";
export * from "./api/maintenance";
export * from "./api/firmware";
export * from "./api/devices";
export * from "./api/alarms";
export * from "./api/designs";
export * from "./api/electrical";
export * from "./api/alarmNodes";
export * from "./api/nodeHealth";
export * from "./api/nodeControl";
export * from "./api/diagnostics";
export * from "./api/security";
export * from "./api/remoteAccess";
export * from "./api/network";
export * from "./api/solar";
export * from "./api/battery";
export { ApiError, setElevationAsker } from "./api/transport";
