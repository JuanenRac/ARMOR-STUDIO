/**
 * A password field with an eye button to see what was typed or to hide it again (asterisks).
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 *
 * It takes the attributes of an input (except the type) plus the translator for the label of the button. `secret={false}` is a plain text field without the button: a field
 * whose content is a secret only for some settings (the properties of a node of the network designer) uses one component for both.
 */
import { useState, type InputHTMLAttributes } from "react";
import type { Translate } from "./camera";
import "./password-field.css";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { t: Translate; secret?: boolean };

export function PasswordInput({ t, secret = true, ...input }: Props) {
  const [shown, setShown] = useState(false);
  if (!secret) return <input {...input} type="text" />;
  const label = shown ? t("pw_hide") : t("pw_show");
  return <span className="password-field">
    <input {...input} type={shown ? "text" : "password"} />
    <button type="button" className="password-eye" aria-label={label} title={label} aria-pressed={shown} onClick={() => setShown(value => !value)}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
        <circle cx="12" cy="12" r="3" />
        {shown && <path d="M3 3l18 18" />}
      </svg>
    </button>
  </span>;
}
