/** Shared deep-space backdrop (stars + horizon). Theme follows `.console` unless `tone="night"`. */
export function SpaceBackdrop({ tone = "auto" }: { tone?: "auto" | "night" }) {
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
