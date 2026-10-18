import { ApiError } from "./api/transport";

/**
 * The words for something the server refused, in the language of the person. Each screen keeps its refusals under a prefix ("in_err_", "nt_err_"...): the code the server gave
 * is looked up there, and a screen without a text for it says its generic one. A body that was too large for the server (413) is told as "too_large" when the screen has that text,
 * since the server stops it before it can say a code of its own.
 */
export function errorText(t: (key: string) => string, error: unknown, prefix: string): string {
  const code = error instanceof ApiError ? error.code : "generic";
  let text = t(`${prefix}${code}`);
  if (text === `${prefix}${code}` && error instanceof ApiError && error.status === 413) text = t(`${prefix}too_large`);
  if (text === `${prefix}${code}` || text === `${prefix}too_large`) return t(`${prefix}generic`);
  return text;
}
