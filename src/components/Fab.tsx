type FabProps = {
  onClick: () => void;
};

export function Fab({ onClick }: FabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-8 right-8 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-watson-accent text-3xl font-light leading-none text-white shadow-xl shadow-blue-500/35 transition hover:scale-105 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-watson-bg"
      aria-label="添加日程"
    >
      +
    </button>
  );
}
