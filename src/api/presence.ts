import { userCall } from "./transport";
import type { PresenceSummary } from "./contract/armor-rest";

/** The people whose phone told the server a word of the last day and the sum the automations follow (an administrator; 404 while the option "presence by person" is off). */
export const getPresence = (origin: string) => userCall<PresenceSummary>(origin, "GET", "/api/v1/presence");
