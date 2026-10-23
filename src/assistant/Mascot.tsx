/**
 * The mascot of the assistant and of the guided tours, drawn as a small vector figure. It lives in a file of its own because the tours draw it too, while the assistant (with everything it
 * knows how to answer) is fetched separately.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import "./assistant.css";

export function Mascot({ talking, speaking = false, scale = 1 }: { talking: boolean; /** Reading aloud: the mouth opens and closes like a person talking. */ speaking?: boolean; scale?: number }) {
  return <svg className={`mascot ${talking ? "talking" : ""} ${speaking ? "speaking" : ""}`} viewBox="0 0 64 72" width={Math.round(56 * scale)} height={Math.round(63 * scale)} aria-hidden="true" focusable="false">
    <line className="mascot-antenna" x1="32" y1="4" x2="32" y2="14" /><circle className="mascot-bulb" cx="32" cy="4" r="3" />
    <rect className="mascot-head" x="10" y="14" width="44" height="34" rx="12" />
    <rect className="mascot-visor" x="16" y="22" width="32" height="16" rx="8" />
    <circle className="mascot-eye" cx="25" cy="30" r="3.2" /><circle className="mascot-eye" cx="39" cy="30" r="3.2" />
    <path className="mascot-mouth" d="M26 43 Q32 47 38 43" />
    <g className="mascot-speak"><g className="mascot-speak-open"><ellipse cx="32" cy="44" rx="6" ry="4.2" /></g></g>
    <rect className="mascot-body" x="18" y="50" width="28" height="16" rx="7" />
    <circle className="mascot-core" cx="32" cy="58" r="3" />
  </svg>;
}
