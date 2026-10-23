import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { installHoverHints } from "./hoverHints";
import { applyPrefs, getPrefs } from "./prefs";
import { ensureLocale } from "./i18n";
import { loginLanguage } from "./StudioLogin";
applyPrefs(getPrefs());
// The language the person last used is fetched before the first screen is drawn, so the console does not show English for a moment; if the fetch fails the screens draw anyway.
void ensureLocale(loginLanguage()).catch(() => undefined).then(() => {
  createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
  installHoverHints();
});
