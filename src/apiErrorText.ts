import { ApiError } from "./api/transport";

/**
 * The words for something the server refused, in the language of the person. Each screen keeps its refusals under a prefix ("in_err_", "nt_err_"...): the code the server gave
 * is looked up there, and a screen without a text for it says the shared words for that code (api_code_*) when the server has such a code, and then its generic one. A body that was too large for the server (413) is told as "too_large" when the screen has that text,
 * since the server stops it before it can say a code of its own.
 */
export function errorText(t: (key: string) => string, error: unknown, prefix: string): string {
  // A call that never got an answer (the network, a refused connection) fails with a TypeError: "unreachable" when the screen has the words for it.
  const code = error instanceof ApiError ? error.code : error instanceof TypeError ? "unreachable" : "generic";
  const said = (key: string): string | null => { const text = t(`${prefix}${key}`); return text === `${prefix}${key}` ? null : text; };
  // the words for the code itself first; "generic" says nothing, so the kind of answer (a body too large, too many requests, the server failing) comes before it
  if (code !== "generic") { const own = said(code); if (own) return own; }
  if (error instanceof ApiError) {
    const kind = error.status === 413 ? "too_large" : error.status === 429 ? "status_429" : error.status >= 500 ? "status_5xx" : `status_${error.status}`;
    const byKind = said(kind);
    if (byKind) return byKind;
  }
  // the words every screen shares for the codes of the server (apiCodesText.ts), before the generic phrase of the screen
  if (code !== "generic") { const shared = t(`api_code_${code}`); if (shared !== `api_code_${code}`) return shared; }
  return t(`${prefix}generic`);
}
