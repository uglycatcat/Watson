import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
/* Full CJK coverage via unicode-range subsets (local single-file was incomplete → system fallback) */
import "@fontsource/noto-sans-sc/chinese-simplified-400.css";
import "@fontsource/noto-sans-sc/chinese-simplified-500.css";
import "@fontsource/noto-sans-sc/chinese-simplified-700.css";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
