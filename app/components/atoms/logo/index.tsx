import Link from "next/link";

export default function Logo() {
  return (
    <Link href="/feed" className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-[3px] bg-rk-accent flex-shrink-0" />

      <span className="text-[17px] font-[500] text-rk-primary tracking-tight">
        tierstack.dev
      </span>
    </Link>
  );
}
