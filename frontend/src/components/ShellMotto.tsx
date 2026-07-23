/** 导航栏下方左侧座右铭 */
const MOTTO = "在坚冰还盖着北海的时候，我看到了怒放的梅花。";

export function ShellMotto() {
  return (
    <div className="shell-motto" role="note" aria-label="座右铭">
      <p className="shell-motto__text">{MOTTO}</p>
    </div>
  );
}
