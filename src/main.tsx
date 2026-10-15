import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { installHoverHints } from "./hoverHints";
import { applyPrefs, getPrefs } from "./prefs";
applyPrefs(getPrefs());
createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
installHoverHints();
