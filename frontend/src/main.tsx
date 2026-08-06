import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
/* Body weight only on boot — 500/700 synthesize or load later via CSS if needed.
   Full CJK 400/500/700 triples remote first-paint transfer (~3MB). */
import "@fontsource/noto-sans-sc/chinese-simplified-400.css";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
