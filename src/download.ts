/**
 * Saves text as a file through the browser; nothing is uploaded anywhere. The address of the file is released a little later, not in the same breath as the click: some browsers (an old
 * Firefox, Safari) start the download after the click returns and found the file already gone.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
export function downloadText(filename: string, text: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const link = document.createElement("a");
  link.href = url; link.download = filename; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
