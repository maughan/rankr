export default function UpdatingToast() {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 bg-rk-surface rounded-[8px]"
      style={{ border: "0.5px solid #1E2C44" }}
    >
      <div className="w-[14px] h-[14px] rounded-full border-[1.5px] border-rk-stroke border-t-rk-accent animate-spin flex-shrink-0" />
      <span className="text-[12px] text-rk-secondary whitespace-nowrap">
        Updating…
      </span>
    </div>
  );
}
