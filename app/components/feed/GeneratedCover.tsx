// Flat generated cover for lists with no image. Renders a band of equal-flex
// colored blocks with the title overlaid behind a subtle dark scrim.

export default function GeneratedCover({
  colors,
  title,
}: {
  colors: string[];
  title: string;
}) {
  const blocks = colors.slice(0, 5);

  return (
    <div className="relative h-[84px] w-full overflow-hidden flex">
      {blocks.map((color, i) => (
        <span
          key={i}
          className="flex-1"
          style={{ backgroundColor: color }}
        />
      ))}

      {/* Dark scrim + title for readability */}
      <div className="absolute inset-0 flex items-center px-3 bg-black/35">
        <p
          className="text-[13px] font-[600] text-white leading-tight line-clamp-2"
          style={{ textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}
        >
          {title}
        </p>
      </div>
    </div>
  );
}
