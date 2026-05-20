import { nameToColor } from "@/lib/itemColor";

export default function UserAvatar({
  username,
  size = 32,
}: {
  username: string;
  size?: number;
}) {
  const color = nameToColor(username);
  const initial = username[0]?.toUpperCase() ?? "?";
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-[600] flex-shrink-0 select-none"
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
}
