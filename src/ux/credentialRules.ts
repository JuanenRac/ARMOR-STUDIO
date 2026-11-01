/**
 * What can be said about a new password or a new PIN before it is sent: too short for the minimum the server announced, the same as the user name, not repeated the same, a PIN of
 * the wrong length, a duress PIN that equals the PIN. The server still decides; these are the reasons it would give, shown while the person types instead of after.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { UX } from "./config";

export type CredentialIssue = "pw_short" | "pw_is_name" | "pw_mismatch" | "pin_short" | "pin_long" | "pin_same";

/** The minimum length the server announced, never below the floor of Studio itself. */
export const effectiveMinimum = (announced: number | undefined): number =>
  Math.max(UX.credentials.passwordMinimumFloor, Number.isFinite(announced) && announced ? Math.round(announced) : UX.credentials.passwordMinimumFallback);

export function passwordIssues(password: string, options: { minimum?: number; username?: string; repeat?: string }): CredentialIssue[] {
  if (!password) return [];
  const issues: CredentialIssue[] = [];
  if (password.length < effectiveMinimum(options.minimum)) issues.push("pw_short");
  const name = options.username?.trim().toLowerCase();
  if (name && password.toLowerCase() === name) issues.push("pw_is_name");
  if (options.repeat !== undefined && options.repeat !== password) issues.push("pw_mismatch");
  return issues;
}

export function pinIssues(pin: string, duress = ""): CredentialIssue[] {
  const issues: CredentialIssue[] = [];
  if (pin && pin.length < UX.credentials.pinMinDigits) issues.push("pin_short");
  if (pin.length > UX.credentials.pinMaxDigits) issues.push("pin_long");
  if (pin && duress && pin === duress) issues.push("pin_same");
  return issues;
}

export const issueKey = (issue: CredentialIssue): string => `ux_${issue}`;

/** The sentence for an issue in the language of `t` ({0} is the minimum or the limit that applies). */
export function issueMessage(t: (key: string) => string, issue: CredentialIssue, announcedMinimum?: number): string {
  const limit = issue === "pin_short" ? UX.credentials.pinMinDigits : issue === "pin_long" ? UX.credentials.pinMaxDigits : effectiveMinimum(announcedMinimum);
  return t(issueKey(issue)).replace("{0}", String(limit));
}
