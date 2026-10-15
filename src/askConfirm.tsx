/**
 * A question asked in the page, as a promise: `if (!(await askConfirm(text, t))) return;` replaces the browser's own confirm(), which a browser can switch off ("stop this page from
 * creating dialogs") and then every button that asked simply did nothing. The dialog is drawn by <ConfirmHost/>, mounted once in the app.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useState } from "react";
import { ConfirmDialog } from "./components/chrome";

type Translate = (key: string) => string;
type Request = { text: string; t: Translate; resolve: (answer: boolean) => void };

let show: ((request: Request | null) => void) | null = null;

export function askConfirm(text: string, t: Translate): Promise<boolean> {
  return new Promise<boolean>(resolve => {
    if (show === null) { resolve(typeof window.confirm === "function" ? window.confirm(text) : false); return; }   // no host mounted (a test, a page in the middle of loading)
    show({ text, t, resolve });
  });
}

export function ConfirmHost() {
  const [request, setRequest] = useState<Request | null>(null);
  useEffect(() => {
    show = setRequest;
    return () => { show = null; };
  }, []);
  if (request === null) return null;
  const answer = (value: boolean) => { request.resolve(value); setRequest(null); };
  return <ConfirmDialog t={request.t} danger title={request.t("askConfirmTitle")} text={request.text} confirmLabel={request.t("askConfirmYes")} confirm={() => answer(true)} cancel={() => answer(false)} />;
}
