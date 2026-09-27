/**
 * A row of tabs for a menu whose content does not fit one screen: the parts are shown one at a time instead of one below the other.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
export function ViewTabs<Key extends string>({ tabs, active, onChange, label }: { tabs: ReadonlyArray<readonly [Key, string]>; active: Key; onChange: (key: Key) => void; label?: string }) {
  return <div className="view-tabs" role="tablist" aria-label={label}>
    {tabs.map(([key, text]) => <button key={key} role="tab" aria-selected={active === key} className={active === key ? "active" : ""} onClick={() => onChange(key)}>{text}</button>)}
  </div>;
}
