import { useEffect } from "react";

/** Shared deep-space backdrop (stars + horizon). Theme follows `.console` unless `tone="night"`. */
export function SpaceBackdrop({ tone = "auto" }: { tone?: "auto" | "night" }) {
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      // Pause CSS animations while the tab is hidden to save compositor work remotely.
      root.classList.toggle("space-backdrop-paused", document.visibilityState !== "visible");
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      root.classList.remove("space-backdrop-paused");
    };
  }, []);

  return (
    <div
      className={`space-backdrop${tone === "night" ? " space-backdrop--night" : ""}`}
      aria-hidden
    >
      <div className="space-backdrop__stars space-backdrop__stars--a" />
      <div className="space-backdrop__stars space-backdrop__stars--b" />
      <div className="space-backdrop__horizon" />
      <div className="space-backdrop__vignette" />
    </div>
  );
}
