"use client";
import { CATEGORIES } from "@/lib/categories";
import { CategoryIcon } from "@/app/components/item/CategoryIcon";

interface Props {
  value: string;
  onChange: (slug: string) => void;
}

export function CategoryPicker({ value, onChange }: Props) {
  return (
    <div>
      <p className="text-[11px] font-[500] text-rk-tertiary uppercase tracking-widest mb-2">
        Category
      </p>
      <div className="grid grid-cols-5 gap-1.5">
        {CATEGORIES.map((cat) => {
          const selected = value === cat.slug;
          return (
            <button
              key={cat.slug}
              type="button"
              onClick={() => onChange(cat.slug)}
              style={
                selected
                  ? {
                      backgroundColor: `${cat.color}20`,
                      borderColor: cat.color,
                      color: cat.color,
                    }
                  : {}
              }
              className={`flex flex-col items-center justify-center gap-1 py-2 rounded-[8px] border transition-colors cursor-pointer ${
                selected
                  ? ""
                  : "border-rk-stroke bg-rk-row text-rk-muted hover:border-rk-muted hover:text-rk-secondary"
              }`}
            >
              <CategoryIcon slug={cat.slug} size={18} />
              <span className="text-[9px] font-[500] leading-tight text-center">
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
