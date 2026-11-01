/**
 * Why a sign-in did not open, told apart so the person is told what to do: the user or the password is wrong (401/403), too many attempts (429), the server failed (5xx), the server could
 * not be reached or did not answer in time. Nothing here depends on which of the user or the password was wrong: the server does not say, and neither does the screen.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
export type SignInFailure = "refused" | "rate_limited" | "server" | "unreachable";

export function classifySignInFailure(error: unknown): SignInFailure {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const status = message.match(/returned (\d{3})/);
  if (status) {
    const code = Number(status[1]);
    if (code === 429) return "rate_limited";
    if (code >= 500) return "server";
    return "refused";
  }
  return "unreachable";
}

export const signInFailureKey = (failure: SignInFailure): string => `ux_login_${failure}`;
