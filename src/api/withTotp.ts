import { ApiError } from "./transport";

/** The header the maintenance agent reads the one-time code from (the server hands it on unchanged). */
export const MAINT_TOTP_HEADER = "X-Armor-Maint-Totp";
type Headers = Record<string, string>;

/**
 * Makes a call that the maintenance agent may answer with `totp_required`: it is made once without a code (an installation with no authenticator never asks) and, when the agent asks, the
 * person is asked for the six digits and the call is made again with them. A code that is refused is asked for again, up to three times; null from `ask` (the person gave up) ends it
 * with the refusal the agent gave, and nothing is kept.
 */
export async function withTotp<T>(call: (headers?: Headers) => Promise<T>, ask: (wrong: boolean) => Promise<string | null>): Promise<T> {
  try { return await call(); }
  catch (error) {
    if (!(error instanceof ApiError) || error.code !== "totp_required") throw error;
    let last: ApiError = error;
    for (let attempt = 0; attempt < 3; attempt++) {
      const code = await ask(attempt > 0);
      if (code === null || !/^\d{6}$/.test(code)) throw last;
      try { return await call({ [MAINT_TOTP_HEADER]: code }); }
      catch (again) {
        if (!(again instanceof ApiError) || again.code !== "totp_invalid") throw again;
        last = again;
      }
    }
    throw last;
  }
}
