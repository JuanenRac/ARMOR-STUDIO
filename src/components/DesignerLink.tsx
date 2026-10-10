/**
 * The card that says what a menu's equipment has to do with a designer and opens it: the same card in the menus of the network, the radar and the cameras (the Electrical menu has its own, of the same look).
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import "./designer-link.css";

export function DesignerLink({ title, text, button, open }: { title: string; text: string; button: string; open: () => void }) {
  return <section className="designer-link">
    <div className="designer-link-text"><h3>{title}</h3><p className="muted small">{text}</p></div>
    <button type="button" onClick={open}>{button}</button>
  </section>;
}
