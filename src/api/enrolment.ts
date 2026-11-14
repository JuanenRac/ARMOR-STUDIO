import { userCall } from "./transport";
import type { EnrolmentCode } from "./contract/armor-rest";

/** Asks the server of `origin` for a code of one use and five minutes for the QR of an installation (`installation` is the https address the phones use). Needs an administrator who proved themselves again. */
export const makeEnrolmentCode = (origin: string, installation: string) => userCall<EnrolmentCode>(origin, "POST", "/api/v1/admin/enrolment-code", { origin: installation });
