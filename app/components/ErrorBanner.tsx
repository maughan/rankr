import { S } from "@/app/content/strings";

interface Props {
  message?: string;
  onRetry: () => void;
}

export default function ErrorBanner({
  message = S.errors.default,
  onRetry,
}: Props) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-rk-row border border-rk-stroke rounded-[8px] gap-4">
      <span className="text-[13px] text-rk-secondary">{message}</span>
      <button
        onClick={onRetry}
        className="text-[13px] font-[500] text-rk-accent hover:opacity-80 transition-opacity flex-shrink-0 cursor-pointer"
      >
        Retry
      </button>
    </div>
  );
}
